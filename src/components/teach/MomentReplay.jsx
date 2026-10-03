// Module 3: replay the expert's screen moment for a Work Map step, with the
// decision, the reason in the expert's words and the guardrails. Opened by the
// tutor's replay_moment tool or from the alert banner.
import { useEffect } from "react";
import { Quote, ShieldAlert, X } from "lucide-react";
import { fmtAt, noEmDash } from "@/lib/utils";

export default function MomentReplay({ step, expertName = "the expert", onClose }) {
  useEffect(() => {
    if (!step) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, onClose]);

  if (!step) return null;
  const moment = step.moment || {};
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="card w-full max-w-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {expertName}&apos;s screen moment · {fmtAt(moment.at)}
            </p>
            <h2 className="font-semibold">Step {step.index}: {step.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="btn btn-secondary" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>

        {moment.frameKey ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/${moment.frameKey}`} alt={moment.label || "Screen moment"} className="mt-4 w-full border border-border" />
        ) : (
          <div className="mt-4 border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
            {moment.label || "No frame stored for this step yet."}
          </div>
        )}

        <div className="mt-4 space-y-3 text-sm">
          {step.decision && <p><span className="text-muted-foreground">Decision: </span>{step.decision}</p>}
          {step.reason?.text && (
            <p className="flex gap-2">
              <Quote className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-400" />
              <span>&ldquo;{noEmDash(step.reason.text)}&rdquo; <span className="text-muted-foreground">{expertName}</span></span>
            </p>
          )}
          {step.guardrails?.map((g, i) => (
            <p key={i} className="flex gap-2"><ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-error-500" />{g.rule}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
