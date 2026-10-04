// Module 3: grade the junior doctor's answer to one lesson step.
//
// The LLM only judges whether the answer matches what the expert would do in
// this case and, if not, which of the step's guardrails it breaks. Everything
// the learner is shown as the expert's reasoning comes from the Work Map: the
// reason quote, the broken guardrail with its quote, and the screen moment to
// replay. Progress, interventions and the final mastery are recorded here, so
// the page only displays them.

import { completeJson } from "@/backend/services/llm";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    verdict: {
      type: "string",
      enum: ["correct", "partly", "incorrect"],
      description: "correct: same decision as expected or acceptable (wording may differ). partly: right direction but something required is missing. incorrect: a different decision.",
    },
    brokenGuardrail: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description: "If the answer breaks one of the listed guardrails, that rule's exact text. Otherwise null.",
    },
    missing: { type: "string", description: "For partly/incorrect: what is missing or wrong, in a few words. Empty when correct." },
    explanation: { type: "string", description: "One or two sentences linking the case facts to the right decision. Use only the case and the listed reasons and rules." },
  },
  required: ["verdict", "brokenGuardrail", "missing", "explanation"],
};

const SYSTEM = `You grade a junior doctor's answer in a fictional practice case against what a senior doctor (the expert) would do.
- Judge the decision, not the wording or spelling. Abbreviations and brand/generic names are fine.
- "correct" if it matches the expected decision or an acceptable alternative. "partly" if the direction is right but a required element (dose, check, order, recipient) is missing. "incorrect" otherwise.
- brokenGuardrail: only one of the listed rules, copied exactly, and only if the answer actually breaks it.
- Never introduce rules or facts that are not in the case or the expert's reasons and guardrails.`;

const norm = (s = "") => s.toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, " ").replace(/\s+/g, " ").trim();

// The expert's own words and screen moment for a Work Map step.
function expertFor(ws, ruleText) {
  const g = ruleText ? (ws.guardrails || []).find((x) => norm(x.rule) === norm(ruleText)) : null;
  return {
    stepTitle: ws.title,
    reason: ws.reason?.text || null,
    guardrail: g ? { kind: g.kind, rule: g.rule, quote: g.quote?.text || null } : null,
    moment: ws.moment ? { at: ws.moment.at, label: ws.moment.label, frameKey: ws.moment.frameKey || null } : null,
    hasMoment: Boolean(ws.moment),
  };
}

export const newProgress = (lesson) =>
  lesson.steps.map((s) => ({ index: s.index, status: "open", attempts: [] }));

const openIndex = (progress) => progress.find((p) => p.status === "open")?.index ?? null;

// Mastery from the progress, no LLM: first-try right = mastered; anything
// that needed a catch, a retry or the answer = practice next, with the rule.
export function masteryFrom(lesson, progress) {
  const mastered = [];
  const practice = [];
  for (const p of progress) {
    const step = lesson.steps.find((s) => s.index === p.index);
    if (p.status === "mastered") mastered.push(step.title);
    else practice.push(step.guardrails.length ? `${step.title}: ${step.guardrails[0]}` : step.title);
  }
  return { mastered, practice };
}

export async function gradeAnswer({ session, workMap, stepIndex, answer, at }) {
  const lesson = session.lesson;
  const step = lesson.steps.find((s) => s.index === stepIndex);
  if (!step) throw Object.assign(new Error(`No lesson step ${stepIndex}`), { status: 400 });
  const progress = session.progress || newProgress(lesson);
  const p = progress.find((x) => x.index === stepIndex);
  if (p.status !== "open") throw Object.assign(new Error("This step is already done"), { status: 409 });
  if (!answer?.trim()) throw Object.assign(new Error("answer is required"), { status: 400 });
  const ws = workMap.steps.find((w) => w.index === step.workMapStep);

  const g = await completeJson({
    system: SYSTEM,
    text: JSON.stringify({
      case: lesson.case,
      task: step.task,
      expected: step.expected,
      acceptable: step.acceptable,
      expertReason: ws?.reason?.text || null,
      guardrails: step.guardrails,
      answer: answer.trim(),
    }),
    schema: SCHEMA,
    tier: "smart",
  });

  const broken = g.brokenGuardrail ? step.guardrails.find((r) => norm(r) === norm(g.brokenGuardrail)) || null : null;
  const verdict = ["correct", "partly", "incorrect"].includes(g.verdict) ? g.verdict : "incorrect";
  p.attempts.push({ answer: answer.trim(), verdict, brokenGuardrail: broken, at });

  if (verdict === "correct") {
    const caught = p.attempts.some((a) => a.brokenGuardrail);
    p.status = p.attempts.length === 1 ? "mastered" : "corrected";
    if (caught) {
      session.interventions.push({ at, stepIndex: step.workMapStep, guardrail: p.attempts.find((a) => a.brokenGuardrail).brokenGuardrail, learnerAction: answer.trim(), outcome: "corrected" });
    }
  } else if (broken) {
    session.interventions.push({ at, stepIndex: step.workMapStep, guardrail: broken, learnerAction: answer.trim(), outcome: "caught" });
  }

  return finish(session, progress, {
    step: stepIndex,
    verdict,
    missing: verdict === "correct" ? "" : g.missing || "",
    explanation: g.explanation || "",
    expected: verdict === "correct" ? step.expected : null,
    expert: ws ? expertFor(ws, broken) : null,
    caught: Boolean(broken),
  });
}

// "Show me": the learner gives up on a step; reveal the expert's decision.
export function revealStep({ session, workMap, stepIndex, at }) {
  const lesson = session.lesson;
  const step = lesson.steps.find((s) => s.index === stepIndex);
  if (!step) throw Object.assign(new Error(`No lesson step ${stepIndex}`), { status: 400 });
  const progress = session.progress || newProgress(lesson);
  const p = progress.find((x) => x.index === stepIndex);
  if (p.status !== "open") throw Object.assign(new Error("This step is already done"), { status: 409 });
  p.status = "revealed";
  p.attempts.push({ answer: null, verdict: "revealed", brokenGuardrail: null, at });
  const ws = workMap.steps.find((w) => w.index === step.workMapStep);
  return finish(session, progress, {
    step: stepIndex,
    verdict: "revealed",
    missing: "",
    explanation: "",
    expected: step.expected,
    expert: ws ? expertFor(ws, step.guardrails[0]) : null,
    caught: false,
  });
}

function finish(session, progress, result) {
  session.progress = progress;
  session.markModified("progress");
  const next = openIndex(progress);
  if (next == null && !session.mastery) {
    session.mastery = masteryFrom(session.lesson, progress);
    session.status = "done";
    session.endedAt = new Date();
  }
  return { ...result, next, done: next == null, progress, mastery: next == null ? session.mastery : null };
}
