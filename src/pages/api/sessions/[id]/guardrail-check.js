import dbConnect from "@/lib/dbConnect";
import Session from "@/backend/models/session";
import Workflow from "@/backend/models/workflow";
import WorkMap from "@/backend/models/workMap";
import { checkAction } from "@/backend/services/guardrailCheck";

// POST { at, action: { type, summary, invoice? }, storeEvent? } -> verdict
// Called by the sandbox ERP before it commits a save in a teach session. The
// action is stored as a screen event either way; a violation is logged as a
// "caught" intervention server-side, so the evidence exists even if the voice
// agent never calls log_intervention.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    await dbConnect();
    const { at = 0, action, storeEvent = true } = req.body || {};
    if (!action?.type) return res.status(400).json({ error: "action.type is required" });
    const session = await Session.findById(req.query.id);
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.kind !== "teach") return res.status(400).json({ error: "Only teach sessions are checked" });

    const workflow = await Workflow.findById(session.workflowId);
    const workMap = workflow?.workMapId ? await WorkMap.findById(workflow.workMapId).lean() : null;
    if (!workMap) return res.status(409).json({ error: "No Work Map for this workflow" });

    const verdict = await checkAction({ workMap, action });

    // Vision events are already stored by the frame endpoint.
    if (storeEvent) session.events.push({ at, type: action.type, summary: action.summary || action.type, data: action.invoice });
    if (verdict.violation) {
      session.interventions.push({
        at,
        stepIndex: verdict.stepIndex,
        guardrail: verdict.guardrail,
        learnerAction: action.summary,
        outcome: "caught",
      });
    }
    await session.save();
    return res.status(200).json({ verdict });
  } catch (error) {
    console.error("sessions/[id]/guardrail-check error:", error);
    return res.status(500).json({ error: error.message });
  }
}
