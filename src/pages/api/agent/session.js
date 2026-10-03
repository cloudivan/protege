import dbConnect from "@/lib/dbConnect";
import Session from "@/backend/models/session";
import Workflow from "@/backend/models/workflow";
import WorkMap from "@/backend/models/workMap";
import { scenarioFor } from "@/backend/services/useCase";
import { buildInterviewerVars, buildTutorVars } from "@/backend/services/agentVars";

const AGENT_IDS = {
  interviewer: () => process.env.ELEVENLABS_INTERVIEWER_AGENT_ID,
  tutor: () => process.env.ELEVENLABS_TUTOR_AGENT_ID,
};

// POST { sessionId } -> { signedUrl, dynamicVariables } (or { mock: true, ... })
// The role is derived from the session kind, never trusted from the client.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    await dbConnect();
    const session = await Session.findById(req.body?.sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });
    const workflow = await Workflow.findById(session.workflowId);
    if (!workflow) return res.status(404).json({ error: "Workflow not found" });
    const scenario = scenarioFor(workflow);
    const workMap = workflow.workMapId ? await WorkMap.findById(workflow.workMapId) : null;

    const role = session.kind === "teach" ? "tutor" : "interviewer";
    const dynamicVariables =
      role === "tutor"
        ? buildTutorVars({ workflow, workMap })
        : buildInterviewerVars({ workflow, scenario, mode: session.kind, workMap });

    if (process.env.NEXT_PUBLIC_VOICE_MODE !== "real") {
      return res.status(200).json({ mock: true, role, dynamicVariables });
    }

    const agentId = AGENT_IDS[role]();
    if (!agentId) return res.status(500).json({ error: `Missing ElevenLabs agent id for '${role}'` });
    const r = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
      { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY } },
    );
    if (!r.ok) return res.status(502).json({ error: `ElevenLabs signed-url request failed: ${r.status}` });
    const { signed_url: signedUrl } = await r.json();
    return res.status(200).json({ signedUrl, role, dynamicVariables });
  } catch (error) {
    console.error("agent/session error:", error);
    return res.status(500).json({ error: error.message });
  }
}
