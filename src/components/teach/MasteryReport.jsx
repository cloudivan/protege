// Module 3 end screen: what the new hire mastered and what to practice next.
// mastery comes from the tutor's finish_lesson tool (or the summary fallback in
// /api/sessions/[id]/mastery); interventions are the tutor's catches.
import { CheckCircle2, RotateCcw, ShieldAlert } from "lucide-react";

const OUTCOME_LABEL = { caught: "Caught before saving", corrected: "Fixed by the new hire", missed: "Missed" };

export default function MasteryReport({ mastery, interventions = [] }) {
  if (!mastery) return null;
  return (
    <section className="card p-5">
      <h2 className="font-semibold">Lesson summary</h2>
      <div className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <h3 className="mb-1 flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4 text-success-500" /> Mastered</h3>
          <ul className="list-disc pl-5">{(mastery.mastered || []).map((m, i) => <li key={i}>{m}</li>)}</ul>
        </div>
        <div>
          <h3 className="mb-1 flex items-center gap-2 font-medium"><RotateCcw className="h-4 w-4 text-warning-500" /> Practice next</h3>
          <ul className="list-disc pl-5">{(mastery.practice || []).map((m, i) => <li key={i}>{m}</li>)}</ul>
        </div>
      </div>
      {interventions.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
          {interventions.map((x, i) => (
            <li key={i} className="flex gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-error-500" />
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
