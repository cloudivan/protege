import dbConnect from "@/lib/dbConnect";
import Workflow from "@/backend/models/workflow";
import getScenario from "@/config/scenarios";

// In-memory fallback for local dev when MongoDB_URI is not yet configured
let inMemoryWorkflows = [
  {
    _id: "demo",
    title: "Process supplier invoices",
    scenario: "invoices",
    expertName: "Sabine",
    status: "mapped",
    createdAt: new Date().toISOString(),
  },
];

export default async function handler(req, res) {
  if (!process.env.MONGODB_URI) {
    if (req.method === "GET") {
      return res.status(200).json({ workflows: inMemoryWorkflows });
    }
    if (req.method === "POST") {
      const { title, scenario, expertName } = req.body || {};
      if (!title || !getScenario(scenario)) {
        return res.status(400).json({ error: "title and a known scenario are required" });
      }
      const newWorkflow = {
        _id: `wf-${Date.now()}`,
        title,
        scenario,
        expertName,
        status: "draft",
        createdAt: new Date().toISOString(),
      };
      inMemoryWorkflows.unshift(newWorkflow);
      return res.status(201).json({ workflow: newWorkflow });
    }
  }

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
