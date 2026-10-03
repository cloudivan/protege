import dbConnect from "@/lib/dbConnect";
import Workflow from "@/backend/models/workflow";
import Session from "@/backend/models/session";
import WorkMap from "@/backend/models/workMap";
import { DEMO_ID, DEMO_WORKFLOW, DEMO_WORK_MAP, ensureDemoWorkflow } from "@/backend/services/demoWorkflow";

export default async function handler(req, res) {
  let { id } = req.query;

  // No database: static demo so the page is still browsable.
  if (!process.env.MONGODB_URI) {
    if (req.method === "GET") {
      return res.status(200).json({
        workflow: DEMO_WORKFLOW,
        sessions: [],
        workMap: DEMO_WORK_MAP,
      });
    }
  }

  try {
    await dbConnect();
    // "demo" is the real demo workflow in Mongo (created on first use).
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
    console.error("workflows/[id] error:", error);
    return res.status(500).json({ error: error.message });
  }
}
