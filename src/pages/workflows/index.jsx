// Explore workflows, two ways in one page:
//   - browse: one panel per senior doctor with the workflows they taught
//   - search: type (or press "/") and the panels give way to a results list;
//     arrow keys move, Enter opens the highlighted workflow
// A ready workflow opens the practice (Teach); one still being recorded
// continues on the Learn page.
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowRight, Search } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/utils";
import { Loader } from "@/components/ui/Loader";

const AVATAR_STYLES = ["bg-foreground text-background", "bg-primary-400 text-white", "bg-border text-foreground"];

const hrefFor = (w) => (w.ready ? `/workflows/${w._id}/teach` : `/workflows/${w._id}/learn`);

function initials(name) {
  return name
    .replace(/^dr\.?\s+/i, "")
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// The title with the search match marked.
function Highlight({ text, query }) {
  const i = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-sm bg-primary-100 text-inherit">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  );
}

function DoctorPanel({ name, workflows, style }) {
  return (
    <section className="card flex flex-col gap-5 p-6">
      <div className="flex items-center gap-3.5">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-semibold ${style}`}>
          {initials(name)}
        </span>
        <div className="flex min-w-0 flex-col">
          <strong className="truncate text-lg font-semibold tracking-tight">{name}</strong>
          <span className="text-sm text-muted-foreground">
            {workflows.length} {workflows.length === 1 ? "workflow" : "workflows"}
          </span>
        </div>
      </div>
      <ul className="m-0 list-none p-0">
        {workflows.map((w) => (
          <li key={w._id} className="border-t border-border">
            <Link
              href={hrefFor(w)}
              className={`group flex items-start justify-between gap-3 py-3 text-[15px] leading-snug transition-colors ${w.ready ? "" : "text-muted-foreground"}`}
            >
              <span className="group-hover:text-primary">
                {w.title}
                {!w.ready && <span className="ml-2 text-xs">· Recording</span>}
              </span>
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Results({ results, query, active, setActive }) {
  if (!results.length) {
    return (
      <div className="px-6 py-10 text-center text-muted-foreground">
        No workflow matches.{" "}
        <Link href="/workflows/new" className="font-medium text-foreground underline underline-offset-4">Teach it as a new one</Link>
      </div>
    );
  }
  return (
    <ul className="m-0 flex list-none flex-col gap-0.5 p-2" role="listbox" aria-label="Matching workflows">
      {results.map((w, i) => (
        <li key={w._id} role="option" aria-selected={i === active}>
          <Link
            href={hrefFor(w)}
            onMouseEnter={() => setActive(i)}
            className={`flex items-center gap-4 rounded-xl px-4 py-3.5 transition-colors ${i === active ? "bg-muted" : ""}`}
          >
            <span aria-hidden="true" className="flex h-5 items-center gap-[3px]">
              {[8, 18, 12].map((h, j) => (
                <span key={j} className={`w-1 rounded-full ${i === active ? "bg-primary-400" : "bg-border"}`} style={{ height: h }} />
              ))}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-medium"><Highlight text={w.title} query={query} /></span>
              <span className="text-sm text-muted-foreground">
                {w.author || "Unknown author"}
                {w.map ? ` · ${w.map.steps} steps` : ""}
                {!w.ready && " · Recording"}
              </span>
            </span>
            {i === active && (
              <span className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
                {w.ready ? "Start learning" : "Continue recording"}
                <kbd className="rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-xs">↵</kbd>
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function Workflows() {
  const router = useRouter();
  const searchRef = useRef(null);
  const [workflows, setWorkflows] = useState(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    api("/api/workflows")
      .then((d) => setWorkflows(d.workflows))
      .catch((e) => {
        toast.error(e.message);
        setWorkflows([]);
      });
  }, []);

  // "/" jumps to the search from anywhere on the page.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && document.activeElement !== searchRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Doctors in name order, each with their workflows (ready ones first).
  const doctors = useMemo(() => {
    const byAuthor = new Map();
    for (const w of workflows || []) {
      const name = w.author || "Unknown author";
      if (!byAuthor.has(name)) byAuthor.set(name, []);
      byAuthor.get(name).push(w);
    }
    return [...byAuthor.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, ws]) => [name, [...ws].sort((a, b) => Number(b.ready) - Number(a.ready))]);
  }, [workflows]);

  const q = query.trim();
  const results = useMemo(() => {
    if (!q) return [];
    const ql = q.toLowerCase();
    // Best first: a match in the title, then ready to learn, then the rest.
    const score = (w) => (w.title.toLowerCase().includes(ql) ? 2 : 0) + (w.ready ? 1 : 0);
    return (workflows || [])
      .filter((w) => [w.title, w.domain, w.useCase, w.author].some((x) => x?.toLowerCase().includes(ql)))
      .sort((a, b) => score(b) - score(a));
  }, [workflows, q]);

  useEffect(() => setActive(0), [q]);

  const onSearchKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      router.push(hrefFor(results[active]));
    } else if (e.key === "Escape") {
      setQuery("");
    }
  };

  const ready = (workflows || []).filter((w) => w.ready).length;
  const anySimulated = (workflows || []).some((w) => w.simulated);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex justify-end">
        <Link href="/workflows/new" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          Teach a new workflow
        </Link>
      </div>

      <div className="mx-auto mt-6 flex max-w-3xl flex-col gap-7">
        <h1 className="m-0 text-center text-[clamp(34px,4.6vw,52px)] font-semibold leading-[1.05] tracking-[-0.045em]">
          What do you want to learn today?
        </h1>

        <div className={`overflow-hidden rounded-[22px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.06),0_30px_60px_-24px_rgba(15,23,42,0.30)]`}>
          <label className={`flex items-center gap-3.5 px-6 py-5 ${q ? "border-b border-border" : ""}`}>
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <span className="sr-only">Search workflows</span>
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKey}
              placeholder="Search a topic, a task or a doctor"
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-xl outline-none placeholder:text-muted-foreground/60 focus:ring-0"
            />
            <kbd className="rounded-md border border-border px-1.5 py-0.5 font-mono text-xs text-muted-foreground">{q ? "esc" : "/"}</kbd>
          </label>
          {q && !workflows && (
            <div className="flex justify-center py-8"><Loader /></div>
          )}
          {q && workflows && (
            <>
              <Results results={results} query={q} active={active} setActive={setActive} />
              {results.length > 0 && (
                <div className="flex flex-wrap justify-between gap-3 border-t border-border px-6 py-3 text-xs text-muted-foreground">
                  <span>{results.length} of {workflows.length} workflows</span>
                  <span className="font-mono">↑ ↓ to move · ↵ to open</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {!q && (
        <>
          {!workflows ? (
            <div className="mt-16 flex justify-center"><Loader /></div>
          ) : workflows.length === 0 ? (
            <Link
              href="/workflows/new"
              className="mx-auto mt-14 flex max-w-3xl flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border px-6 py-14 text-center transition-colors hover:border-foreground/30 hover:bg-card"
            >
              <span className="text-xl font-semibold">No workflows yet</span>
              <span className="text-muted-foreground">A senior doctor shows a task once, Protégé learns it.</span>
            </Link>
          ) : (
            <>
              <div className="mt-16 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="m-0 text-xl font-semibold tracking-tight">Learn from the doctors</h2>
                <span className="text-sm text-muted-foreground">
                  {doctors.length} {doctors.length === 1 ? "doctor" : "doctors"} · {ready} ready to learn
                </span>
              </div>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {doctors.map(([name, ws], i) => (
                  <DoctorPanel key={name} name={name} workflows={ws} style={AVATAR_STYLES[i % AVATAR_STYLES.length]} />
                ))}
              </div>
              {anySimulated && (
                <p className="mt-8 text-center text-xs text-muted-foreground">
                  Sample workflows come from simulated senior doctors and fictional patients.
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
