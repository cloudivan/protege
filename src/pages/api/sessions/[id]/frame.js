import dbConnect from "@/lib/dbConnect";
import Session from "@/backend/models/session";
import Frame from "@/backend/models/frame";
import { describeFrame } from "@/backend/services/screenEvents";

export const config = { api: { bodyParser: { sizeLimit: "4mb" } } };

// POST { frameBase64, at } -> { activity, events }
// Called by ScreenShare every NEXT_PUBLIC_FRAME_INTERVAL_MS. Frames are only
// stored (in Mongo, see models/frame.js) when they produced an event (that is the replayable moment).
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    await dbConnect();
    const { frameBase64, at } = req.body || {};
    const session = await Session.findById(req.query.id);
    if (!session) return res.status(404).json({ error: "Session not found" });

    // Off the record: drop the frame unseen.
    const open = session.offRecordSpans.find((s) => s.to == null);
    if (open) return res.status(200).json({ activity: "idle", events: [], offRecord: true });

    const result = await describeFrame({ frameBase64, recentEvents: session.events });
    if (!result.changed || !result.events?.length) {
      return res.status(200).json({ activity: result.activity, events: [] });
    }

    const frame = await Frame.create({
      sessionId: session._id,
      at,
      data: Buffer.from(frameBase64.replace(/^data:[^;]+;base64,/, ""), "base64"),
    });
    const frameKey = `api/frames/${frame._id}`;

    const events = result.events.map((e) => ({ ...e, at, frameKey }));
    session.events.push(...events);
    await session.save();
    return res.status(200).json({ activity: result.activity, events });
  } catch (error) {
    console.error("sessions/[id]/frame error:", error);
    return res.status(500).json({ error: error.message });
  }
}
