// Module 3: Teach. The new hire works an unseen case in the sandbox ERP (own
// tab, screen shared), the tutor coaches from the Work Map.
//
// Event sources, both forwarded to the tutor as contextual updates:
//   - sandbox ERP over BroadcastChannel: exact actions + guardrail verdicts
//   - vision on the shared screen (general path, used when no sandbox events)
// A verdict with a violation becomes "ALERT step N: ..." so the tutor steps in
// while the save is still blocked.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { AlertCircle, CheckCircle2, ExternalLink, Flag, Play } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/utils";
import getScenario from "@/config/scenarios";
import { useLiveSession } from "@/lib/useLiveSession";
import { usePauseDetector } from "@/lib/usePauseDetector";
import { openSandboxChannel } from "@/lib/sandboxChannel";
import { buildTutorVars } from "@/backend/services/agentVars";
import { Loader } from "@/components/ui/Loader";
import AgentPanel from "@/components/voice/AgentPanel";
import ScreenShare from "@/components/capture/ScreenShare";
import EventFeed from "@/components/capture/EventFeed";
import MomentReplay from "@/components/teach/MomentReplay";
import MasteryReport from "@/components/teach/MasteryReport";

const LEARNER = "Lena (new hire)";

export default function TeachPage() {
  const { query } = useRouter();
  const [data, setData] = useState(null);
  const { session, getAt } = useLiveSession(data?.workMap ? data.workflow._id : null, "teach", LEARNER);
  const controlRef = useRef(null);
  const shareRef = useRef(null);
  const sandboxSeen = useRef(false);
  const [events, setEvents] = useState([]);
  const [alert, setAlert] = useState(null);
  const [interventions, setInterventions] = useState([]);
  const [replayStep, setReplayStep] = useState(null);
  const [mastery, setMastery] = useState(null);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (query.id) api(`/api/workflows/${query.id}`).then(setData).catch((e) => toast.error(e.message));
  }, [query.id]);

  const workflow = data?.workflow;
  const workMap = data?.workMap;
  const scenario = getScenario(workflow?.scenario);
  const expertName = workflow?.expertName || "the expert";
  const stepByIndex = useCallback((i) => workMap?.steps?.find((s) => s.index === Number(i)), [workMap]);

  const send = (text) => controlRef.current?.sendContext(text);
  const { markActivity } = usePauseDetector({ onPause: () => send("PAUSE"), enabled: Boolean(session) && !mastery });

  const addEvent = useCallback(
    (e) => {
      markActivity();
      setEvents((xs) => [...xs, { ...e, at: getAt() }]);
      send(e.summary);
    },
    [getAt, markActivity],
  );

  const finish = useCallback(
    async (body = {}) => {
      if (!session || finishing) return;
      setFinishing(true);
      try {
        const r = await api(`/api/sessions/${session._id}/mastery`, { method: "POST", body });
        setMastery(r.mastery);
        const { session: fresh } = await api(`/api/sessions/${session._id}`);
        setInterventions(fresh.interventions || []);
      } catch (e) {
        toast.error(e.message);
      } finally {
        setFinishing(false);
      }
    },
    [session, finishing],
  );

  // Sandbox tab -> tutor
  useEffect(() => {
    if (!session) return;
    const ch = openSandboxChannel((msg) => {
      sandboxSeen.current = true;
      if (msg.type === "event") addEvent(msg.event);
      if (msg.type === "verdict") {
        addEvent(msg.event);
        if (msg.verdict.violation) {
          const v = msg.verdict;
          setAlert(v);
          setInterventions((xs) => [...xs, { at: getAt(), stepIndex: v.stepIndex, guardrail: v.guardrail, learnerAction: msg.event.summary, outcome: "caught" }]);
          send(`ALERT step ${v.stepIndex}: ${v.guardrail}. ${v.explanation || ""} ${expertName} said: "${v.expertReason || ""}"`);
        } else {
          setAlert(null);
        }
      }
      if (msg.type === "done") send("LESSON DONE");
    });
    return () => ch.close();
  }, [session, addEvent, getAt, expertName]);

  // Vision path: only when the sandbox is not reporting exact events.
  const onVisionEvents = useCallback(
    (evts, activity) => {
      if (activity && activity !== "idle") markActivity();
      if (sandboxSeen.current) return;
      evts.forEach((e) => addEvent(e));
    },
    [addEvent, markActivity],
  );

  const clientTools = useMemo(
    () => ({
      replay_moment: async ({ step_index }) => {
        const step = stepByIndex(step_index);
        if (!step) return `error: no step ${step_index}`;
        setReplayStep(step);
        return "showing the expert's screen moment";
      },
      log_intervention: async ({ step_index, guardrail, learner_action, outcome }) => {
        if (!session) return "error: no session";
        const item = { at: getAt(), stepIndex: step_index, guardrail, learnerAction: learner_action, outcome };
        await api(`/api/sessions/${session._id}/intervention`, { method: "POST", body: item });
        setInterventions((xs) => [...xs, item]);
        if (outcome === "corrected") setAlert(null);
        return "logged";
      },
      finish_lesson: async ({ mastered, practice }) => {
        await finish({ mastered, practice });
        return "lesson saved";
      },
    }),
    [session, getAt, stepByIndex, finish],
  );

  if (!data) return <div className="mt-10 flex justify-center"><Loader /></div>;
  if (!workMap) {
    return <p className="mx-auto max-w-3xl px-6 py-10 text-sm text-muted-foreground">Build the Work Map first (capture and debrief), or run <code>npm run seed</code> for the demo map.</p>;
  }

  const sandboxUrl = session ? `/sandbox/erp?set=teach&scenario=${workflow.scenario}&session=${session._id}` : null;
  const teachCase = scenario?.cases?.teach?.[0];

  return (
    <div className="min-h-full paper-grid">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs uppercase tracking-widest text-primary">
              Module 3 · Voice Tutor
            </span>
            <h1 className="mt-2 font-serif text-2xl font-bold">{workflow.title}</h1>
            <p className="text-sm text-muted-foreground">
              A case {expertName} never showed. The tutor coaches in {expertName}&apos;s words and steps in before a guardrail is broken.
            </p>
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            Learner: <span className="font-semibold text-foreground">{LEARNER}</span>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left: the learner's workspace */}
          <section className="space-y-6 lg:col-span-7">
            <div className="sketch-border space-y-4 rounded-lg bg-card p-6">
              <div className="flex items-start justify-between border-b border-border pb-4">
                <div>
                  <span className="font-mono text-xs text-muted-foreground">SANDBOX ERP · YOUR CASE</span>
                  {teachCase && <h2 className="mt-1 font-serif text-xl font-bold">Invoice #{teachCase.id}</h2>}
                </div>
                <span className="rounded bg-amber-500/10 px-2 py-1 font-mono text-xs text-amber-700 dark:text-amber-400">
                  {mastery ? "Done" : "Unprocessed"}
                </span>
              </div>
              {teachCase && (
                <div className="grid grid-cols-2 gap-4 rounded border border-border bg-muted/40 p-4 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Vendor</div>
                    <div className="font-medium">{teachCase.supplier}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Amount</div>
                    <div className="font-mono text-base font-bold text-primary">
                      {teachCase.amount.toLocaleString("de-DE", { style: "currency", currency: teachCase.currency })}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-muted-foreground">Description</div>
                    <div className="font-medium">{teachCase.item}</div>
                  </div>
                </div>
              )}
              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Open the sandbox ERP in a new tab.</li>
                <li>Press Start and share that tab. The tutor joins right after.</li>
                <li>Process the invoice. Talk to the tutor whenever you like.</li>
              </ol>
              {sandboxUrl && (
                <a href={sandboxUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
                  <ExternalLink className="mr-2 h-4 w-4" /> Open sandbox ERP
                </a>
              )}
            </div>

            {session && <ScreenShare sessionId={session._id} getAt={getAt} onEvents={onVisionEvents} shareRef={shareRef} hideUntilSharing />}
            <EventFeed events={events} />
          </section>

          {/* Right: the tutor companion */}
          <section className="space-y-6 lg:col-span-5">
            {session ? (
              <AgentPanel
                title="Protégé Voice Tutor"
                subtitle={`Coaching in ${expertName}'s words`}
                sessionId={session._id}
                getAt={getAt}
                clientTools={clientTools}
                controlRef={controlRef}
                onUserTurn={markActivity}
                beforeStart={() => shareRef.current?.start() ?? false}
                onEnd={() => shareRef.current?.stop()}
                offlineConfig={{ role: "tutor", dynamicVariables: buildTutorVars({ workflow, workMap }) }}
              />
            ) : (
              <div className="card flex justify-center p-5"><Loader /></div>
            )}

            {alert && (
              <div className="sketch-border-alert animate-fadeIn space-y-3 rounded-md bg-primary/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 font-mono text-xs font-bold text-primary">
                    <AlertCircle className="h-3.5 w-3.5" /> {expertName.toUpperCase()} WOULD STOP HERE
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">Step {alert.stepIndex} of Work Map</span>
                </div>
                <p className="text-sm">{alert.explanation}</p>
                {alert.guardrail && <p className="text-xs text-muted-foreground">{alert.guardrail}</p>}
                {alert.expertReason && (
                  <div className="border-l-2 border-primary pl-2 font-serif text-sm italic">
                    &ldquo;{alert.expertReason}&rdquo; <span className="not-italic text-muted-foreground">{expertName}</span>
                  </div>
                )}
                {alert.hasMoment && (
                  <button
                    type="button"
                    onClick={() => setReplayStep(stepByIndex(alert.stepIndex))}
                    className="flex w-full items-center justify-center gap-2 rounded border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted"
                  >
                    <Play className="h-3 w-3 fill-current text-primary" /> Replay {expertName}&apos;s screen moment
                  </button>
                )}
              </div>
            )}

            {interventions.length > 0 && !mastery && (
              <div className="sketch-border space-y-1 rounded-lg bg-card p-4 text-sm">
                <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Tutor stepped in</div>
                {interventions.map((x, i) => (
                  <p key={i}><span className="font-medium">{x.outcome}</span> · step {x.stepIndex}: {x.guardrail}</p>
                ))}
              </div>
            )}

            {!mastery && session && (
              <button type="button" onClick={() => { send("LESSON DONE"); finish(); }} disabled={finishing} className="btn btn-secondary w-full disabled:opacity-50">
                <Flag className="mr-2 h-4 w-4" /> {finishing ? "Summarizing…" : "Finish lesson"}
              </button>
            )}
            {mastery && (
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> Lesson complete
              </div>
            )}
            <MasteryReport mastery={mastery} interventions={interventions} />
          </section>
        </div>
      </div>

      <MomentReplay step={replayStep} expertName={expertName} onClose={() => setReplayStep(null)} />
    </div>
  );
}
