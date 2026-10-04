// Protégé is for doctors: a senior doctor teaches a workflow from their desk
// work, junior doctors learn it. Topics and names are always the user's own
// free text; nothing about the domain is hard-coded.
//
// From the use case text we generate a short domain profile the agents work
// from: the clinical setting in one line and what an apprentice should be
// curious about. scenarioFor(workflow) is the one place the backend reads it.

import { completeJson } from "@/backend/services/llm";

// Used only when profile generation fails: clinical judgment in general.
const FALLBACK_CURIOSITY = [
  "Why a clinical decision is made this way for this patient, and which findings drive it.",
  "Thresholds: lab values, scores, doses, ages or timings that change the decision.",
  "Exceptions: patients for whom the usual approach does not apply, and how to recognize them.",
  "When to stop and involve someone: a senior, another specialty, pharmacy, the patient or family.",
  "What must never be done, and what harm it would cause.",
];

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    domain: { type: "string", description: "One line: the clinical work and setting, e.g. 'Discharge letters on an internal medicine ward'." },
    curiosity: {
      type: "array",
      items: { type: "string", description: "One thing to be curious about, one sentence." },
      description:
        "4 to 6 things an apprentice should ask the senior doctor about in this workflow: the reasoning behind decisions, thresholds, exceptions, when to escalate or consult, what never to do, documentation that matters. Concrete to this clinical work.",
    },
  },
  required: ["domain", "curiosity"],
};

export async function profileForUseCase({ title, useCase, expertName }) {
  try {
    const p = await completeJson({
      system:
        "You prepare an AI apprentice that will watch a senior doctor do a real clinical desk workflow on screen (documentation, orders, medication, letters, coding, triage, results) and ask about the judgment behind it. Describe the clinical setting and what is worth asking about. Be concrete to this workflow; no generic advice.",
      text: `Workflow: ${title}\nUse case in the user's words: ${useCase}\nSenior doctor: ${expertName || "unknown"}`,
      schema: SCHEMA,
      tier: "fast",
    });
    const curiosity = (p.curiosity || []).map((c) => c.trim()).filter(Boolean).slice(0, 6);
    return { domain: p.domain?.trim() || useCase, curiosity: curiosity.length ? curiosity : FALLBACK_CURIOSITY };
  } catch (error) {
    console.error("use case profile failed, using the fallback:", error.message);
    return { domain: useCase, curiosity: FALLBACK_CURIOSITY };
  }
}

// { domain, curiosity } for any workflow.
export function scenarioFor(workflow) {
  return {
    domain: workflow?.domain || workflow?.useCase || "clinical desk work",
    curiosity: workflow?.curiosity?.length ? workflow.curiosity : FALLBACK_CURIOSITY,
  };
}
