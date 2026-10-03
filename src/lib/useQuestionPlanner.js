// Capture pages: at every natural pause, ask the backend question planner
// (POST /api/sessions/[id]/pause) whether to ask, and if so send the agent
// "PAUSE. ASK: <question>". Otherwise the agent stays silent.
//
//   const { onPause, last, stats } = useQuestionPlanner({ sessionId, getAt, send });
//   usePauseDetector({ onPause, enabled });
//
// `last` is the latest decision ({ ask, question, kind, reason }) for a status
// line; `stats` is { asked, answered, guardrail, met } for the tracker.

import { useCallback, useRef, useState } from "react";
import { api } from "@/lib/utils";

export function useQuestionPlanner({ sessionId, getAt, send }) {
  const [last, setLast] = useState(null);
  const [stats, setStats] = useState({ asked: 0, answered: 0, guardrail: 0, met: false });
  const busy = useRef(false);
  const sendRef = useRef(send);
  sendRef.current = send;

  const onPause = useCallback(async () => {
    if (!sessionId || busy.current) return;
    busy.current = true;
    try {
      const r = await api(`/api/sessions/${sessionId}/pause`, { method: "POST", body: { at: getAt() } });
      setLast(r);
      if (r.stats) setStats(r.stats);
      if (r.ask) sendRef.current?.(`PAUSE. ASK: ${r.question}`);
    } catch (e) {
      setLast({ ask: false, reason: e.message });
    } finally {
      busy.current = false;
    }
  }, [sessionId, getAt]);

  return { onPause, last, stats, setStats };
}
