// The agent's latest line as short subtitles: a few words at a time, each
// group replacing the last, revealed word by word at roughly speaking pace.
// Clears itself a moment after she stops talking.
import { useEffect, useMemo, useRef, useState } from "react";
import { noEmDash } from "@/lib/utils";

const GROUP = 4; // words on screen at once
const WORD_MS = 330; // about 180 words per minute, close to her speech
const CATCH_UP_MS = 120; // once she stops talking, finish the line quicker
const HOLD_MS = 2200; // how long the last words stay after she stops

export default function LiveCaption({ text, speaking, placeholder = "", className = "" }) {
  const ref = useRef(null);
  const words = useMemo(() => noEmDash(text).split(/\s+/).filter(Boolean), [text]);
  const [shown, setShown] = useState(0);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    setShown(0);
    setCleared(false);
  }, [text]);

  // Use the timers of the window this caption lives in (it may be the
  // Picture-in-Picture window while the page's tab is in the background).
  const win = () => ref.current?.ownerDocument?.defaultView || window;

  useEffect(() => {
    if (shown >= words.length) return;
    const w = win();
    const id = w.setTimeout(() => setShown((n) => n + 1), speaking ? WORD_MS : CATCH_UP_MS);
    return () => w.clearTimeout(id);
  }, [shown, words.length, speaking]);

  useEffect(() => {
    if (!words.length || shown < words.length || speaking) return;
    const w = win();
    const id = w.setTimeout(() => setCleared(true), HOLD_MS);
    return () => w.clearTimeout(id);
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
