import dbConnect from "@/lib/dbConnect";
import { simulateWorkflow } from "@/backend/services/demoWorkflow";

export const config = { maxDuration: 60 };

// POST { topic, expertName? } -> { workflow }
// A sample workflow: a simulated senior doctor works the topic and the
// session runs through the real Work Map pipeline (about a minute). Marked
// simulated, so the UI labels it as a sample.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    await dbConnect();
    const workflow = await simulateWorkflow({ topic: req.body?.topic, expertName: req.body?.expertName });
    return res.status(201).json({ workflow });
  } catch (error) {
    if (!error.status) console.error("workflows/simulate error:", error);
    return res.status(error.status || 500).json({ error: error.message });
  }
}
