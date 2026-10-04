import dbConnect from "@/lib/dbConnect";
import Session from "@/backend/models/session";
import Workflow from "@/backend/models/workflow";
import WorkMap from "@/backend/models/workMap";
import { generateLesson, publicLesson } from "@/backend/services/lessonGenerator";
import { newProgress } from "@/backend/services/lessonGrader";

export const config = { maxDuration: 60 };

// POST -> { lesson, progress, mastery }
// Teach sessions: returns the session's practice case, generating it from the
// workflow's Work Map on the first call. The expected answers stay server-side.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    await dbConnect();
    const session = await Session.findById(req.query.id);
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.kind !== "teach") return res.status(400).json({ error: "Only teach sessions have a lesson" });
    if (!session.lesson) {
      const workflow = await Workflow.findById(session.workflowId);
      const workMap = workflow?.workMapId ? await WorkMap.findById(workflow.workMapId).lean() : null;
      if (!workMap?.steps?.length) return res.status(409).json({ error: "This workflow has no Work Map yet" });
      session.lesson = await generateLesson({ workflow, workMap });
      session.progress = newProgress(session.lesson);
      session.status = "live";
      session.startedAt = new Date();
      session.markModified("lesson");
      session.markModified("progress");
      await session.save();
    }
    return res.status(200).json({ lesson: publicLesson(session.lesson), progress: session.progress, mastery: session.mastery || null });
  } catch (error) {
    console.error("sessions/[id]/lesson error:", error);
    return res.status(500).json({ error: error.message });
  }
}
