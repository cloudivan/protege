import dbConnect from "@/lib/dbConnect";
import Workflow from "@/backend/models/workflow";
import Session from "@/backend/models/session";
import WorkMap from "@/backend/models/workMap";
import { buildWorkMap } from "@/backend/services/workMapBuilder";
import { DEMO_ID, ensureDemoWorkflow } from "@/backend/services/demoWorkflow";

export const config = { maxDuration: 60 };

// POST { finalize?: boolean } -> { workMap }
// Builds a new Work Map version from every capture + debrief session.
//   - after capture: the draft map plus the open questions for the debrief
//   - after the debrief: answers become quoted reasons and guardrails
//   - finalize: true (only after a confirmed teach-back) marks the map
//     confirmed and the workflow "mapped", ready for the tutor.
// Debrief answers and the teach-back carry over from the previous version.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    await dbConnect();
    let { id } = req.query;
    if (id === DEMO_ID) id = (await ensureDemoWorkflow())._id;
    const workflow = await Workflow.findById(id);
    if (!workflow) return res.status(404).json({ error: "Workflow not found" });
    const sessions = await Session.find({ workflowId: workflow._id, kind: { $in: ["capture", "debrief"] } })
      .sort({ createdAt: 1 })
      .lean(); // plain objects: the builder spreads transcript turns
    if (!sessions.some((s) => s.kind === "capture" && s.transcript.length + s.events.length > 0)) {
      return res.status(409).json({ error: "Record a capture session first" });
    }

    const previous = workflow.workMapId ? await WorkMap.findById(workflow.workMapId).lean() : null;
    const finalize = Boolean(req.body?.finalize);
    if (finalize && !previous?.teachBack?.confirmed) {
      return res.status(409).json({ error: "The expert has not confirmed the teach-back yet" });
    }

    const built = await buildWorkMap({ workflow, sessions, previous });
    const workMap = await WorkMap.create({
      workflowId: workflow._id,
      version: (previous?.version || 0) + 1,
      steps: built.steps,
      openQuestions: built.openQuestions,
      teachBack: previous?.teachBack,
      verification: built.verification,
      ...(finalize && { confirmedAt: new Date() }),
    });
    workflow.workMapId = workMap._id;
    workflow.status = finalize ? "mapped" : "debriefing";
    await workflow.save();
    return res.status(200).json({ workMap });
  } catch (error) {
    if (!error.status) console.error("workflows/[id]/map error:", error);
    return res.status(error.status || 500).json({ error: error.message, ...(error.needsTopic && { needsTopic: true }) });
  }
}
