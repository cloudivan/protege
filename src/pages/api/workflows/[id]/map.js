import dbConnect from "@/lib/dbConnect";
import Workflow from "@/backend/models/workflow";
import Session from "@/backend/models/session";
import WorkMap from "@/backend/models/workMap";
import { buildWorkMap } from "@/backend/services/workMapBuilder";

// POST: (re)build the Work Map from all capture + debrief sessions.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    await dbConnect();
    const workflow = await Workflow.findById(req.query.id);
    if (!workflow) return res.status(404).json({ error: "Workflow not found" });
    const sessions = await Session.find({ workflowId: workflow._id, kind: { $in: ["capture", "debrief"] } });
    if (!sessions.length) return res.status(409).json({ error: "No capture session yet" });

    const built = await buildWorkMap({ workflow, sessions });
    const prev = workflow.workMapId ? await WorkMap.findById(workflow.workMapId) : null;
    const workMap = await WorkMap.create({
      workflowId: workflow._id,
      version: (prev?.version || 0) + 1,
      steps: built.steps || [],
      openQuestions: (built.openQuestions || []).map((q) => ({ ...q, resolved: false })),
    });
    workflow.workMapId = workMap._id;
    workflow.status = "debriefing";
    await workflow.save();
    return res.status(200).json({ workMap });
  } catch (error) {
    console.error("workflows/[id]/map error:", error);
    return res.status(500).json({ error: error.message });
  }
}
