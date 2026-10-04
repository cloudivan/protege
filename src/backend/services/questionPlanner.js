// Module 1, Apprentice Test Q1 + Q2: "when to ask" and "what to ask".
//
// The page calls this at every natural pause (usePauseDetector). Two gates:
//   1. Deterministic budget (decideBudget): never while off the record, at
//      least MIN_GAP_MS since the last question, at most MAX_PER_WINDOW in any
//      WINDOW_MS, only if something new happened on screen since the last
//      question, and not while the last question is still unanswered.
//   2. The LLM picks the ONE question about what just happened that reveals a
//      reason or a guardrail and that the screen cannot answer, or declines.
// The agent then asks exactly that question (prompt rule "PAUSE. ASK: ...").

import { completeJson } from "@/backend/services/llm";

export const MIN_GAP_MS = 45_000;
export const WINDOW_MS = 10 * 60_000;
export const MAX_PER_WINDOW = 5;
const ANSWER_GRACE_MS = 60_000; // wait this long for an answer before moving on

const KINDS = ["why", "guardrail", "limit", "exception", "stop_and_ask"];

export function decideBudget(session, at) {
  if ((session.offRecordSpans || []).some((s) => s.to == null)) return { ok: false, reason: "off the record" };
  const asked = (session.questions || []).filter((q) => q.planned);
  const last = asked[asked.length - 1];
  if (last && at - last.at < MIN_GAP_MS) return { ok: false, reason: "asked recently" };
  if (asked.filter((q) => at - q.at < WINDOW_MS).length >= MAX_PER_WINDOW) {
    return { ok: false, reason: "question budget used, saving the rest for the debrief" };
  }
  if (last && last.answerTurnIndex == null && at - last.at < ANSWER_GRACE_MS) {
    return { ok: false, reason: "waiting for the last answer" };
  }
  const since = last ? last.at : -1;
  const fresh = (session.events || []).filter((e) => e.at > since);
  if (!fresh.length) return { ok: false, reason: "nothing new on screen" };
  return { ok: true, fresh };
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    ask: { type: "boolean", description: "False if nothing that just happened is worth interrupting for." },
    question: { type: "string", description: "One short spoken question, under 20 words, about something that just happened on screen." },
    kind: { type: "string", enum: KINDS },
    aboutEventAt: { type: "integer", description: "The at= value of the screen event the question is about." },
    rationale: { type: "string", description: "One short sentence: what this question should reveal." },
  },
  required: ["ask", "question", "kind", "aboutEventAt", "rationale"],
};

const SYSTEM = `You are the question planner for an AI apprentice that watches an expert do a real task on their screen. The expert just paused. Decide whether to ask ONE question now, and which.

A good question:
- is about something that JUST happened on screen (the new events), concrete, naming the record or value;
- reveals what the screen cannot show: the reason for a decision, a limit, an exception, when they would stop and ask someone, or what they would never do;
- is never answerable by looking at the screen ("what did you type?" is bad), never generic ("can you tell me more?" is bad);
- has not been asked or answered before (check the earlier questions and everything the expert already said);
- is short and spoken, one idea, no stacked questions.

Prefer judgment calls (a changed value, a hold, a rejection, an escalation, a re-coding) over routine clicks. If only routine actions happened, set ask=false.
kind: why = reason for a decision; guardrail = a rule they must not break; limit = a threshold or amount; exception = when the normal rule does not apply; stop_and_ask = when they would stop and ask someone.`;

const fmt = (ms = 0) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export async function planQuestion({ session, workflow, scenario, at }) {
  const budget = decideBudget(session, at);
  if (!budget.ok) return { ask: false, reason: budget.reason };

  const planned = (session.questions || []).filter((q) => q.planned);
  const guardrailAsked = planned.some((q) => ["guardrail", "limit", "stop_and_ask"].includes(q.kind));
  const expertSaid = (session.transcript || []).filter((t) => t.role === "user" && !t.offRecord).slice(-12);

  const draft = await completeJson({
    system: SYSTEM,
    text: [
      `Task: ${workflow.title} (expert: ${workflow.expertName || "the expert"}, domain: ${scenario?.domain || "desk work"})`,
      scenario?.curiosity?.length ? `What matters in this domain:\n- ${scenario.curiosity.join("\n- ")}` : "",
      `NEW screen events since the last question:\n${budget.fresh.slice(-12).map((e) => `[${fmt(e.at)} at=${e.at}] ${e.type}: ${e.summary}`).join("\n")}`,
      planned.length ? `Questions already asked:\n${planned.map((q) => `- (${q.kind}) ${q.text}`).join("\n")}` : "No questions asked yet.",
      expertSaid.length ? `What the expert has said recently:\n${expertSaid.map((t) => `- ${t.text}`).join("\n")}` : "",
      planned.length >= 2 && !guardrailAsked ? "No guardrail question yet: if anything allows it, ask about a limit, a rule or when they would stop and ask someone." : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    schema: SCHEMA,
    tier: "fast",
  });

  if (!draft.ask || !draft.question?.trim()) return { ask: false, reason: "nothing worth interrupting for" };
  const about = budget.fresh.find((e) => e.at === draft.aboutEventAt) ? draft.aboutEventAt : budget.fresh[budget.fresh.length - 1].at;
  return {
    ask: true,
    question: draft.question.trim(),
    kind: KINDS.includes(draft.kind) ? draft.kind : "why",
    aboutEventAt: about,
    rationale: draft.rationale,
  };
}

// The brief's Module 1 requirement, for the UI tracker.
export function captureStats(session) {
  const asked = (session.questions || []).filter((q) => q.askedTurnIndex != null);
  return {
    asked: asked.length,
    answered: asked.filter((q) => q.answerTurnIndex != null).length,
    guardrail: asked.filter((q) => ["guardrail", "limit", "stop_and_ask", "exception"].includes(q.kind)).length,
    met: asked.length >= 3 && asked.some((q) => ["guardrail", "limit", "stop_and_ask", "exception"].includes(q.kind)),
  };
}
