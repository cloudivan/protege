// Capture pages: at every natural pause, ask the backend question planner
// (POST /api/sessions/[id]/pause) whether to ask, and if so prompt the agent
// "PAUSE. ASK: <question>" (a prompt, not a contextual update: a real agent
// only speaks after a user message). Otherwise the agent stays silent.
//
//   const { onPause, last, stats } = useQuestionPlanner({ sessionId, getAt, prompt });
//   usePauseDetector({ onPause, enabled });
//
// `last` is the latest decision ({ ask, question, kind, reason }) for a status
// line; `stats` is { asked, answered, guardrail, met } for the tracker.

import { useCallback, useRef, useState } from "react";
import { api } from "@/lib/utils";

export function useQuestionPlanner({ sessionId, getAt, prompt }) {
  const [last, setLast] = useState(null);
  const [stats, setStats] = useState({ asked: 0, answered: 0, guardrail: 0, met: false });
  const busy = useRef(false);
  const promptRef = useRef(prompt);
  promptRef.current = prompt;

  const onPause = useCallback(async () => {
    if (!sessionId || busy.current) return;
    busy.current = true;
    try {
      const r = await api(`/api/sessions/${sessionId}/pause`, { method: "POST", body: { at: getAt() } });
      setLast(r);
      if (r.stats) setStats(r.stats);
      if (r.ask) promptRef.current?.(`PAUSE. ASK: ${r.question}`);
    } catch (e) {
      setLast({ ask: false, reason: e.message });
    } finally {
      busy.current = false;
    }
  }, [sessionId, getAt]);

  return { onPause, last, stats, setStats };
}
