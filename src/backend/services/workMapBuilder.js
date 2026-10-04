// Module 2: merge screen events + transcript + live answers into Work Map JSON
// and list what is still unclear for the debrief.
//
// Two passes:
//   1. buildWorkMap: the LLM drafts steps, decisions, reasons and guardrails
//      from the capture + debrief sessions (structured output).
//   2. verifyWorkMap: deterministic check of every citation against the
//      sessions. A screen moment must match a real screen event (its frame
//      becomes the replay); a reason or guardrail quote must be the expert's
//      own words in a real transcript turn. Anything that fails is removed and
//      turned into an open question, so the debrief asks instead of the map
//      inventing. This is the brief's "every step and guardrail links to a
//      screen moment and the expert's own words".

import { completeJson } from "@/backend/services/llm";

const fmt = (ms = 0) => {
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

// ----------------------------------------------------------------- schema
const quoteSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    text: { type: "string", description: "The expert's verbatim words, copied from one transcript turn." },
    sessionId: { type: "string" },
    turnIndex: { type: "integer", description: "The #number of that transcript turn." },
  },
  required: ["text", "sessionId", "turnIndex"],
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    steps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          index: { type: "integer" },
          title: { type: "string", description: "Imperative, short: 'Adjust the anticoagulation in the discharge plan'." },
          decision: { type: "string", description: "What the expert decided here, concretely." },
          isJudgmentCall: { type: "boolean", description: "True when the step needed the expert's judgment, not just a click." },
          moment: {
            type: "object",
            additionalProperties: false,
            properties: {
              sessionId: { type: "string" },
              at: { type: "integer", description: "The at= value of the screen event this step happened at." },
              label: { type: "string", description: "'mm:ss, record, field', e.g. '03:12, medication plan, anticoagulation field'." },
            },
            required: ["sessionId", "at", "label"],
          },
          reason: { anyOf: [quoteSchema, { type: "null" }] },
          guardrails: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                kind: { type: "string", enum: ["limit", "exception", "stop_and_ask", "never"] },
                rule: { type: "string", description: "The rule as a short instruction." },
                quote: quoteSchema,
              },
              required: ["kind", "rule", "quote"],
            },
          },
        },
        required: ["index", "title", "decision", "isJudgmentCall", "moment", "reason", "guardrails"],
      },
    },
    openQuestions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          text: { type: "string", description: "One short spoken question for the expert." },
          aboutStepIndex: { type: "integer" },
        },
        required: ["text", "aboutStepIndex"],
      },
    },
  },
  required: ["steps", "openQuestions"],
};

const SYSTEM = `You turn an expert's recorded work sessions into a Work Map: the steps of the task, the decision at each step, the reason in the expert's own words, and the guardrails (limits, exceptions, when to stop and ask someone, what never to do).

Evidence format:
- Screen events: "[mm:ss at=<ms>] <type>: <summary>". A step's moment.at must be one of these at= values, with that event's sessionId.
- Transcript turns: "[#<n> at=<ms>] <role>: <text>". role "user" is the expert, "agent" is the apprentice asking. Quotes come ONLY from "user" turns: copy the words exactly and give that turn's #n as turnIndex.

Rules:
- Follow the order the work happened. Merge repeated actions into one step.
- A reason or guardrail must be quoted verbatim from the expert. Never paraphrase into a quote, never invent one.
- If a decision has no stated reason, set reason to null and add an open question asking why.
- Open questions: only what is still unclear (exceptions seen once, unstated limits, who decides, cases not seen). Short, spoken, one idea each. Do not repeat questions already answered in the debrief.
- Debrief sessions answer earlier open questions: use those answers as reasons and guardrails, quoted from the debrief transcript.`;

const evidenceFor = (sessions) =>
  sessions.map((s) => {
    const { transcript, events } = stripOffRecord(s);
    return {
      sessionId: String(s._id),
      kind: s.kind,
      events: events.map((e) => `[${fmt(e.at)} at=${e.at}] ${e.type}: ${e.summary}`),
      transcript: transcript.map((t) => `[#${t.i} at=${t.at}] ${t.role}: ${t.text}`),
    };
  });

