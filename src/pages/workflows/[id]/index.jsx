import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Eye, Map, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/utils";
import { Loader } from "@/components/ui/Loader";
import WorkMapTimeline from "@/components/map/WorkMapTimeline";

export default function WorkflowOverview() {
  const { query } = useRouter();
  const [data, setData] = useState(null);
  useEffect(() => {
    if (query.id) api(`/api/workflows/${query.id}`).then(setData).catch((e) => toast.error(e.message));
  }, [query.id]);
  if (!data) return <div className="mt-10 flex justify-center"><Loader /></div>;
  const { workflow, sessions, workMap } = data;
  const base = `/workflows/${workflow._id}`;

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <h1 className="font-display text-2xl font-bold">{workflow.title}</h1>
      <p className="text-sm text-muted-foreground">{workflow.expertName} · {workflow.status} · {sessions.length} session(s)</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Link href={`${base}/capture`} className="card flex items-center gap-3 p-4 hover:bg-muted/50"><Eye className="h-5 w-5 text-primary-400" /> 1. Capture</Link>
        <Link href={`${base}/debrief`} className="card flex items-center gap-3 p-4 hover:bg-muted/50"><Map className="h-5 w-5 text-primary-400" /> 2. Debrief + Map</Link>
        <Link href={`${base}/teach`} className="card flex items-center gap-3 p-4 hover:bg-muted/50"><GraduationCap className="h-5 w-5 text-primary-400" /> 3. Teach</Link>
      </div>
      <h2 className="mt-10 mb-3 font-semibold">Work Map</h2>
      <WorkMapTimeline workMap={workMap} />
    </div>
  );
}
