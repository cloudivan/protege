import dbConnect from "@/lib/dbConnect";
import { confirmTeachBack, debriefStatus } from "@/backend/services/debrief";

// POST { summary, corrections: [], at } -> { confirmed, openLeft }
// Interviewer client tool confirm_teach_back (debrief sessions only). After
// this, POST /api/workflows/[id]/map { finalize: true } builds the final map.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    await dbConnect();
    const { summary, corrections, at } = req.body || {};
    return res.status(200).json(await confirmTeachBack({ sessionId: req.query.id, summary, corrections, at }));
  } catch (error) {
    console.error("sessions/[id]/teach-back error:", error);
    return res.status(debriefStatus(error)).json({ error: error.message });
  }
}
