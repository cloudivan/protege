// Module 3: a practice lesson generated from the confirmed Work Map.
//
// The LLM writes a NEW fictional patient case that the expert never showed,
// and walks it through the Work Map's steps. Each lesson step is one decision
// the junior doctor has to make. At least one step is a "trap": the case
// facts make breaking one of the expert's guardrails look reasonable. That is
// the brief's "the tutor catches a wrong decision and explains it with the
// expert's reasoning".
//
// The LLM only writes the case and the task wording. What counts as right is
// taken from the Work Map (decision, reason quote, guardrails), and every
// lesson step is checked to point at a real Work Map step and real guardrails.

import { completeJson } from "@/backend/services/llm";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    case: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string", description: "Short case title, e.g. 'Discharge after NSTEMI, reduced kidney function'." },
        setting: { type: "string", description: "Where and when: ward, clinic, emergency department, time of day." },
        patient: { type: "string", description: "Fictional patient: an anonymous label, age, sex. No real names." },
        presentation: { type: "string", description: "Why the patient is here and the course so far, 2 to 4 sentences." },
        facts: {
          type: "array",
          items: { type: "string", description: "One case fact: a value, a medication, a finding, a document." },
          description: "6 to 12 concrete facts the decisions depend on (labs with units, medications with doses, findings, allergies, social facts).",
        },
      },
      required: ["title", "setting", "patient", "presentation", "facts"],
    },
    steps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          workMapStep: { type: "integer", description: "The index of the Work Map step this decision practices." },
          task: { type: "string", description: "What the junior doctor must decide or do now, as a direct question. Never hint at the answer." },
          expected: { type: "string", description: "The decision the expert would make in THIS case, concretely (drug, dose, order, wording)." },
          acceptable: { type: "array", items: { type: "string" }, description: "Other answers that are also correct in this case, if any." },
          guardrails: { type: "array", items: { type: "string" }, description: "Exact guardrail rules (copied from the Work Map step) this decision tests." },
          trap: { type: "boolean", description: "True if the case facts tempt the learner to break one of these guardrails." },
          trapFacts: { type: "string", description: "For a trap: which case facts make the wrong choice tempting. Empty otherwise." },
        },
        required: ["workMapStep", "task", "expected", "acceptable", "guardrails", "trap", "trapFacts"],
      },
    },
  },
  required: ["case", "steps"],
};

const SYSTEM = `You write practice cases for junior doctors, from a senior doctor's Work Map (their steps, decisions, reasons and guardrails for one workflow).

Write ONE new fictional case that the expert did not show, then the decisions the junior doctor must make in it, in Work Map order.
- Fictional patient only: an anonymous label like "Patient A", never a real or realistic full name, no real identifiers.
- Clinically coherent and specific: realistic values with units, real drug names and doses, plausible course.
- Cover the Work Map's judgment calls. Skip pure routine clicks unless needed for the flow. 3 to 6 steps.
- At least one step is a trap: the facts make the wrong choice look reasonable, and the right choice follows from one of the expert's guardrails. Copy the guardrail text exactly from the Work Map.
- "expected" must follow from the expert's reasons and guardrails applied to THIS case's facts. Do not add rules the Work Map does not contain.
- Tasks are direct questions ("What do you put in the discharge medication for the anticoagulant?"), never revealing the answer.
- Training only: this is not medical advice, and the case is fictional.`;

const stepView = (workMap) =>
  (workMap.steps || []).map((s) => ({
    index: s.index,
    title: s.title,
    decision: s.decision,
    isJudgmentCall: s.isJudgmentCall,
    reason: s.reason?.text,
    guardrails: (s.guardrails || []).map((g) => ({ kind: g.kind, rule: g.rule })),
  }));

const norm = (s = "") => s.toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, " ").replace(/\s+/g, " ").trim();

export async function generateLesson({ workflow, workMap }) {
  const steps = stepView(workMap);
  if (!steps.length) throw new Error("The Work Map has no steps to practice");

  const draft = await completeJson({
    system: SYSTEM,
    text: `Workflow: ${workflow.title}\nUse case: ${workflow.domain || workflow.useCase || ""}\nExpert: ${workflow.expertName || "the expert"}\n\nWORK MAP:\n${JSON.stringify(steps)}`,
    schema: SCHEMA,
    tier: "smart",
  });

  // Keep only steps that point at a real Work Map step; guardrails must be
  // that step's own rules (matched loosely, stored as the Work Map's text).
  const lessonSteps = [];
  for (const s of draft.steps || []) {
    const ws = workMap.steps.find((w) => w.index === s.workMapStep);
    if (!ws || !s.task?.trim() || !s.expected?.trim()) continue;
    const rules = (ws.guardrails || []).map((g) => g.rule);
    const guardrails = (s.guardrails || [])
      .map((g) => rules.find((r) => norm(r) === norm(g) || norm(r).includes(norm(g)) || norm(g).includes(norm(r))))
      .filter(Boolean);
    lessonSteps.push({
      index: lessonSteps.length + 1,
      workMapStep: ws.index,
      title: ws.title,
      task: s.task.trim(),
      expected: s.expected.trim(),
      acceptable: (s.acceptable || []).filter(Boolean),
      guardrails: [...new Set(guardrails)],
      trap: Boolean(s.trap && guardrails.length),
      trapFacts: s.trap ? s.trapFacts || "" : "",
    });
  }
  if (!lessonSteps.length) throw new Error("Could not build practice steps from this Work Map");

  return {
    generatedAt: new Date().toISOString(),
    workMapVersion: workMap.version,
    case: draft.case,
    steps: lessonSteps,
  };
}

// What the learner sees: the case and the tasks, never the expected answers
// or which step is the trap.
export function publicLesson(lesson) {
  if (!lesson) return null;
  return {
    case: lesson.case,
    steps: lesson.steps.map(({ index, workMapStep, title, task }) => ({ index, workMapStep, title, task })),
  };
}
