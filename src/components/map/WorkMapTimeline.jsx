// Module 2 output: the clickable Work Map, drawn as a timeline. Every step
// shows the screen moment, the decision, the reason in the expert's words and
// its guardrails. Judgment calls get an orange node.
import { useState } from "react";
import { ChevronDown, ShieldAlert, Quote } from "lucide-react";
import { fmtAt, noEmDash } from "@/lib/utils";

const KIND_LABEL = { limit: "Limit", exception: "Exception", stop_and_ask: "Stop and ask", never: "Never" };

function Step({ step, open, onToggle, onReplay, last }) {
  const judgment = step.isJudgmentCall;
  return (
    <li className="relative pl-10">
      {!last && <span aria-hidden="true" className="absolute left-[13px] top-8 h-[calc(100%-8px)] w-px bg-border" />}
      <span
        aria-hidden="true"
        className={`absolute left-0 top-3 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
          judgment ? "bg-primary-400 text-white" : "border border-border bg-card text-muted-foreground"
        }`}
      >
        {step.index}
      </span>
      <div className={`mb-3 rounded-2xl transition-colors ${open ? "bg-card shadow-sm ring-1 ring-border" : "hover:bg-card/70"}`}>
        <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{step.title || step.decision}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {step.moment?.at != null && <span className="font-mono">{fmtAt(step.moment.at)}</span>}
              {judgment && <span className="font-medium text-primary">Judgment call</span>}
              {step.guardrails?.length > 0 && (
                <span>{step.guardrails.length} {step.guardrails.length === 1 ? "guardrail" : "guardrails"}</span>
              )}
            </span>
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="playback-in space-y-3 px-4 pb-4 text-sm">
            {step.moment?.frameKey && (
              <button type="button" onClick={() => onReplay?.(step)} className="block w-full overflow-hidden rounded-xl border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/${step.moment.frameKey}`} alt={step.moment.label || "Screen moment"} className="w-full" />
              </button>
            )}
            {step.decision && step.title && <p className="m-0"><span className="text-muted-foreground">Decision: </span>{step.decision}</p>}
            {step.reason?.text && (
              <p className="m-0 flex gap-2 text-base">
                <Quote className="mt-1 h-4 w-4 shrink-0 text-primary-400" />
                <span>{noEmDash(step.reason.text)}</span>
              </p>
            )}
            {step.guardrails?.length > 0 && (
              <ul className="m-0 list-none space-y-1.5 p-0">
                {step.guardrails.map((g, i) => (
                  <li key={i} className="flex gap-2 rounded-xl bg-muted px-3 py-2">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span><strong>{KIND_LABEL[g.kind] || "Guardrail"}:</strong> {g.rule}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
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
      <div className="mb-5 flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-card px-3 py-1 ring-1 ring-border">{workMap.steps.length} steps</span>
        <span className="rounded-full bg-primary-50 px-3 py-1 text-primary ring-1 ring-primary-200">{judgment} judgment calls</span>
        <span className="rounded-full bg-card px-3 py-1 ring-1 ring-border">{guardrails} guardrails</span>
      </div>
      <ol className="m-0 list-none p-0">
        {workMap.steps.map((s, i) => (
          <Step
            key={s.index}
            step={s}
            last={i === workMap.steps.length - 1}
            open={openIdx === s.index}
            onToggle={() => setOpenIdx(openIdx === s.index ? null : s.index)}
            onReplay={onReplay}
          />
        ))}
      </ol>
    </div>
  );
}
