import dbConnect from "@/lib/dbConnect";
import { resolveQuestion, debriefStatus } from "@/backend/services/debrief";

// POST { index, answer, at } -> { resolved, openLeft }
// Interviewer client tool resolve_question (debrief sessions only).
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    await dbConnect();
    const { index, answer, at } = req.body || {};
    return res.status(200).json(await resolveQuestion({ sessionId: req.query.id, index: Number(index), answer, at }));
  } catch (error) {
    console.error("sessions/[id]/resolve-question error:", error);
    return res.status(debriefStatus(error)).json({ error: error.message });
  }
}
