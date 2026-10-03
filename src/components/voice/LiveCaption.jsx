// The agent's latest line as short subtitles: a few words at a time, each
// group replacing the last, no animation. Words follow her actual voice: a
// character clock runs while her audio is audible, at her speech rate, so
// pauses in her speech pause the words too. If her line arrives after she already started talking,
// the clock starts where her voice is, not at zero.
//
// `audioRef.current()` returns { audible, since, cps }: whether her voice is
// audible, when this stretch of speech started (performance.now() ms), and
// her speech rate in characters per second.
import { useEffect, useMemo, useRef, useState } from "react";
import { noEmDash } from "@/lib/utils";

const GROUP = 4; // words on screen at once
const FLUSH_AFTER_MS = 900; // she went quiet this long: show what is left
const FLUSH_CPS = 60;
const HOLD_MS = 2200; // how long the last words stay

export default function LiveCaption({ text, audioRef, placeholder = "", className = "" }) {
  // Voice tags such as [happy] steer her tone; they are not meant to be read.
  const words = useMemo(() => noEmDash(text).replace(/\[[^\]]*\]/g, " ").split(/\s+/).filter(Boolean), [text]);
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
  const audio = useRef(audioRef);
  audio.current = audioRef;

  useEffect(() => {
    setShown(0);
    setCleared(false);
    if (!words.length) return;
    const read = () => audio.current?.current?.() || {};
    let last = performance.now();
    let spoken = 0;
    let heard = false;
    let quietFor = 0;
    const first = read();
    if (first.audible && first.since) {
      spoken = ((last - first.since) * (first.cps || 16)) / 1000;
      heard = true;
    }
    let raf;
    const tick = (now) => {
      const dt = Math.min(100, now - last);
      last = now;
      const { audible, cps = 16 } = read();
      if (audible) {
        heard = true;
        quietFor = 0;
        spoken += (dt * cps) / 1000;
      } else if (heard) {
        quietFor += dt;
        if (quietFor > FLUSH_AFTER_MS) spoken += (dt * FLUSH_CPS) / 1000;
      }
      let n = 0;
      while (n < starts.length && starts[n] < spoken) n++;
      setShown((s) => (s === n ? s : n));
      if (n < words.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [words, starts]);

  useEffect(() => {
    if (!words.length || shown < words.length) return;
    const id = setTimeout(() => setCleared(true), HOLD_MS);
    return () => clearTimeout(id);
  }, [shown, words.length]);

  const groupStart = Math.floor(Math.max(0, shown - 1) / GROUP) * GROUP;
  const visible = cleared ? [] : words.slice(groupStart, shown);

  return (
    <div className={`flex items-center justify-center text-center ${className}`}>
      {visible.length ? (
        <p className="leading-snug">{visible.join(" ")}</p>
      ) : (
        placeholder && <p className="text-muted-foreground">{placeholder}</p>
      )}
    </div>
  );
}
