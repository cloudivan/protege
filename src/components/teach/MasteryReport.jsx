// Module 3 end screen: what the new hire mastered and what to practice next.
// TODO(teach): fill from session.mastery (set by the tutor's finish_lesson tool)
// and session.interventions.
import { CheckCircle2, RotateCcw } from "lucide-react";

export default function MasteryReport({ mastery, interventions = [] }) {
  if (!mastery && !interventions.length) return null;
  return (
    <section className="card p-5">
      <h2 className="font-semibold">Lesson summary</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 text-sm">
        <div>
          <h3 className="mb-1 flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4 text-success-500" /> Mastered</h3>
          <ul className="list-disc pl-5">{(mastery?.mastered || []).map((m, i) => <li key={i}>{m}</li>)}</ul>
        </div>
        <div>
          <h3 className="mb-1 flex items-center gap-2 font-medium"><RotateCcw className="h-4 w-4 text-warning-500" /> Practice next</h3>
          <ul className="list-disc pl-5">{(mastery?.practice || []).map((m, i) => <li key={i}>{m}</li>)}</ul>
        </div>
      </div>
      {interventions.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">Tutor stepped in {interventions.length} time(s) before a guardrail was broken.</p>
      )}
    </section>
  );
}
