import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/utils";
import { Loader } from "@/components/ui/Loader";

export default function Workflows() {
  const [workflows, setWorkflows] = useState(null);
  useEffect(() => {
    api("/api/workflows").then((d) => setWorkflows(d.workflows)).catch((e) => { toast.error(e.message); setWorkflows([]); });
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Workflows</h1>
        <Link href="/workflows/new" className="btn btn-primary">New workflow</Link>
      </div>
      {!workflows ? (
        <div className="mt-10 flex justify-center"><Loader /></div>
      ) : workflows.length === 0 ? (
        <p className="mt-6 text-muted-foreground">No workflows yet.</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {workflows.map((w) => (
            <li key={w._id}>
              <Link href={`/workflows/${w._id}`} className="card flex items-center justify-between p-4 hover:bg-muted/50">
                <span>
                  <span className="font-medium">{w.title}</span>
                  {w.expertName && <span className="ml-2 text-sm text-muted-foreground">by {w.expertName}</span>}
                </span>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">{w.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
