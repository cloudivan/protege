import dbConnect from "@/lib/dbConnect";
import Session from "@/backend/models/session";

export default async function handler(req, res) {
  try {
    await dbConnect();
    const { id } = req.query;
    if (req.method === "GET") {
      const session = await Session.findById(id).lean();
      if (!session) return res.status(404).json({ error: "Session not found" });
      return res.status(200).json({ session });
    }
    if (req.method === "PATCH") {
      const allowed = ["status", "elevenConversationId", "teachBackConfirmed", "mastery"];
      const update = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)));
      if (update.status === "live") update.startedAt = new Date();
      if (update.status === "done") update.endedAt = new Date();
      const session = await Session.findByIdAndUpdate(id, update, { new: true });
      return res.status(200).json({ session });
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("sessions/[id] error:", error);
    return res.status(500).json({ error: error.message });
  }
}
