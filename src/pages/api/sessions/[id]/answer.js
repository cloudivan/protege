import dbConnect from "@/lib/dbConnect";
import Session from "@/backend/models/session";
import Workflow from "@/backend/models/workflow";
import WorkMap from "@/backend/models/workMap";
import { gradeAnswer, revealStep } from "@/backend/services/lessonGrader";

// POST { step, answer, at }          -> grade the learner's decision
// POST { step, reveal: true, at }    -> show the expert's decision instead
// Returns { step, verdict, missing, explanation, expected, expert, caught,
//           next, done, progress, mastery }. Teach sessions only.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    await dbConnect();
    const session = await Session.findById(req.query.id);
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.kind !== "teach" || !session.lesson) return res.status(400).json({ error: "Start the lesson first" });
    const workflow = await Workflow.findById(session.workflowId);
    const workMap = await WorkMap.findById(workflow.workMapId).lean();
    const { step, answer, reveal, at = 0 } = req.body || {};
    const result = reveal
      ? revealStep({ session, workMap, stepIndex: Number(step), at })
      : await gradeAnswer({ session, workMap, stepIndex: Number(step), answer, at });
    await session.save();
    return res.status(200).json(result);
  } catch (error) {
    console.error("sessions/[id]/answer error:", error);
    return res.status(error.status || 500).json({ error: error.message });
  }
}
