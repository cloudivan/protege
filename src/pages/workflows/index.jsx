import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/utils";
import { Loader } from "@/components/ui/Loader";
import { STAGES, stagesDone } from "@/components/ui/StageRail";

// Three dots, one per stage: done in ink, the next one in orange.
function ProgressDots({ done }) {
  return (
    <span className="flex items-center gap-1" aria-label={`${done} of ${STAGES.length} stages done`}>
      {STAGES.map((s, i) => (
        <span
          key={s.key}
          className={`h-1.5 w-5 rounded-full ${i < done ? "bg-foreground" : i === done ? "bg-primary-400" : "bg-border"}`}
        />
      ))}
    </span>
  );
}

export default function Workflows() {
  const [workflows, setWorkflows] = useState(null);
  useEffect(() => {
    api("/api/workflows")
      .then((d) => setWorkflows(d.workflows))
      .catch((e) => {
        toast.error(e.message);
        setWorkflows([]);
      });
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 text-4xl font-semibold tracking-tight">Workflows</h1>
          <p className="mt-1 text-muted-foreground">Each one is a job Protégé learned from an expert.</p>
        </div>
        <Link href="/workflows/new" className="btn btn-primary gap-2">
          <Plus className="h-4 w-4" /> New workflow
        </Link>
      </div>

      {!workflows ? (
        <div className="mt-16 flex justify-center"><Loader /></div>
      ) : workflows.length === 0 ? (
        <Link
          href="/workflows/new"
          className="mt-10 flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border px-6 py-16 text-center transition-colors hover:border-foreground/30 hover:bg-card"
        >
          <span className="text-xl font-semibold">Teach Protégé its first job</span>
          <span className="text-muted-foreground">Pick an expert and a task. It takes one session.</span>
        </Link>
      ) : (
        <ul className="card mt-8 divide-y divide-border overflow-hidden p-0">
          {workflows.map((w) => {
            const done = stagesDone(w, Boolean(w.workMapId));
            return (
              <li key={w._id}>
                <Link
                  href={`/workflows/${w._id}`}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/60"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{w.title}</span>
                    {w.expertName && <span className="text-sm text-muted-foreground">with {w.expertName}</span>}
                  </span>
                  <ProgressDots done={done} />
                  <ArrowRight className="h-4 w-4 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
