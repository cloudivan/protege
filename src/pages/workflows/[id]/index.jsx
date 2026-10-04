import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/utils";
import { Loader } from "@/components/ui/Loader";
import StageRail, { STAGES, stagesDone } from "@/components/ui/StageRail";
import WorkMapTimeline from "@/components/map/WorkMapTimeline";

export default function WorkflowOverview() {
  const { query } = useRouter();
  const [data, setData] = useState(null);
  useEffect(() => {
    if (query.id) api(`/api/workflows/${query.id}`).then(setData).catch((e) => toast.error(e.message));
  }, [query.id]);
  if (!data) return <div className="mt-16 flex justify-center"><Loader /></div>;
  const { workflow, sessions, workMap } = data;
  const base = `/workflows/${workflow._id}`;
  const done = stagesDone(workflow, Boolean(workMap));
  // One clear next action: the first stage not done yet (Teach once mapped).
  const next = STAGES[Math.min(done, STAGES.length - 1)];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="m-0 text-4xl font-semibold tracking-tight">{workflow.title}</h1>
      <p className="mt-1 text-muted-foreground">
        {workflow.expertName ? `With ${workflow.expertName}` : "No expert named"} · {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
      </p>

      <StageRail workflowId={workflow._id} current={next.key} done={done} className="mt-6" />

      <Link
        href={`${base}/${next.path}`}
        className="group mt-6 flex items-center justify-between gap-4 rounded-2xl bg-foreground px-6 py-5 text-background transition-transform active:scale-[0.99]"
      >
        <span>
          <span className="block font-mono text-xs uppercase tracking-widest opacity-60">Next up</span>
          <span className="mt-1 block text-xl font-semibold">{next.label}</span>
          <span className="block text-sm opacity-70">{next.hint}</span>
        </span>
        <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
      </Link>

      <h2 className="mb-4 mt-12 text-xl font-semibold">Work Map</h2>
      <WorkMapTimeline workMap={workMap} />
    </div>
  );
}
