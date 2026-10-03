// The agent's latest line as short subtitles: a few words at a time, each
// group replacing the last. Words follow her actual voice: a character clock
// only runs while her audio is audible, at the speech rate the voice SDK
// reports, so pauses in her speech pause the words too.
//
// `audioRef.current()` returns { audible, cps } (cps = characters per second).
import { useEffect, useMemo, useRef, useState } from "react";
import { noEmDash } from "@/lib/utils";

const GROUP = 4; // words on screen at once
const FLUSH_CPS = 60; // after she stops, finish any words the clock missed
const HOLD_MS = 2200; // how long the last words stay after she stops

export default function LiveCaption({ text, audioRef, speaking, placeholder = "", className = "" }) {
  const ref = useRef(null);
  const words = useMemo(() => noEmDash(text).split(/\s+/).filter(Boolean), [text]);
  // Character offset where each word starts.
  const starts = useMemo(() => {
    let n = 0;
    return words.map((w) => {
      const s = n;
      n += w.length + 1;
      return s;
    });
  }, [words]);
  const [shown, setShown] = useState(0);
  const [cleared, setCleared] = useState(false);
  const speakingRef = useRef(speaking);
  speakingRef.current = speaking;

  // Run the clock on the window this caption lives in (it may be the
  // Picture-in-Picture window while the page's tab is in the background).
  useEffect(() => {
    setShown(0);
    setCleared(false);
    if (!words.length) return;
    const win = ref.current?.ownerDocument?.defaultView || window;
    let spoken = 0;
    let heard = false;
    let last = win.performance.now();
    let raf;
    const tick = (now) => {
      const dt = Math.min(100, now - last);
      last = now;
      const { audible, cps = 15 } = audioRef?.current?.() || {};
      if (audible) {
        heard = true;
        spoken += (dt * cps) / 1000;
      } else if (heard && !speakingRef.current) {
        spoken += (dt * FLUSH_CPS) / 1000;
      }
      let n = 0;
      while (n < starts.length && starts[n] < spoken) n++;
      setShown((s) => (s === n ? s : n));
      if (n < words.length) raf = win.requestAnimationFrame(tick);
    };
    raf = win.requestAnimationFrame(tick);
    return () => win.cancelAnimationFrame(raf);
  }, [text, words, starts, audioRef]);

  useEffect(() => {
    if (!words.length || shown < words.length || speaking) return;
    const win = ref.current?.ownerDocument?.defaultView || window;
    const id = win.setTimeout(() => setCleared(true), HOLD_MS);
    return () => win.clearTimeout(id);
  }, [shown, words.length, speaking]);

  const groupStart = Math.floor(Math.max(0, shown - 1) / GROUP) * GROUP;
  const visible = cleared ? [] : words.slice(groupStart, shown);

  return (
    <div ref={ref} className={`flex items-center justify-center text-center ${className}`}>
      {visible.length ? (
        <p key={`${text}-${groupStart}`} className="leading-snug">
          {visible.map((w, i) => (
            <span key={i} className="word-in mr-[0.28em] inline-block last:mr-0">
              {w}
            </span>
          ))}
        </p>
      ) : (
        placeholder && <p className="word-in text-muted-foreground">{placeholder}</p>
      )}
    </div>
  );
}
