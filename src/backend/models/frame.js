import mongoose from "mongoose";

// A stored screen frame: the replayable "screen moment" behind a screen
// event. Kept in Mongo instead of public/ so the app runs on hosts without a
// writable filesystem (Vercel). Served by GET /api/frames/[id]; a screen
// event's frameKey is that path without the leading slash.
const frameSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true, index: true },
    at: { type: Number, required: true },
    contentType: { type: String, default: "image/jpeg" },
    data: { type: Buffer, required: true },
  },
  { timestamps: true },
);

export default mongoose.models.Frame || mongoose.model("Frame", frameSchema);
