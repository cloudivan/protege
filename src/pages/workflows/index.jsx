// Explore workflows: every workflow in the system, tagged by the senior doctor
// who taught it. Search and filter by author; "Learn workflow" opens the
// practice (Teach); workflows still being recorded continue on the Learn page.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, GraduationCap, Mic, Plus, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/utils";
import { Loader } from "@/components/ui/Loader";

const ALL = "__all__";
const DEMO_OID = "000000000000000000000de0"; // services/demoWorkflow.js

function WorkflowCard({ w }) {
  return (
    <li className="card flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {w.author && (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 font-medium">
            <UserRound className="h-3 w-3" /> {w.author}
          </span>
        )}
        {w.simulated && (
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-primary" title="Simulated senior doctor and fictional patients">
            {w._id === DEMO_OID ? "Demo" : "Sample"}
          </span>
        )}
        <span className={`ml-auto rounded-full px-2.5 py-0.5 ${w.ready ? "bg-success-500/10 text-success-700" : "bg-muted text-muted-foreground"}`}>
          {w.ready ? "Ready to learn" : "Being recorded"}
        </span>
      </div>
      <div>
        <Link href={`/workflows/${w._id}`} className="text-lg font-semibold leading-snug hover:underline">{w.title}</Link>
        {(w.domain || w.useCase) && <p className="m-0 mt-1 line-clamp-2 text-sm text-muted-foreground">{w.domain || w.useCase}</p>}
      </div>
      {w.map && (
        <p className="m-0 font-mono text-xs text-muted-foreground">
          {w.map.steps} steps · {w.map.judgmentCalls} judgment calls · {w.map.guardrails} rules
        </p>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {w.ready ? (
          <Link href={`/workflows/${w._id}/teach`} className="btn btn-primary gap-2">
            <GraduationCap className="h-4 w-4" /> Learn workflow
          </Link>
        ) : (
          <Link href={`/workflows/${w._id}/learn`} className="btn btn-secondary gap-2">
            <Mic className="h-4 w-4" /> Continue recording
          </Link>
        )}
        <Link href={`/workflows/${w._id}`} className="ml-auto inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          Overview <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </li>
  );
}

export default function Workflows() {
  const [workflows, setWorkflows] = useState(null);
  const [query, setQuery] = useState("");
  const [author, setAuthor] = useState(ALL);

  useEffect(() => {
    api("/api/workflows")
      .then((d) => setWorkflows(d.workflows))
      .catch((e) => {
        toast.error(e.message);
        setWorkflows([]);
      });
  }, []);

  // Author tags with counts, from the workflows themselves.
  const authors = useMemo(() => {
    const counts = new Map();
    for (const w of workflows || []) if (w.author) counts.set(w.author, (counts.get(w.author) || 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [workflows]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (workflows || []).filter(
      (w) =>
        (author === ALL || w.author === author) &&
        (!q || [w.title, w.domain, w.useCase, w.author].some((x) => x?.toLowerCase().includes(q))),
    );
  }, [workflows, query, author]);

  const chip = (active) =>
    `rounded-full border px-3 py-1 text-sm transition-colors ${active ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:border-foreground"}`;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 text-4xl font-semibold tracking-tight">Workflows</h1>
          <p className="mt-1 text-muted-foreground">Clinical workflows taught by senior doctors. Pick one to learn it.</p>
        </div>
        <Link href="/workflows/new" className="btn btn-primary gap-2">
          <Plus className="h-4 w-4" /> Create workflow
        </Link>
      </div>

      {!workflows ? (
        <div className="mt-16 flex justify-center"><Loader /></div>
      ) : workflows.length === 0 ? (
        <Link
          href="/workflows/new"
          className="mt-10 flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border px-6 py-16 text-center transition-colors hover:border-foreground/30 hover:bg-card"
        >
          <span className="text-xl font-semibold">No workflows yet</span>
          <span className="text-muted-foreground">Create the first one: a senior doctor shows it once, Protégé learns it.</span>
        </Link>
      ) : (
        <>
          <div className="mt-8 flex flex-col gap-4">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search workflows, topics or doctors"
                className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm focus:border-foreground focus:outline-none focus:ring-0"
              />
            </label>
            {authors.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Authors:</span>
                <button type="button" className={chip(author === ALL)} onClick={() => setAuthor(ALL)}>
                  All ({workflows.length})
                </button>
                {authors.map(([name, n]) => (
                  <button key={name} type="button" className={chip(author === name)} onClick={() => setAuthor(name)}>
                    {name} ({n})
                  </button>
                ))}
              </div>
            )}
          </div>

          {shown.length === 0 ? (
            <p className="mt-10 text-center text-muted-foreground">No workflow matches. Try another search or create it.</p>
          ) : (
            <ul className="m-0 mt-6 grid list-none gap-4 p-0 sm:grid-cols-2">
              {shown.map((w) => <WorkflowCard key={w._id} w={w} />)}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
