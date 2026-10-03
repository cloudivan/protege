import dbConnect from "@/lib/dbConnect";
import Frame from "@/backend/models/frame";

// GET -> the stored screen frame image. Frames never change, so browsers may
// cache them for good.
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    await dbConnect();
    const frame = await Frame.findById(req.query.id).lean();
    if (!frame) return res.status(404).json({ error: "Frame not found" });
    res.setHeader("Content-Type", frame.contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.status(200).send(Buffer.from(frame.data.buffer || frame.data));
  } catch (error) {
    console.error("frames/[id] error:", error);
    return res.status(500).json({ error: error.message });
  }
}
