import dbConnect from "@/lib/dbConnect";
import Session from "@/backend/models/session";

// POST { events: [{ at, type, summary, data? }] } -> { stored }
// Exact actions reported by an integration (instead of read from screen
// frames), stored next to the vision events. Dropped while off the record.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    await dbConnect();
    const session = await Session.findById(req.query.id);
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.offRecordSpans.some((s) => s.to == null)) return res.status(200).json({ stored: 0, offRecord: true });
    const events = (req.body?.events || [])
      .filter((e) => e && Number.isFinite(e.at) && e.type && e.summary)
      .map(({ at, type, summary, data }) => ({ at, type, summary: String(summary).slice(0, 300), data }));
    session.events.push(...events);
    await session.save();
    return res.status(200).json({ stored: events.length });
  } catch (error) {
    console.error("sessions/[id]/events error:", error);
    return res.status(500).json({ error: error.message });
  }
}
