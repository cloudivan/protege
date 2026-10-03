// Client tools for the interviewer in debrief mode. Pass the result to
// <AgentPanel clientTools={...} /> on the debrief page; works for real voice
// and mock voice alike.
//
//   resolve_question   -> POST /api/sessions/[id]/resolve-question
//   confirm_teach_back -> POST /api/sessions/[id]/teach-back, then builds the
//                         final Work Map (POST /api/workflows/[id]/map
//                         { finalize: true }) in the background
//
// onChange(event) fires after each write so the page can reload the map:
//   { type: "question_resolved", openLeft }
//   { type: "teach_back_confirmed" }
//   { type: "map_finalized", workMap } | { type: "map_failed", error }

import { useMemo, useRef } from "react";
import { api } from "@/lib/utils";

export function useDebriefTools({ sessionId, workflowId, getAt, onChange }) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  return useMemo(() => {
    if (!sessionId || !workflowId) return {};
    const emit = (e) => onChangeRef.current?.(e);
    return {
      resolve_question: async ({ index, answer }) => {
        try {
          const r = await api(`/api/sessions/${sessionId}/resolve-question`, {
            method: "POST",
            body: { index, answer, at: getAt?.() },
          });
          emit({ type: "question_resolved", openLeft: r.openLeft });
          return r.openLeft ? `saved, ${r.openLeft} open question(s) left` : "saved, no open questions left: do the teach-back";
        } catch (e) {
          return `error: ${e.message}`;
        }
      },
      confirm_teach_back: async ({ summary, corrections = [] }) => {
        try {
          await api(`/api/sessions/${sessionId}/teach-back`, {
            method: "POST",
            body: { summary, corrections, at: getAt?.() },
          });
        } catch (e) {
          return `error: ${e.message}`;
        }
        emit({ type: "teach_back_confirmed" });
        // The final build takes a while; don't hold the agent's tool call.
        api(`/api/workflows/${workflowId}/map`, { method: "POST", body: { finalize: true } })
          .then(({ workMap }) => emit({ type: "map_finalized", workMap }))
          .catch((e) => emit({ type: "map_failed", error: e.message }));
        return "confirmed, the final Work Map is being built";
      },
    };
  }, [sessionId, workflowId, getAt]);
}
