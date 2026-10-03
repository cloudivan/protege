import dbConnect from "@/lib/dbConnect";
import Workflow from "@/backend/models/workflow";
import getScenario from "@/config/scenarios";

export default async function handler(req, res) {
  try {
    await dbConnect();
    if (req.method === "GET") {
      const workflows = await Workflow.find().sort({ createdAt: -1 }).lean();
      return res.status(200).json({ workflows });
    }
    if (req.method === "POST") {
      const { title, scenario, expertName } = req.body || {};
      if (!title || !getScenario(scenario)) {
        return res.status(400).json({ error: "title and a known scenario are required" });
      }
      const workflow = await Workflow.create({ title, scenario, expertName });
      return res.status(201).json({ workflow });
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("workflows error:", error);
    return res.status(500).json({ error: error.message });
  }
}
