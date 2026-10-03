// Voice visualizer: vertical bars that rise from the middle with the voice.
// `sampleRef.current()` returns { mode: "speaking" | "listening" | "idle", freq }
// where freq is the SDK's byte frequency array (1024 bins, 100 Hz to 8 kHz).
//
// Bars are animated straight on the DOM from the requestAnimationFrame of the
// window that holds them, so they keep moving inside the Picture-in-Picture
// window while the page's own tab is in the background.
import { useEffect, useRef } from "react";

const BARS = 9;
const SPEECH_BINS = 320; // roughly 100 Hz to 2.5 kHz, where speech energy sits

export default function VoiceBars({ sampleRef, className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const win = root.ownerDocument.defaultView;
    const bars = Array.from(root.children);
    const center = (BARS - 1) / 2;
    const levels = new Array(BARS).fill(0.12);
    const bands = new Array(center + 1).fill(0);
    let peak = 0.2; // running loudness peak, so quiet audio still fills the bars
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

      // Band k feeds the bars k steps away from the middle: low (strongest)
      // frequencies in the middle, higher ones toward the edges.
      let level = 0;
      if (freq?.length && mode !== "idle") {
        const per = Math.floor(Math.min(SPEECH_BINS, freq.length) / bands.length);
        for (let k = 0; k < bands.length; k++) {
          let sum = 0;
          for (let j = k * per; j < (k + 1) * per; j++) sum += freq[j];
          bands[k] = sum / per / 255;
        }
        level = bands.reduce((a, b) => a + b, 0) / bands.length;
        peak = Math.max(peak * 0.996, level, 0.08);
      }
      const norm = Math.min(1, level / peak);
      const gain = mode === "speaking" ? 1 : 0.5;

      for (let i = 0; i < BARS; i++) {
        const k = Math.abs(i - center);
        const d = k / center; // 0 in the middle, 1 at the edges
        const envelope = 1 - 0.6 * d * d; // the middle stands tallest
        let target;
        if (mode === "speaking" && level < 0.01) {
          // Audio levels not readable: still show her talking.
          target = 0.2 + 0.55 * envelope * (0.5 + 0.5 * Math.sin(t / 110 + d * 2.6));
        } else if (level > 0) {
          const shape = 0.65 + 0.35 * Math.min(1, bands[k] / peak);
          target = 0.12 + 0.88 * norm * envelope * shape * gain;
        } else {
          // Idle: a slow breathing wave so the icon still feels alive.
          target = 0.12 + 0.07 * envelope * (1 + Math.sin(t / 650 - d * 2.2));
        }
        // Fast attack, soft release.
        levels[i] += (target - levels[i]) * (target > levels[i] ? 0.5 : 0.16);
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
