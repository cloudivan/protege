// Voice visualizer: round bars that stretch from the middle with the voice.
// `sampleRef.current()` returns { mode: "speaking" | "listening" | "idle", freq }
// where freq is the SDK's byte frequency array (1024 bins, 100 Hz to 8 kHz).
// At rest the bars are dots; with voice they stretch into pills.
// Color: the --signal token (bright orange) marks her voice.
import { useEffect, useRef } from "react";

const BARS = 5;
const SPEECH_BINS = 320; // roughly 100 Hz to 2.5 kHz, where speech energy sits
const MIN = 0.2; // resting height as a share of the box: a dot (bar width)

export default function VoiceBars({ sampleRef, className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const win = root.ownerDocument.defaultView;
    const bars = Array.from(root.children);
    const center = (BARS - 1) / 2;
    const levels = new Array(BARS).fill(MIN);
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

      // Band k feeds the bars k steps from the middle: low (strongest)
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
      const gain = mode === "speaking" ? 1 : 0.45;

      for (let i = 0; i < BARS; i++) {
        const k = Math.abs(i - center);
        const d = k / center; // 0 in the middle, 1 at the edges
        const envelope = 1 - 0.55 * d * d; // the middle stands tallest
        let target;
        if (level > 0.005) {
          const shape = 0.7 + 0.3 * Math.min(1, bands[k] / peak);
          target = MIN + (1 - MIN) * norm * envelope * shape * gain;
        } else if (mode === "speaking") {
          // Levels not readable: still show her talking.
          target = MIN + 0.5 * envelope * (0.5 + 0.5 * Math.sin(t / 110 + d * 2.6));
        } else {
          // Idle: dots that breathe slowly so the icon still feels alive.
          target = MIN + 0.06 * envelope * (1 + Math.sin(t / 650 - d * 2.2));
        }
        // Fast attack, soft release.
        levels[i] += (target - levels[i]) * (target > levels[i] ? 0.5 : 0.18);
        bars[i].style.height = `${Math.min(100, levels[i] * 100).toFixed(1)}%`;
      }
      raf = win.requestAnimationFrame(tick);
    };

    raf = win.requestAnimationFrame(tick);
    return () => win.cancelAnimationFrame(raf);
  }, [sampleRef]);

  return (
    <div ref={ref} data-mode="idle" className={`group flex items-center justify-center gap-[9%] ${className}`} aria-hidden="true">
      {Array.from({ length: BARS }, (_, i) => (
        <span
          key={i}
          className="w-[13%] rounded-full bg-[hsl(var(--signal))] transition-colors duration-300 group-data-[mode=idle]:bg-foreground/40 group-data-[mode=listening]:bg-foreground/70"
          style={{ height: `${MIN * 100}%` }}
        />
      ))}
    </div>
  );
}
