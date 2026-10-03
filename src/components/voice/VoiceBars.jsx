// Voice visualizer: vertical bars that rise from the middle with the voice.
// `sampleRef.current()` returns { mode: "speaking" | "listening" | "idle", freq }
// where freq is a byte frequency array from the voice SDK.
//
// Bars are animated straight on the DOM from the requestAnimationFrame of the
// window that holds them, so they keep moving inside the Picture-in-Picture
// window while the page's own tab is in the background.
import { useEffect, useRef } from "react";

const BARS = 9;

export default function VoiceBars({ sampleRef, className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const win = root.ownerDocument.defaultView;
    const bars = Array.from(root.children);
    const levels = new Array(BARS).fill(0.12);
    const center = (BARS - 1) / 2;
    let raf;

    const tick = (t) => {
      let sample = {};
      try {
        sample = sampleRef.current?.() || {};
      } catch {
        sample = {};
      }
      const { mode = "idle", freq } = sample;
      if (root.dataset.mode !== mode) root.dataset.mode = mode;
      // Speech lives in the lowest part of the spectrum.
      const voiceBins = freq?.length ? Math.max(8, Math.floor(freq.length * 0.18)) : 0;

      for (let i = 0; i < BARS; i++) {
        const d = Math.abs(i - center) / center; // 0 in the middle, 1 at the edges
        const envelope = 1 - 0.62 * d * d; // the middle stands tallest
        let target;
        if (voiceBins && mode !== "idle") {
          const energy = freq[Math.floor(d * (voiceBins - 1))] / 255;
          target = 0.12 + Math.pow(energy, 1.4) * envelope * (mode === "speaking" ? 1 : 0.55);
        } else {
          // Idle: a slow breathing wave so the icon still feels alive.
          target = 0.12 + 0.07 * envelope * (1 + Math.sin(t / 650 - d * 2.2));
        }
        // Fast attack, soft release.
        levels[i] += (target - levels[i]) * (target > levels[i] ? 0.5 : 0.14);
        bars[i].style.height = `${Math.min(100, levels[i] * 100).toFixed(1)}%`;
      }
      raf = win.requestAnimationFrame(tick);
    };

    raf = win.requestAnimationFrame(tick);
    return () => win.cancelAnimationFrame(raf);
  }, [sampleRef]);

  return (
    <div ref={ref} data-mode="idle" className={`group flex items-center justify-center gap-[6%] ${className}`} aria-hidden="true">
      {Array.from({ length: BARS }, (_, i) => (
        <span
          key={i}
          className="w-[7%] rounded-full bg-primary transition-colors duration-300 group-data-[mode=idle]:bg-primary/40 group-data-[mode=listening]:bg-muted-foreground/60"
          style={{ height: "12%" }}
        />
      ))}
    </div>
  );
}
