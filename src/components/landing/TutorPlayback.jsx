// Landing hero: the tutor catching a mistake, played out like a live call.
// Bubbles arrive one by one, her bars light up while she "speaks", and the
// guardrail lands with a check. Loops. Reduced motion shows the end state.
//
// The lines are not hard-coded: they come from the generated demo
// (workflow.playback, built from its verified Work Map). Without a demo the
// card shows the tutor listening and no lines.
import { useEffect, useState } from "react";
import { Check } from "lucide-react";

// Reading time per line, from its length.
const msFor = (text) => Math.min(4200, Math.max(1500, text.length * 45));
const CAUGHT_MS = 3400; // how long the finished scene stays before it loops
const LEAD_MS = 700; // a beat of silence before each line

const BAR_HEIGHTS = [16, 40, 64, 36, 16];

export default function TutorPlayback({ lines = [], expertName }) {
  const SCRIPT = lines.map((l) => ({ ...l, ms: msFor(l.text) }));
  // step = how many lines are on screen; SCRIPT.length + 1 = guardrail shown
  const [step, setStep] = useState(SCRIPT.length + 1);
  const [talking, setTalking] = useState(false);

  useEffect(() => {
    if (!SCRIPT.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let alive = true;
    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(() => alive && fn(), ms));

    const run = () => {
      let t = 0;
      setStep(0);
      setTalking(false);
      SCRIPT.forEach((line, i) => {
        t += LEAD_MS;
        at(t, () => {
          setStep(i + 1);
          setTalking(line.from === "tutor");
        });
        t += line.ms;
        at(t, () => setTalking(false));
      });
      at(t + 300, () => setStep(SCRIPT.length + 1));
      at(t + 300 + CAUGHT_MS, run);
    };
    run();
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, [lines]); // eslint-disable-line react-hooks/exhaustive-deps

  const caught = SCRIPT.length > 0 && step > SCRIPT.length;

  return (
    <section
      aria-label="The tutor coaching a junior doctor"
      className="flex flex-col gap-5 rounded-3xl bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_24px_48px_-16px_rgba(15,23,42,0.18)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col">
          <strong className="text-[17px] font-semibold">Protégé Voice Tutor</strong>
          <span className="text-sm text-[#475569]">{expertName ? `Coaching in ${expertName}'s words` : "Coaching in the senior doctor's words"}</span>
        </div>
        <span className="inline-flex items-center gap-2 font-mono text-xs text-[#475569]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-400" />
          </span>
          Live
        </span>
      </div>

      <div aria-hidden="true" className="flex h-16 items-center justify-center gap-2">
        {BAR_HEIGHTS.map((h, i) => (
          <span
            key={i}
            className={`w-3 rounded-full bg-primary-400 transition-[height] duration-300 ${talking ? "playback-talk" : "landing-bar"}`}
            style={{ height: talking ? h : Math.max(12, h * 0.45), animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>

      <div className="flex min-h-[188px] flex-col justify-end gap-2.5 text-[15px] leading-snug">
        {SCRIPT.slice(0, Math.min(step, SCRIPT.length)).map((line, i) => (
          <p
            key={i}
            className={`playback-in m-0 rounded-2xl px-4 py-3 ${
              line.from === "tutor" ? "max-w-[85%] bg-[#F1F5F9]" : "max-w-[70%] self-end bg-[#0F172A] text-white"
            }`}
          >
            {line.text}
          </p>
        ))}
      </div>

      <div
        className={`flex items-center gap-3 rounded-2xl border-[1.5px] border-dashed px-4 py-3.5 transition-all duration-500 ${
          caught ? "border-primary-400 bg-primary-50" : "border-[#E2E8F0] bg-transparent"
        }`}
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-500 ${
            caught ? "playback-pop bg-primary-400 text-white" : "bg-[#E2E8F0] text-transparent"
          }`}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
        <span className={`text-sm font-medium transition-colors duration-500 ${caught ? "text-[#0F172A]" : "text-[#94A3B8]"}`}>
          {caught ? "Guardrail caught before saving" : "Watching for guardrails…"}
        </span>
      </div>
    </section>
  );
}
