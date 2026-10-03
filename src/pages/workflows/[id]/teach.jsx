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
import { ExternalLink, Flag, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/utils";
import getScenario from "@/config/scenarios";
import { useLiveSession } from "@/lib/useLiveSession";
import { usePauseDetector } from "@/lib/usePauseDetector";
import { openSandboxChannel } from "@/lib/sandboxChannel";
import { Loader } from "@/components/ui/Loader";
import AgentPanel from "@/components/voice/AgentPanel";
import ScreenShare from "@/components/capture/ScreenShare";
import EventFeed from "@/components/capture/EventFeed";
import MomentReplay from "@/components/teach/MomentReplay";
import MasteryReport from "@/components/teach/MasteryReport";

export default function TeachPage() {
  const { query } = useRouter();
  const [data, setData] = useState(null);
  const [learner] = useState("New hire");
  const { session, getAt } = useLiveSession(data?.workMap ? query.id : null, "teach", learner);
  const controlRef = useRef(null);
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
    <div className="mx-auto max-w-6xl px-6 py-6">
      <h1 className="font-display text-2xl font-bold">3. Teach</h1>
      <p className="text-sm text-muted-foreground">
        A new hire works a case {expertName} never showed. The tutor coaches from {expertName}&apos;s Work Map and steps in before a guardrail is broken.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <section className="card p-5">
            <h2 className="font-semibold">Your case</h2>
            {teachCase && (
              <p className="mt-1 text-sm">
                {teachCase.id} · {teachCase.supplier} · {teachCase.item} · {teachCase.amount.toLocaleString("de-DE")} {teachCase.currency}
              </p>
            )}
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Open the sandbox ERP in a new tab.</li>
              <li>Share that tab below, then start the tutor.</li>
              <li>Process the invoice. Talk to the tutor whenever you like.</li>
            </ol>
            {sandboxUrl && (
              <a href={sandboxUrl} target="_blank" rel="noreferrer" className="btn btn-primary mt-4 inline-flex">
                <ExternalLink className="mr-2 h-4 w-4" /> Open sandbox ERP
              </a>
            )}
          </section>

          {session && <ScreenShare sessionId={session._id} getAt={getAt} onEvents={onVisionEvents} />}

          {alert && (
            <section className="card border-error-500 p-5">
              <h2 className="flex items-center gap-2 font-semibold text-error-600">
                <ShieldAlert className="h-5 w-5" /> {expertName} would stop here
              </h2>
              <p className="mt-2 text-sm">Step {alert.stepIndex}: {alert.stepTitle}. {alert.explanation}</p>
              {alert.guardrail && <p className="mt-1 text-sm text-muted-foreground">{alert.guardrail}</p>}
              {alert.hasMoment && (
                <button type="button" onClick={() => setReplayStep(stepByIndex(alert.stepIndex))} className="btn btn-secondary mt-3">
                  Replay {expertName}&apos;s moment
                </button>
              )}
            </section>
          )}

          <EventFeed events={events} />
        </div>

        <div className="space-y-4">
          {session ? (
            <AgentPanel
              title="Tutor"
              subtitle={`Coaching in ${expertName}'s words`}
              sessionId={session._id}
              getAt={getAt}
              clientTools={clientTools}
              controlRef={controlRef}
              onUserTurn={markActivity}
            />
          ) : (
            <div className="card flex justify-center p-5"><Loader /></div>
          )}

          {interventions.length > 0 && (
            <section className="card p-5 text-sm">
              <h2 className="font-semibold">Tutor stepped in</h2>
              <ul className="mt-2 space-y-1">
                {interventions.map((x, i) => (
                  <li key={i}>
                    <span className="font-medium">{x.outcome}</span> · step {x.stepIndex}: {x.guardrail}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!mastery && session && (
            <button type="button" onClick={() => { send("LESSON DONE"); finish(); }} disabled={finishing} className="btn btn-secondary w-full disabled:opacity-50">
              <Flag className="mr-2 h-4 w-4" /> {finishing ? "Summarizing…" : "Finish lesson"}
            </button>
          )}
          <MasteryReport mastery={mastery} interventions={interventions} />
        </div>
      </div>

      <MomentReplay step={replayStep} expertName={expertName} onClose={() => setReplayStep(null)} />
    </div>
  );
}
