// Module 3 end screen: what the junior doctor mastered and what to practice next.
// mastery comes from the tutor's finish_lesson tool (or the summary fallback in
// /api/sessions/[id]/mastery); interventions are the tutor's catches.
// Items pop in one after another, so finishing a lesson feels like a reward.
import { Check, RotateCcw, ShieldAlert } from "lucide-react";

const OUTCOME_LABEL = { caught: "Caught before saving", corrected: "Fixed by the junior doctor", missed: "Missed" };

export default function MasteryReport({ mastery, interventions = [] }) {
  if (!mastery) return null;
  const mastered = mastery.mastered || [];
  const practice = mastery.practice || [];
  return (
    <section className="card overflow-hidden p-0">
      <div className="flex items-center gap-4 bg-foreground px-5 py-5 text-background">
        <span className="playback-pop flex h-11 w-11 items-center justify-center rounded-full bg-primary-400 text-white">
          <Check className="h-5 w-5" strokeWidth={3} />
        </span>
        <div>
          <h2 className="m-0 text-lg font-semibold">Lesson complete</h2>
          <p className="m-0 text-sm opacity-70">
            {mastered.length} mastered · {practice.length} to practice
          </p>
        </div>
      </div>
      <div className="grid gap-5 p-5 text-sm sm:grid-cols-2">
        <div>
          <h3 className="mb-2 mt-0 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mastered</h3>
          <ul className="m-0 list-none space-y-2 p-0">
            {mastered.map((m, i) => (
              <li key={i} className="playback-in flex gap-2" style={{ animationDelay: `${200 + i * 140}ms` }}>
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} /> {m}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 mt-0 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Practice next</h3>
          <ul className="m-0 list-none space-y-2 p-0">
            {practice.map((m, i) => (
              <li key={i} className="playback-in flex gap-2" style={{ animationDelay: `${200 + (mastered.length + i) * 140}ms` }}>
                <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> {m}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {interventions.length > 0 && (
        <ul className="m-0 list-none space-y-1.5 border-t border-border p-5 text-sm">
          {interventions.map((x, i) => (
            <li key={i} className="flex gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                <strong>{OUTCOME_LABEL[x.outcome] || x.outcome}:</strong> step {x.stepIndex}, {x.guardrail}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
