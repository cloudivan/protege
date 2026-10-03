// The agent's latest line, revealed word by word at roughly speaking pace.
// Older lines scroll up and fade out at the top edge.
import { useEffect, useMemo, useRef, useState } from "react";
import { noEmDash } from "@/lib/utils";

const WORD_MS = 330; // about 180 words per minute, close to her speech
const CATCH_UP_MS = 40; // once she stops talking, show the rest quickly

export default function LiveCaption({ text, speaking, className = "" }) {
  const ref = useRef(null);
  const words = useMemo(() => noEmDash(text).split(/\s+/).filter(Boolean), [text]);
  const [shown, setShown] = useState(0);

  useEffect(() => setShown(0), [text]);

  useEffect(() => {
    if (shown >= words.length) return;
    // Use the timer of the window this caption lives in (it may be the
    // Picture-in-Picture window while the page's tab is in the background).
    const win = ref.current?.ownerDocument?.defaultView || window;
    const id = win.setTimeout(() => setShown((n) => n + 1), speaking ? WORD_MS : CATCH_UP_MS);
    return () => win.clearTimeout(id);
  }, [shown, words.length, speaking]);

  return (
    <div ref={ref} className={`caption-fade flex flex-col justify-end overflow-hidden ${className}`}>
      <p className="text-center leading-snug">
        {words.slice(0, shown).map((w, i) => (
          <span key={`${text}-${i}`} className="word-in mr-[0.28em] inline-block">
            {w}
          </span>
        ))}
      </p>
    </div>
  );
}
