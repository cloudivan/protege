import dbConnect from "@/lib/dbConnect";
import Workflow from "@/backend/models/workflow";
import Session from "@/backend/models/session";
import WorkMap from "@/backend/models/workMap";
import { DEMO_ID, ensureDemoWorkflow, generateDemoWorkflow } from "@/backend/services/demoWorkflow";

export const config = { maxDuration: 60 };

// GET    -> { workflow, sessions, workMap }   ("demo" -> 404 { needsTopic } until generated)
// PATCH  { title?, expertName?, status? }
// POST   /api/workflows/demo { topic }       generates the demo from a clinical topic
export default async function handler(req, res) {
  let { id } = req.query;
  try {
    await dbConnect();
    if (id === DEMO_ID && req.method === "POST") {
      const workflow = await generateDemoWorkflow(req.body?.topic, req.body?.expertName);
      return res.status(201).json({ workflow });
    }
    if (id === DEMO_ID) id = (await ensureDemoWorkflow())._id;
    if (req.method === "GET") {
      const workflow = await Workflow.findById(id).lean();
      if (!workflow) return res.status(404).json({ error: "Workflow not found" });
      const sessions = await Session.find({ workflowId: id })
        .select("kind status participantName startedAt endedAt teachBackConfirmed")
        .sort({ createdAt: 1 })
        .lean();
      const workMap = workflow.workMapId ? await WorkMap.findById(workflow.workMapId).lean() : null;
      return res.status(200).json({ workflow, sessions, workMap });
    }
    if (req.method === "PATCH") {
      const allowed = ["title", "expertName", "status"];
      const update = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)));
      const workflow = await Workflow.findByIdAndUpdate(id, update, { new: true });
      return res.status(200).json({ workflow });
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    if (!error.status) console.error("workflows/[id] error:", error);
    return res.status(error.status || 500).json({ error: error.message, ...(error.needsTopic && { needsTopic: true }) });
  }
}
