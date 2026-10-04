// Where a workflow stands: Capture, Map, Teach. Finished stages get a check,
// the current one pulses, the next one is a plain number. Each is a link.
import Link from "next/link";
import { Check } from "lucide-react";

export const STAGES = [
  { key: "capture", label: "Capture", path: "capture", hint: "The senior doctor works, Protégé asks why" },
  { key: "debrief", label: "Map", path: "debrief", hint: "A short debrief turns answers into a Work Map" },
  { key: "teach", label: "Teach", path: "teach", hint: "Junior doctors practice a case with the tutor" },
];

// How many stages a workflow has finished, from its status and Work Map.
export function stagesDone(workflow, hasMap) {
  const status = workflow?.status;
  if (hasMap || status === "mapped" || status === "teaching") return 2;
  if (status === "debriefing") return 1;
  return 0;
}

export default function StageRail({ workflowId, current, done = 0, className = "" }) {
  return (
    <nav aria-label="Workflow stages" className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {STAGES.map((stage, i) => {
        const isDone = i < done;
        const isCurrent = stage.key === current;
        return (
          <div key={stage.key} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true" className={`h-px w-6 ${i <= done ? "bg-foreground" : "bg-border"}`} />}
            <Link
              href={`/workflows/${workflowId}/${stage.path}`}
              aria-current={isCurrent ? "step" : undefined}
              title={stage.hint}
              className={`group flex min-h-[36px] items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm transition-colors ${
                isCurrent ? "bg-card font-medium shadow-sm ring-1 ring-border" : "text-muted-foreground hover:bg-card hover:text-foreground"
              }`}
            >
              <span
                className={`relative flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  isDone ? "bg-foreground text-background" : isCurrent ? "bg-primary-400 text-white" : "border border-border bg-card"
                }`}
              >
                {isCurrent && !isDone && <span className="absolute inset-0 animate-ping rounded-full bg-primary-400 opacity-30" />}
                {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
              </span>
              {stage.label}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
