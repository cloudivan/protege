import dbConnect from "@/lib/dbConnect";
import Session from "@/backend/models/session";

// POST { at, stepIndex, guardrail, learnerAction, outcome }
// Tutor client tool log_intervention lands here (Module 3 evidence).
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    await dbConnect();
    const session = await Session.findById(req.query.id);
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.kind !== "teach") return res.status(400).json({ error: "Only teach sessions log interventions" });
    const { at, stepIndex, guardrail, learnerAction, outcome } = req.body || {};
    session.interventions.push({ at, stepIndex, guardrail, learnerAction, outcome });
    await session.save();
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("sessions/[id]/intervention error:", error);
    return res.status(500).json({ error: error.message });
  }
}
