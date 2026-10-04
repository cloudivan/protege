import dbConnect from "@/lib/dbConnect";
import Session from "@/backend/models/session";
import Workflow from "@/backend/models/workflow";
import WorkMap from "@/backend/models/workMap";
import { complete } from "@/backend/services/llm";

// POST { mastered: [], practice: [] }  tutor's finish_lesson tool
// POST {}                              fallback (mock voice, or the tutor never
//                                      called the tool): summarize from the
//                                      session's events and interventions
// Ends the teach session either way.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    await dbConnect();
    const session = await Session.findById(req.query.id);
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.kind !== "teach") return res.status(400).json({ error: "Only teach sessions have mastery" });

    let { mastered, practice } = req.body || {};
    if (!Array.isArray(mastered) || !Array.isArray(practice)) {
      const workflow = await Workflow.findById(session.workflowId);
      const workMap = await WorkMap.findById(workflow.workMapId).lean();
      const text = await complete({
        system:
          'You grade a junior doctor\'s practice case against an expert\'s Work Map. Return ONLY JSON: {"mastered": string[], "practice": string[]}. Short items, in plain words, naming Work Map steps. A step with a caught or missed intervention goes to practice.',
        messages: [
          {
            role: "user",
            text: JSON.stringify({
              steps: workMap.steps.map((s) => ({ index: s.index, title: s.title, guardrails: s.guardrails.map((g) => g.rule) })),
              actions: session.events.map((e) => e.summary),
              interventions: session.interventions,
            }),
          },
        ],
        maxTokens: 300,
      });
      try {
        ({ mastered = [], practice = [] } = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || "{}"));
      } catch {
        mastered = [];
        practice = [];
      }
    }

    session.mastery = { mastered, practice };
    session.status = "done";
    session.endedAt = new Date();
    await session.save();
    return res.status(200).json({ mastery: session.mastery });
  } catch (error) {
    console.error("sessions/[id]/mastery error:", error);
    return res.status(500).json({ error: error.message });
  }
}
