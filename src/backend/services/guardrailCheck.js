// Module 3: does the new hire's pending action break a Work Map guardrail or
// deviate from the expert's decision at a judgment call? Runs BEFORE the
// sandbox commits a save, so the tutor can step in in time (the brief's
// "catches a wrong decision before it is saved").
//
// The verdict may only cite the Work Map. The expert reason it returns is
// copied from the map, never written by the model, so the tutor explains in
// the expert's own words.

import { complete } from "@/backend/services/llm";

const SYSTEM = `You check a new hire's pending action against an expert's Work Map.
Return ONLY a JSON object, no prose:
{"violation": boolean, "stepIndex": number|null, "guardrail": string|null, "explanation": string|null}

- violation=true only if the action breaks a guardrail in the Work Map, or makes a different decision than the expert would at a judgment call, given the facts of THIS case (amount, supplier, item, month, fields filled in).
- stepIndex: the Work Map step it concerns. guardrail: the exact rule or decision text from the Work Map.
- explanation: one short sentence on what in this case triggers the rule (e.g. "7,200 EUR equipment coded to opex 4711").
- If the Work Map does not cover the situation, violation=false. Never invent rules.`;

const parse = (text) => {
  try {
    return JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || "{}");
  } catch {
    return {};
  }
};

export async function checkAction({ workMap, action }) {
  const steps = (workMap?.steps || []).map((s) => ({
    index: s.index,
    title: s.title,
    decision: s.decision,
    isJudgmentCall: s.isJudgmentCall,
    reason: s.reason?.text,
    guardrails: (s.guardrails || []).map((g) => g.rule),
  }));
  const text = await complete({
    system: SYSTEM,
    messages: [
      {
        role: "user",
        text: `WORK MAP:\n${JSON.stringify(steps)}\n\nPENDING ACTION:\n${JSON.stringify(action)}`,
      },
    ],
    maxTokens: 300,
  });
  const v = parse(text);
  if (!v.violation) return { violation: false };

  const step = workMap.steps.find((s) => s.index === v.stepIndex);
  return {
    violation: true,
    stepIndex: step ? step.index : null,
    stepTitle: step?.title || null,
    guardrail: v.guardrail || null,
    explanation: v.explanation || null,
    expertReason: step?.reason?.text || null,
    hasMoment: Boolean(step?.moment),
  };
}

export default checkAction;