export async function buildWorkMap({ workflow, sessions, previous }) {
  const answered = (previous?.openQuestions || [])
    .filter((q) => q.resolved)
    .map((q) => ({ question: q.text, answer: q.answer }));
  const corrections = previous?.teachBack?.corrections || [];

  const draft = await completeJson({
    system: SYSTEM,
    text: [
      `Workflow: ${workflow.title} (expert: ${workflow.expertName || "the expert"})`,
      answered.length ? `Answered in the debrief (do not ask again):\n${JSON.stringify(answered)}` : "",
      corrections.length ? `Corrections the expert made to the teach-back (they override earlier wording):\n${JSON.stringify(corrections)}` : "",
      `Sessions:\n${JSON.stringify(evidenceFor(sessions))}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    schema: SCHEMA,
    tier: "smart",
  });
  if (process.env.DEBUG_WORKMAP) console.log("[workMap draft]", JSON.stringify(draft));
  return verifyWorkMap(draft, sessions, previous);
}

// ----------------------------------------------------------- verification
const norm = (s = "") =>
  s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^\p{L}\p{N}'€$% ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

// The quote must be (nearly) word for word inside the turn: the model may
// trim filler or fix casing, not rephrase.
const quoteMatches = (quote, turnText) => {
  const q = norm(quote);
  const t = norm(turnText);
  if (q.length < 3) return false;
  if (t.includes(q)) return true;
  const words = q.split(" ");
  return words.filter((w) => t.includes(w)).length / words.length >= 0.85;
};

// Find the cited turn, or the same words in another expert turn.
function resolveQuote(quote, byId) {
  if (!quote?.text) return null;
  const expertTurn = (s, i) => {
    const t = s.transcript[i];
    return t && t.role === "user" && !t.offRecord ? t : null;
  };
  const cited = byId.get(String(quote.sessionId));
  const citedTurn = cited && expertTurn(cited, quote.turnIndex);
  if (citedTurn && quoteMatches(quote.text, citedTurn.text)) {
    return { text: quote.text, sessionId: cited._id, turnIndex: quote.turnIndex, at: citedTurn.at };
  }
  for (const s of byId.values()) {
    const i = s.transcript.findIndex((t, k) => expertTurn(s, k) && quoteMatches(quote.text, t.text));
    if (i !== -1) return { text: quote.text, sessionId: s._id, turnIndex: i, at: s.transcript[i].at };
  }
  return null;
}

// Snap the cited moment to the nearest real screen event (within 5 s), which
// also gives the step its replayable frame.
function resolveMoment(moment, byId, fallbackSession) {
  if (!moment) return null;
  const session = byId.get(String(moment.sessionId)) || fallbackSession;
  if (!session?.events?.length) return null;
  let best = null;
  for (const e of session.events) {
    const d = Math.abs(e.at - moment.at);
    if (d <= 5000 && (!best || d < best.d)) best = { e, d };
  }
  if (!best) return null;
  return {
    sessionId: session._id,
    at: best.e.at,
    frameKey: best.e.frameKey,
    label: moment.label || `${fmt(best.e.at)}, ${best.e.summary}`,
  };
}

const similar = (a, b) => {
  const wa = new Set(norm(a).split(" "));
  const wb = norm(b).split(" ");
  return wb.filter((w) => wa.has(w)).length / Math.max(wb.length, 1) >= 0.6;
};

export function verifyWorkMap(draft, sessions, previous) {
  const byId = new Map(sessions.map((s) => [String(s._id), s]));
  const fallbackSession = sessions.find((s) => s.kind === "capture");
  const removed = [];
  const extraQuestions = [];

  const steps = (draft.steps || []).map((s, k) => {
    const index = k + 1;
    const moment = resolveMoment(s.moment, byId, fallbackSession);
    if (!moment) removed.push({ stepIndex: index, what: "screen moment", why: "no matching screen event" });

    let reason = resolveQuote(s.reason, byId);
    if (s.reason && !reason) removed.push({ stepIndex: index, what: "reason", why: "quote not found in the expert's words" });
    const asked = (draft.openQuestions || []).some((q) => q.aboutStepIndex === s.index);
    if (!reason && s.isJudgmentCall && !asked) {
      extraQuestions.push({ text: `Why did you ${s.title.charAt(0).toLowerCase()}${s.title.slice(1)} that way?`, aboutStepIndex: index });
    }

    const guardrails = [];
    for (const g of s.guardrails || []) {
      const quote = resolveQuote(g.quote, byId);
      if (quote) {
        guardrails.push({ kind: g.kind, rule: g.rule, quote, moment: moment || undefined });
      } else {
        removed.push({ stepIndex: index, what: `guardrail "${g.rule}"`, why: "not backed by the expert's words" });
        extraQuestions.push({ text: `Is this a rule you follow: ${g.rule}`, aboutStepIndex: index });
      }
    }

    return {
      index,
      title: s.title,
      decision: s.decision,
      isJudgmentCall: Boolean(s.isJudgmentCall),
      ...(moment && { moment }),
      ...(reason && { reason }),
      guardrails,
    };
  });

  // Keep earlier answers on record; drop new questions that repeat them.
  const resolved = (previous?.openQuestions || []).filter((q) => q.resolved);
  const open = [];
  for (const q of [...(draft.openQuestions || []), ...extraQuestions]) {
    if (resolved.some((r) => similar(r.text, q.text)) || open.some((o) => similar(o.text, q.text))) continue;
    open.push({ text: q.text, aboutStepIndex: q.aboutStepIndex, resolved: false });
  }

  return {
    steps,
    openQuestions: [...resolved, ...open],
    verification: { checkedAt: new Date(), removed },
  };
}
