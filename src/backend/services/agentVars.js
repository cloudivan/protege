// Builds ElevenLabs dynamic variables server-side. The browser never composes
// prompt data (same rule as haggle). Dynamic variables accept primitives only,
// so nested data is JSON.stringify'd.

export function buildInterviewerVars({ workflow, scenario, mode, workMap }) {
  return {
    mode, // "capture" | "debrief"
    expert_name: workflow.expertName || "the expert",
    workflow_title: workflow.title,
    domain: scenario.domain,
    curiosity_json: JSON.stringify(scenario.curiosity),
    // Numbered by position in workMap.openQuestions: resolve_question sends
    // that index back. Empty in capture mode.
    open_questions_json: JSON.stringify(
      mode === "debrief"
        ? (workMap?.openQuestions || [])
            .map((q, index) => ({ index, question: q.text, aboutStep: q.aboutStepIndex, resolved: Boolean(q.resolved) }))
            .filter((q) => !q.resolved)
            .map(({ resolved, ...q }) => q)
        : [],
    ),
    // The draft map the debrief explains back (teach-back).
    work_map_json: JSON.stringify(mode === "debrief" ? compactSteps(workMap) : []),
  };
}

const compactSteps = (workMap) =>
  (workMap?.steps || []).map((s) => ({
    index: s.index,
    title: s.title,
    decision: s.decision,
    isJudgmentCall: s.isJudgmentCall,
    reason: s.reason?.text,
    guardrails: (s.guardrails || []).map((g) => ({ kind: g.kind, rule: g.rule })),
  }));

export function buildTutorVars({ workflow, workMap }) {
  return {
    expert_name: workflow.expertName || "the expert",
    workflow_title: workflow.title,
    work_map_json: JSON.stringify(compactSteps(workMap)),
  };
}
