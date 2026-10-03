import dbConnect from "@/lib/dbConnect";
import Session from "@/backend/models/session";

// POST { on: boolean, at } toggles an off-the-record span.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    await dbConnect();
    const { on, at } = req.body || {};
    const session = await Session.findById(req.query.id);
    if (!session) return res.status(404).json({ error: "Session not found" });
    const open = session.offRecordSpans.find((s) => s.to == null);
    if (on && !open) session.offRecordSpans.push({ from: at });
    if (!on && open) open.to = at;
    await session.save();
    return res.status(200).json({ offRecord: Boolean(on) });
  } catch (error) {
    console.error("sessions/[id]/off-record error:", error);
    return res.status(500).json({ error: error.message });
  }
}
