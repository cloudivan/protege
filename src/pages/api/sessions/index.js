import dbConnect from "@/lib/dbConnect";
import Session from "@/backend/models/session";
import Workflow from "@/backend/models/workflow";

const STATUS_FOR_KIND = { capture: "capturing", debrief: "debriefing", teach: "teaching" };

// POST { workflowId, kind, participantName }
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { workflowId, kind, participantName } = req.body || {};

  // Instant demo fallback when workflowId is "demo" or database connection is unset
  if (workflowId === "demo" || !process.env.MONGODB_URI) {
    return res.status(201).json({
      session: {
        _id: "demo-session",
        workflowId: "demo",
        kind: kind || "teach",
        participantName: participantName || "Lena (new hire)",
        status: "pending",
        transcript: [],
        events: [],
        questions: [],
        interventions: [],
        createdAt: new Date().toISOString(),
      },
    });
  }

  try {
    await dbConnect();
    const workflow = await Workflow.findById(workflowId);
    if (!workflow) return res.status(404).json({ error: "Workflow not found" });
    if (!STATUS_FOR_KIND[kind]) return res.status(400).json({ error: "kind must be capture, debrief or teach" });
    if (kind === "teach" && !workflow.workMapId) {
      return res.status(409).json({ error: "Build the Work Map before teaching" });
    }
    const session = await Session.create({ workflowId, kind, participantName });
    workflow.status = STATUS_FOR_KIND[kind];
    await workflow.save();
    return res.status(201).json({ session });
  } catch (error) {
    console.error("sessions error:", error);
    return res.status(500).json({ error: error.message });
  }
}
