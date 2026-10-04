// Shown on /workflows/demo/* until a demo exists: the visitor picks any
// clinical topic and the backend generates a simulated senior doctor's
// session and a verified Work Map from it (POST /api/workflows/demo).
import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/utils";

export default function DemoTopicGate({ onReady }) {
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/workflows/demo", { method: "POST", body: { topic } });
      onReady?.();
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center px-6 py-10">
      <form onSubmit={submit} className="card space-y-4 p-6">
        <p className="m-0 font-mono text-xs uppercase tracking-widest text-muted-foreground">Demo</p>
        <h1 className="m-0 text-2xl font-semibold">Which clinical workflow should the demo show?</h1>
        <p className="m-0 text-sm text-muted-foreground">
          Protégé simulates a senior doctor doing it, learns it like a real session and builds a verified Work Map. The patient and the doctor are fictional.
        </p>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. adjusting anticoagulation at discharge"
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm focus:border-foreground focus:outline-none focus:ring-0"
          required
          disabled={busy}
        />
        <button type="submit" disabled={busy || !topic.trim()} className="btn btn-primary gap-2 disabled:opacity-50">
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating the demo, about a minute…</> : <><Sparkles className="h-4 w-4" /> Generate demo</>}
        </button>
      </form>
    </div>
  );
}
