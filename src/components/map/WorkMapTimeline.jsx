// Module 2 output: the clickable Work Map. Every step shows the screen moment,
// the decision, the reason in the expert's words and its guardrails.
import { useState } from "react";
import { ShieldAlert, Quote, Scale } from "lucide-react";
import { fmtAt, noEmDash } from "@/lib/utils";

const KIND_LABEL = { limit: "Limit", exception: "Exception", stop_and_ask: "Stop and ask", never: "Never" };

function StepCard({ step, open, onToggle, onReplay }) {
  return (
    <li className="card">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-left">
        <span className="font-mono text-xs text-muted-foreground">{fmtAt(step.moment?.at)}</span>
        <span className="font-medium">{step.index}. {step.title}</span>
        {step.isJudgmentCall && (
          <span className="ml-auto flex items-center gap-1 text-xs text-warning-600"><Scale className="h-3 w-3" /> Judgment call</span>
        )}
      </button>
      {open && (
        <div className="space-y-3 border-t border-border p-4 text-sm">
          {step.moment?.frameKey && (
            <button type="button" onClick={() => onReplay?.(step)} className="block w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/${step.moment.frameKey}`} alt={step.moment.label || "Screen moment"} className="w-full border border-border" />
            </button>
          )}
          {step.decision && <p><span className="text-muted-foreground">Decision: </span>{step.decision}</p>}
          {step.reason?.text && (
            <p className="flex gap-2"><Quote className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-400" /><span>&ldquo;{noEmDash(step.reason.text)}&rdquo;</span></p>
          )}
          {step.guardrails?.length > 0 && (
            <ul className="space-y-1">
              {step.guardrails.map((g, i) => (
                <li key={i} className="flex gap-2">
                  <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-error-500" />
                  <span><strong>{KIND_LABEL[g.kind] || "Guardrail"}:</strong> {g.rule}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

export default function WorkMapTimeline({ workMap, onReplay }) {
  const [openIdx, setOpenIdx] = useState(null);
  if (!workMap?.steps?.length) return <p className="text-sm text-muted-foreground">No Work Map yet.</p>;
  const judgment = workMap.steps.filter((s) => s.isJudgmentCall).length;
  const guardrails = workMap.steps.reduce((n, s) => n + (s.guardrails?.length || 0), 0);
  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">
        {workMap.steps.length} steps · {judgment} judgment calls · {guardrails} guardrails · v{workMap.version}
      </p>
      <ol className="space-y-2">
        {workMap.steps.map((s) => (
          <StepCard key={s.index} step={s} open={openIdx === s.index} onToggle={() => setOpenIdx(openIdx === s.index ? null : s.index)} onReplay={onReplay} />
        ))}
      </ol>
    </div>
  );
}
