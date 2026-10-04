import dbConnect from "@/lib/dbConnect";
import Workflow from "@/backend/models/workflow";
import Session from "@/backend/models/session";
import WorkMap from "@/backend/models/workMap";
import { buildProtocol } from "@/backend/services/protocol";
import { DEMO_ID, ensureDemoWorkflow } from "@/backend/services/demoWorkflow";

// GET            -> { protocol, markdown }
// GET ?format=md -> the protocol as a Markdown file download
// Always built from the current data, so it reflects the latest Work Map.
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    await dbConnect();
    let { id } = req.query;
    if (id === DEMO_ID) id = (await ensureDemoWorkflow())._id;
    const workflow = await Workflow.findById(id).lean();
    if (!workflow) return res.status(404).json({ error: "Workflow not found" });
    const sessions = await Session.find({ workflowId: workflow._id, kind: { $in: ["capture", "debrief"] } })
      .sort({ createdAt: 1 })
      .lean();
    const workMap = workflow.workMapId ? await WorkMap.findById(workflow.workMapId).lean() : null;

    const { data, markdown } = buildProtocol({ workflow, sessions, workMap });
    if (req.query.format === "md") {
      const name = workflow.title.replace(/[^\w-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="protocol-${name}.md"`);
      return res.status(200).send(markdown);
    }
    return res.status(200).json({ protocol: data, markdown });
  } catch (error) {
    if (!error.status) console.error("workflows/[id]/protocol error:", error);
    return res.status(error.status || 500).json({ error: error.message, ...(error.needsTopic && { needsTopic: true }) });
  }
}
