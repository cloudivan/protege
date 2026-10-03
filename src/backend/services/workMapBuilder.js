// Module 2: merge screen events + transcript + live answers into Work Map JSON
// and list what is still unclear for the debrief.
//
// TODO(map): this is a first pass. Tune the prompt on real capture sessions.

import { complete } from "@/backend/services/llm";

const fmt = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

// Drop anything said or shown inside an off-the-record span.
export function stripOffRecord(session) {
  const inSpan = (at) => (session.offRecordSpans || []).some((s) => at >= s.from && at <= (s.to ?? Infinity));
  return {
    transcript: session.transcript.map((t, i) => ({ ...t, i })).filter((t) => !t.offRecord && !inSpan(t.at)),
    events: session.events.filter((e) => !inSpan(e.at)),
  };
}

export async function buildWorkMap({ workflow, sessions }) {
  const evidence = sessions.map((s) => {
    const { transcript, events } = stripOffRecord(s);
    return {
      sessionId: String(s._id),
      kind: s.kind,
      events: events.map((e) => `[${fmt(e.at)} at=${e.at}] ${e.type}: ${e.summary}`),
      transcript: transcript.map((t) => `[#${t.i} at=${t.at}] ${t.role}: ${t.text}`),
    };
  });

  const system = `You turn an expert's recorded work session into a Work Map. Return ONLY JSON:
{"steps":[{"index":1,"title":"","decision":"","isJudgmentCall":false,
  "moment":{"sessionId":"","at":0,"label":"mm:ss, record, field"},
  "reason":{"text":"verbatim expert words","sessionId":"","turnIndex":0,"at":0},
  "guardrails":[{"kind":"limit|exception|stop_and_ask|never","rule":"","quote":{"text":"","sessionId":"","turnIndex":0,"at":0}}]}],
 "openQuestions":[{"text":"","aboutStepIndex":1}]}
Rules: every step and guardrail must cite a real event time and a real transcript turn. Reasons are the expert's verbatim words, never your paraphrase. If a decision has no stated reason, add an open question instead of inventing one.`;

  const raw = await complete({
    system,
    messages: [{ role: "user", text: `Workflow: ${workflow.title}\n\n${JSON.stringify(evidence)}` }],
    maxTokens: 6000,
    tier: "smart",
  });
  const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  return JSON.parse(json || "{}");
}
