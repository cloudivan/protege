// Apprentice Test Q1, "When to ask". The expert works in ANOTHER app (the
// shared screen), so we cannot see their keystrokes. Activity signals are:
//   - screen events / vision says "typing" or "navigating"
//   - the user is speaking (transcript turns, VAD)
// After `pauseMs` with no activity we fire onPause ONCE, then re-arm on the
// next activity. The agent only speaks after it receives "PAUSE".
//
// TODO(capture): add Scribe v2 Realtime VAD as a speech signal.

import { useCallback, useEffect, useRef } from "react";

const DEFAULT_PAUSE_MS = Number(process.env.NEXT_PUBLIC_PAUSE_MS) || 2500;

export function usePauseDetector({ onPause, pauseMs = DEFAULT_PAUSE_MS, enabled = true }) {
  const lastActivity = useRef(Date.now());
  const fired = useRef(false);
  const onPauseRef = useRef(onPause);
  onPauseRef.current = onPause;

  const markActivity = useCallback(() => {
    lastActivity.current = Date.now();
    fired.current = false;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      if (!fired.current && Date.now() - lastActivity.current >= pauseMs) {
        fired.current = true;
        onPauseRef.current?.();
      }
    }, 250);
    return () => clearInterval(id);
  }, [enabled, pauseMs]);

  return { markActivity };
}
