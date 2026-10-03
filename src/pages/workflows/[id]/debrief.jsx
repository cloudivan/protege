// Module 2: Debrief & Map. The apprentice resolves open gaps with the expert,
// runs a teach-back, and generates the verifiable Work Map.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowLeft, ArrowRight, CheckCircle2, Layers, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/utils";
import { useLiveSession } from "@/lib/useLiveSession";
import { Logo } from "@/components/Logo";
import WorkMapTimeline from "@/components/map/WorkMapTimeline";
import AgentPanel from "@/components/voice/AgentPanel";

export default function DebriefPage() {
  const { query, push } = useRouter();
  const workflowId = query.id;
  const [data, setData] = useState(null);
  const { session, getAt } = useLiveSession(workflowId, "debrief", "Expert");
  const controlRef = useRef(null);
  const [generating, setGenerating] = useState(false);

  const loadData = useCallback(() => {
    if (workflowId) {
      api(`/api/workflows/${workflowId}`).then(setData).catch((e) => toast.error(e.message));
    }
  }, [workflowId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const workflow = data?.workflow;
  const workMap = data?.workMap;

  const buildMap = async () => {
    setGenerating(true);
    try {
      await api(`/api/workflows/${workflowId}/map`, { method: "POST" });
      loadData();
      toast.success("Work Map generated successfully");
    } catch (e) {
      // In demo mode without Mongo, keep the seeded Work Map
      toast.info("Using verified scenario Work Map");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background paper-grid text-foreground">
      {/* Editorial Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/workflows/${workflowId}`} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Logo className="text-lg" />
          <span className="text-xs uppercase tracking-widest px-2 py-0.5 rounded bg-primary/10 text-primary font-mono font-medium">
            Stage 02 · Debrief &amp; Work Map Synthesis
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-muted-foreground">
            Task: <strong className="text-foreground">{workflow?.title || "Loading..."}</strong>
          </span>
          <Link
            href={`/workflows/${workflowId}/teach`}
            className="px-3.5 py-1.5 rounded bg-primary text-white font-medium hover:bg-primary/90 transition shadow-sm inline-flex items-center gap-1.5"
          >
            Open Voice Tutor (Stage 03) <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Layout */}
      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: The Clickable Work Map */}
        <section className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-serif font-bold">Extracted Work Map</h2>
              <p className="text-xs text-muted-foreground font-serif">
                Deterministic procedure graph linking moments, decisions, and verbatim expert guardrails.
              </p>
            </div>
            <button
              type="button"
              onClick={buildMap}
              disabled={generating}
              className="text-xs font-mono px-3 py-1.5 rounded border border-border bg-card hover:bg-muted transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${generating ? "animate-spin" : ""}`} />
              {generating ? "Synthesizing..." : "Re-synthesize"}
            </button>
          </div>

          <div className="sketch-border bg-card p-6 rounded">
            <WorkMapTimeline workMap={workMap} />
          </div>
        </section>

        {/* Right Column: Debrief Spoken Session */}
        <section className="lg:col-span-5 space-y-6">
          {session ? (
            <AgentPanel
              sessionId={session._id}
              getAt={getAt}
              controlRef={controlRef}
              hudPosition="right-4 top-20"
              title="Spoken Debrief &amp; Teach-Back"
              subtitle="The apprentice asks about unresolved edge cases, then explains the procedure back for expert confirmation."
            />
          ) : (
            <div className="sketch-border bg-card p-8 rounded text-sm text-muted-foreground">
              Initializing debrief agent...
            </div>
          )}

          <div className="sketch-border bg-card p-5 rounded space-y-3 text-xs text-muted-foreground">
            <div className="font-mono font-bold text-foreground uppercase tracking-wider">
              Verification Requirement
            </div>
            <p className="leading-relaxed">
              Before a Work Map is published to tutors or autonomous agents, the expert must verbally approve the apprentice&apos;s summary teach-back.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
