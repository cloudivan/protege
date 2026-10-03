// Module 1: Capture. The expert shares their screen and works.
// Protégé listens in a side panel, stays quiet while they type, and asks why at natural pauses.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowLeft, ArrowRight, ExternalLink, Shield, Layers, HelpCircle, Eye } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/utils";
import { useLiveSession } from "@/lib/useLiveSession";
import { usePauseDetector } from "@/lib/usePauseDetector";
import { Logo } from "@/components/Logo";
import ScreenShare from "@/components/capture/ScreenShare";
import EventFeed from "@/components/capture/EventFeed";
import OffRecordButton from "@/components/capture/OffRecordButton";
import AgentPanel from "@/components/voice/AgentPanel";

export default function CapturePage() {
  const { query, push } = useRouter();
  const workflowId = query.id;
  const [workflow, setWorkflow] = useState(null);
  const { session, getAt } = useLiveSession(workflowId, "capture", "Expert");
  const controlRef = useRef(null);
  const shareRef = useRef(null);
  const [events, setEvents] = useState([]);
  const [sharing, setSharing] = useState(false);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (workflowId) {
      api(`/api/workflows/${workflowId}`)
        .then((d) => setWorkflow(d.workflow))
        .catch((e) => toast.error(e.message));
    }
  }, [workflowId]);

  const send = (text) => controlRef.current?.sendContext(text);
  const { markActivity } = usePauseDetector({
    onPause: () => {
      send("PAUSE");
    },
    enabled: Boolean(session) && sharing,
  });

  const handleEvents = useCallback(
    (newEvents, activity) => {
      markActivity();
      if (newEvents?.length) {
        setEvents((prev) => [...prev, ...newEvents]);
        newEvents.forEach((e) => send(e.summary));
      }
    },
    [markActivity],
  );

  // The debrief needs the draft Work Map: its open questions are what the
  // interviewer asks about (POST /api/workflows/[id]/map, see docs/API.md).
  const proceedToDebrief = async () => {
    setFinishing(true);
    try {
      controlRef.current?.end();
      await api(`/api/workflows/${workflowId}/map`, { method: "POST", body: {} });
      push(`/workflows/${workflowId}/debrief`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setFinishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background paper-grid text-foreground">
      {/* Editorial Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/workflows" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Logo className="text-lg" />
          <span className="text-xs uppercase tracking-widest px-2 py-0.5 rounded bg-primary/10 text-primary font-mono font-medium">
            Stage 01 · Non-Intrusive Capture
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-muted-foreground">
            Task: <strong className="text-foreground">{workflow?.title || "Loading..."}</strong>
          </span>
          {session && (
            <OffRecordButton sessionId={session._id} getAt={getAt} />
          )}
          <button
            type="button"
            onClick={proceedToDebrief}
            disabled={finishing}
            className="px-3.5 py-1.5 rounded bg-primary text-white font-medium hover:bg-primary/90 transition shadow-sm inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            {finishing ? "Building Work Map…" : <>Finish &amp; Debrief <ArrowRight className="h-3.5 w-3.5" /></>}
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Screen Share & Event Feed */}
        <section className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between bg-muted/40 p-3 rounded border border-border text-xs">
            <span className="text-muted-foreground">
              Testing locally without an external app?
            </span>
            <Link
              href="/sandbox/erp"
              target="_blank"
              className="font-mono text-primary hover:underline inline-flex items-center gap-1"
            >
              Open Sandbox ERP in New Tab <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          {session ? (
            <ScreenShare
              sessionId={session._id}
              getAt={getAt}
              onEvents={handleEvents}
              onSharingChange={setSharing}
              shareRef={shareRef}
              headless
            />
          ) : (
            <div className="sketch-border bg-card p-12 rounded text-center text-sm text-muted-foreground">
              Initializing capture session...
            </div>
          )}

          <EventFeed events={events} />
        </section>

        {/* Right Column: Apprentice Listener Panel */}
        <section className="lg:col-span-5 space-y-6">
          {session ? (
            <AgentPanel
              sessionId={session._id}
              getAt={getAt}
              controlRef={controlRef}
              beforeStart={() => shareRef.current?.start() ?? false}
              onEnd={() => shareRef.current?.stop()}
              title="Protégé Apprentice Companion"
              subtitle="Observing screen transitions. Silently waiting for natural pauses to clarify unwritten rules."
            />
          ) : (
            <div className="sketch-border bg-card p-8 rounded text-sm text-muted-foreground">
              Loading audio companion...
            </div>
          )}

          <div className="sketch-border bg-card p-5 rounded space-y-3 text-xs text-muted-foreground">
            <div className="font-mono font-bold text-foreground uppercase tracking-wider">
              Capture Protocol Guardrails
            </div>
            <p className="leading-relaxed">
              Protégé enforces a 2.5s minimum silence threshold before asking live questions. Maximum 3 to 5 inquiries per 10-minute session. Clicks and typing maintain complete agent silence.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
