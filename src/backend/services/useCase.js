// Use cases are free text ("insurance claims triage", "KYC onboarding checks").
// From that text we generate a short domain profile the agents work from:
// the domain in one line and what an apprentice should be curious about.
// Presets in src/config/scenarios (e.g. invoices) bring their own profile plus
// a sandbox and demo cases.
//
// scenarioFor(workflow) is the one place the backend reads a workflow's
// domain profile, whether it came from a preset or was generated.

import getScenario from "@/config/scenarios";
import { completeJson } from "@/backend/services/llm";

const GENERIC_CURIOSITY = [
  "Why a step is done the way it is, especially when a value is changed or a case is treated differently.",
  "Limits and thresholds: amounts, dates, counts that change the decision.",
  "Exceptions: when the normal rule does not apply, and how to recognize that case.",
  "When to stop and ask someone, and who.",
  "What must never be done, and what goes wrong if it is.",
];

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    domain: { type: "string", description: "One line: the work and the setting, e.g. 'Claims triage at a car insurer'." },
    curiosity: {
      type: "array",
      items: { type: "string", description: "One thing to be curious about, one sentence." },
      description: "4 to 6 things an apprentice should ask about in this kind of work: reasons behind decisions, limits, exceptions, when to stop and ask, what never to do. Concrete to this domain.",
    },
  },
  required: ["domain", "curiosity"],
};

export async function profileForUseCase({ title, useCase, expertName }) {
  try {
    const p = await completeJson({
      system:
        "You prepare an AI apprentice that will watch an expert do desk work on screen and ask about the judgment behind it. Describe the domain and what is worth asking about. Be concrete to this kind of work; no generic advice.",
      text: `Task: ${title}\nUse case in the user's words: ${useCase}\nExpert: ${expertName || "unknown"}`,
      schema: SCHEMA,
      tier: "fast",
    });
    const curiosity = (p.curiosity || []).map((c) => c.trim()).filter(Boolean).slice(0, 6);
    return { domain: p.domain?.trim() || useCase, curiosity: curiosity.length ? curiosity : GENERIC_CURIOSITY };
  } catch (error) {
    console.error("use case profile failed, using the generic one:", error.message);
    return { domain: useCase, curiosity: GENERIC_CURIOSITY };
  }
}

// { domain, curiosity, cases?, sandbox?, preset } for any workflow.
export function scenarioFor(workflow) {
  const preset = getScenario(workflow?.scenario);
  return {
    preset: preset?.id || null,
    domain: workflow?.domain || preset?.domain || workflow?.useCase || "desk work",
    curiosity: workflow?.curiosity?.length ? workflow.curiosity : preset?.curiosity || GENERIC_CURIOSITY,
    cases: preset?.cases || null,
    sandbox: preset?.sandbox || null,
  };
}
