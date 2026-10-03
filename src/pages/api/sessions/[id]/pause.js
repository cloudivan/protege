import dbConnect from "@/lib/dbConnect";
import Session from "@/backend/models/session";
import Workflow from "@/backend/models/workflow";
import getScenario from "@/config/scenarios";
import { planQuestion, captureStats } from "@/backend/services/questionPlanner";

// POST { at } -> { ask, question?, kind?, reason?, stats }
// The capture page calls this at every natural pause. If ask is true it sends
// the agent "PAUSE. ASK: <question>"; otherwise the agent stays silent and
// `reason` says why (for the UI). Capture sessions only.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    await dbConnect();
    const at = Number(req.body?.at) || 0;
    const session = await Session.findById(req.query.id);
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.kind !== "capture") return res.status(400).json({ error: "Only capture sessions plan questions" });
    const workflow = await Workflow.findById(session.workflowId);

    const plan = await planQuestion({ session, workflow, scenario: getScenario(workflow?.scenario), at });
    if (plan.ask) {
      session.questions.push({ at, text: plan.question, kind: plan.kind, aboutEventAt: plan.aboutEventAt, planned: true, rationale: plan.rationale });
      await session.save();
    }
    return res.status(200).json({ ...plan, stats: captureStats(session) });
  } catch (error) {
    console.error("sessions/[id]/pause error:", error);
    return res.status(500).json({ error: error.message });
  }
}
