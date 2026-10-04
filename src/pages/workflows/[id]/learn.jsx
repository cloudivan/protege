// Learn: the expert teaches Protégé, start to finish on one page.
//
//   1. capture   Expert shares the screen (required) and works. The agent
//                watches the screen events and, at natural pauses, asks the
//                one question the backend planner picked (useQuestionPlanner).
//   2. building  "Finished" builds the draft Work Map + open questions.
//   3. debrief   The interviewer asks the open questions, explains the process
//                back, and on "yes" the final Work Map is built (useDebriefTools).
//   4. protocol  The readable protocol (GET /api/workflows/[id]/protocol).
//
// Screen events come from the shared screen (vision); they go to the session
// and, as context, to the agent.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { CheckCircle2, Circle, Download, ExternalLink, FileText, GraduationCap, Loader2, MessageCircleQuestion, Quote, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/utils";
import { useLiveSession } from "@/lib/useLiveSession";
import { usePauseDetector } from "@/lib/usePauseDetector";
import { useQuestionPlanner } from "@/lib/useQuestionPlanner";
import { useDebriefTools } from "@/lib/useDebriefTools";
import { Loader } from "@/components/ui/Loader";
import AgentPanel from "@/components/voice/AgentPanel";
import ScreenShare from "@/components/capture/ScreenShare";
import EventFeed from "@/components/capture/EventFeed";
import OffRecordButton from "@/components/capture/OffRecordButton";
import WorkMapTimeline from "@/components/map/WorkMapTimeline";

const STAGES = [
  { id: "capture", label: "Work and explain" },
  { id: "debrief", label: "Debrief" },
  { id: "protocol", label: "Protocol" },
];
const stageOf = (phase) => (phase === "building" ? "capture" : phase === "finalizing" ? "debrief" : phase);

const KIND_LABEL = { why: "why", guardrail: "guardrail", limit: "limit", exception: "exception", stop_and_ask: "stop & ask", other: "question" };
const GUARDRAIL_KINDS = ["guardrail", "limit", "exception", "stop_and_ask"];

function Stepper({ phase }) {
  const current = STAGES.findIndex((s) => s.id === stageOf(phase));
  return (
    <ol className="flex flex-wrap items-center gap-2 font-mono text-xs">
      {STAGES.map((s, i) => (
        <li key={s.id} className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 rounded px-2 py-1 ${i === current ? "bg-primary/10 text-primary" : i < current ? "text-foreground" : "text-muted-foreground"}`}>
            {i < current ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
            {i + 1}. {s.label}
          </span>
          {i < STAGES.length - 1 && <span className="text-muted-foreground">·</span>}
        </li>
      ))}
    </ol>
  );
}

// Live questions with the expert's answers, plus the brief's requirement.
function QuestionLog({ session, stats, last }) {
  const asked = (session?.questions || []).filter((q) => q.askedTurnIndex != null);
  const said = (i) => (i != null ? session.transcript?.[i]?.text : null);
  return (
    <section className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold"><MessageCircleQuestion className="h-4 w-4 text-primary" /> Questions</h2>
        <span className={`rounded px-2 py-0.5 font-mono text-[11px] ${stats.met ? "bg-success-500/10 text-success-700" : "bg-muted text-muted-foreground"}`}>
          {stats.asked}/3 asked · {stats.guardrail >= 1 ? "✓" : "0/1"} guardrail
        </span>
      </div>
      {last && !last.ask && last.reason && <p className="mt-2 text-xs text-muted-foreground">Quiet at the last pause: {last.reason}.</p>}
      {asked.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Protégé stays quiet while you work and asks at natural pauses.</p>
      ) : (
        <ol className="mt-3 space-y-3 text-sm">
          {asked.map((q, i) => (
            <li key={i} className="border-l-2 border-border pl-3">
              <div className="flex items-center gap-2">
                <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase ${GUARDRAIL_KINDS.includes(q.kind) ? "bg-error-500/10 text-error-600" : "bg-muted text-muted-foreground"}`}>
                  {KIND_LABEL[q.kind] || q.kind}
                </span>
              </div>
              <p className="mt-1">{said(q.askedTurnIndex) || q.text}</p>
              {q.answerTurnIndex != null ? (
                <p className="mt-1 flex gap-1.5 text-muted-foreground"><Quote className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />{said(q.answerTurnIndex)}</p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">Waiting for the answer…</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function OpenQuestions({ workMap }) {
  const qs = workMap?.openQuestions || [];
  const teachBack = workMap?.teachBack;
  return (
    <section className="card p-5">
      <h2 className="font-semibold">Open questions</h2>
      {qs.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Nothing left open. Protégé will explain the process back.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {qs.map((q, i) => (
            <li key={i} className="flex gap-2">
              {q.resolved ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success-500" /> : <Circle className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />}
              <div>
                <p className={q.resolved ? "text-muted-foreground" : ""}>{q.text}</p>
                {q.answer && <p className="mt-0.5 text-xs text-muted-foreground">&ldquo;{q.answer}&rdquo;</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className={`mt-4 border-t border-border pt-3 text-sm ${teachBack?.confirmed ? "text-success-700" : "text-muted-foreground"}`}>
        {teachBack?.confirmed ? "✓ Teach-back confirmed by the expert." : "Teach-back: after the questions, Protégé explains the whole process back for confirmation."}
      </p>
    </section>
  );
}

function Protocol({ protocol, workflowId }) {
  const p = protocol;
  const s = p.summary;
  return (
    <div className="space-y-6">
      <section className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Protocol</p>
            <h2 className="mt-1 font-serif text-xl font-bold">{p.title}</h2>
            <p className="text-sm text-muted-foreground">
              {p.expert} · Work Map {p.workMap ? `v${p.workMap.version}, ${p.workMap.confirmed ? "confirmed" : "draft"}` : "not built"}
            </p>
          </div>
          <div className="flex gap-2">
            <a href={`/api/workflows/${workflowId}/protocol?format=md`} className="btn btn-secondary"><Download className="mr-2 h-4 w-4" /> Download .md</a>
            <Link href={`/workflows/${workflowId}/teach`} className="btn btn-primary"><GraduationCap className="mr-2 h-4 w-4" /> Teach a junior doctor</Link>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {[
            ["Capture", `${s.captureDuration} · ${s.screenEvents} events`],
            ["Live questions", `${s.liveAnswered}/${s.liveQuestions} answered · ${s.guardrailQuestions} guardrail`],
            ["Debrief", `${s.debriefAnswers} answered`],
            ["Work Map", `${s.steps} steps · ${s.judgmentCalls} judgment · ${s.guardrails} guardrails`],
          ].map(([k, v]) => (
            <div key={k} className="rounded border border-border bg-muted/40 p-3">
              <dt className="font-mono text-[11px] uppercase text-muted-foreground">{k}</dt>
              <dd className="mt-1">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card p-6">
        <h3 className="font-semibold">Live questions during the task</h3>
        {p.liveQA.length === 0 && <p className="mt-2 text-sm text-muted-foreground">None.</p>}
        <ol className="mt-3 space-y-3 text-sm">
          {p.liveQA.map((q, i) => (
            <li key={i}>
              <p><span className="font-mono text-xs text-muted-foreground">{q.time}</span> <span className="font-mono text-[10px] uppercase text-muted-foreground">{KIND_LABEL[q.kind]}</span> {q.question}</p>
              <p className="mt-0.5 text-muted-foreground">{q.answer ? <>&ldquo;{q.answer}&rdquo;</> : "No answer recorded."}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="card p-6">
        <h3 className="font-semibold">Debrief</h3>
        <ul className="mt-3 space-y-3 text-sm">
          {p.debrief.answers.map((a, i) => (
            <li key={i}><p>{a.question}</p><p className="mt-0.5 text-muted-foreground">&ldquo;{a.answer}&rdquo;</p></li>
          ))}
        </ul>
        {p.debrief.teachBack && (
          <div className="mt-4 border-t border-border pt-3 text-sm">
            <p className="font-mono text-xs uppercase text-muted-foreground">Teach-back {p.debrief.teachBack.confirmed && "· confirmed"}</p>
            <p className="mt-1">{p.debrief.teachBack.text}</p>
            {p.debrief.teachBack.corrections.map((c, i) => <p key={i} className="mt-1 text-muted-foreground">Correction: {c}</p>)}
          </div>
        )}
      </section>

      <section className="card p-6">
        <h3 className="font-semibold">Timeline</h3>
        <ol className="mt-3 max-h-96 space-y-1 overflow-y-auto text-sm scrollbar-subtle">
          {p.timeline.map((t, i) => (
            <li key={i} className={`flex gap-3 ${t.type === "question" ? "font-medium" : t.type === "answer" ? "text-muted-foreground" : ""}`}>
              <span className="font-mono text-xs text-muted-foreground">{t.time}</span>
              <span>{t.type === "question" ? "Q: " : t.type === "answer" ? "A: " : ""}{t.text}</span>
            </li>
          ))}
        </ol>
      </section>

      {p.openPoints.length > 0 && (
        <section className="card p-6">
          <h3 className="flex items-center gap-2 font-semibold"><ShieldAlert className="h-4 w-4 text-warning-500" /> Open points</h3>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{p.openPoints.map((o, i) => <li key={i}>{o.text}</li>)}</ul>
        </section>
      )}
    </div>
  );
}

export default function LearnPage() {
  const { query } = useRouter();
  const [data, setData] = useState(null);
  const [phase, setPhase] = useState(null);
  const [protocol, setProtocol] = useState(null);
  const [events, setEvents] = useState([]);
  const [sharing, setSharing] = useState(false);
  const [captureView, setCaptureView] = useState(null); // capture session with questions + transcript
  const controlRef = useRef(null);
  const debriefRef = useRef(null);
  const shareRef = useRef(null);

  const workflow = data?.workflow;
  const workMap = data?.workMap;
  const workflowId = workflow?._id;

  const load = useCallback(
    () => (query.id ? api(`/api/workflows/${query.id}`).then((d) => { setData(d); return d; }) : Promise.resolve(null)),
    [query.id],
  );
  const loadProtocol = useCallback(
    (id) => api(`/api/workflows/${id}/protocol`).then((r) => setProtocol(r.protocol)),
    [],
  );

  // Start where the workflow is: a confirmed map goes straight to the protocol.
  useEffect(() => {
    load()
      .then((d) => {
        if (!d) return;
        if (d.workMap?.confirmedAt) {
          setPhase("protocol");
          loadProtocol(d.workflow._id);
        } else setPhase("capture");
      })
      .catch((e) => toast.error(e.message));
  }, [load, loadProtocol]);

  // Sessions: the capture one now, the debrief one only once we get there.
  const { session: capture, getAt } = useLiveSession(phase === "capture" ? workflowId : null, "capture", workflow?.expertName || "Expert");
  const inDebrief = phase === "debrief" || phase === "finalizing";
  const { session: debrief, getAt: getDebriefAt } = useLiveSession(inDebrief ? workflowId : null, "debrief", workflow?.expertName || "Expert");

  // ------------------------------------------------------------ capture
  const send = (text) => controlRef.current?.sendContext(text);
  const { onPause, last, stats, setStats } = useQuestionPlanner({ sessionId: capture?._id, getAt, prompt: (t) => controlRef.current?.prompt(t) });
  const { markActivity } = usePauseDetector({ onPause, enabled: Boolean(capture) && sharing && phase === "capture" });

  const addEvents = useCallback(
    (evts) => {
      if (!evts.length) return;
      markActivity();
      setEvents((xs) => [...xs, ...evts]);
      evts.forEach((e) => send(e.summary));
    },
    [markActivity],
  );

  const onVisionEvents = useCallback(
    (evts, activity) => {
      if (activity && activity !== "idle") markActivity();
      addEvents(evts || []);
    },
    [addEvents, markActivity],
  );

  // Keep the question log current (questions are stored server-side).
  useEffect(() => {
    if (!capture || phase !== "capture") return;
    const tick = () =>
      api(`/api/sessions/${capture._id}`)
        .then(({ session }) => {
          setCaptureView(session);
          const asked = session.questions.filter((q) => q.askedTurnIndex != null);
          const guardrail = asked.filter((q) => GUARDRAIL_KINDS.includes(q.kind)).length;
          setStats({ asked: asked.length, answered: asked.filter((q) => q.answerTurnIndex != null).length, guardrail, met: asked.length >= 3 && guardrail >= 1 });
        })
        .catch(() => {});
    tick();
    const id = setInterval(tick, 3000);
    return () => clearInterval(id);
  }, [capture, phase, setStats]);

  const finishCapture = async () => {
    setPhase("building");
    controlRef.current?.end();
    shareRef.current?.stop();
    try {
      await api(`/api/workflows/${workflowId}/map`, { method: "POST", body: {} });
      await load();
      setPhase("debrief");
    } catch (e) {
      toast.error(e.message);
      setPhase("capture");
    }
  };

  // ------------------------------------------------------------ debrief
  const debriefTools = useDebriefTools({
    sessionId: debrief?._id,
    workflowId,
    getAt: getDebriefAt,
    onChange: (e) => {
      if (e.type === "teach_back_confirmed") setPhase("finalizing");
      if (e.type === "map_failed") {
        toast.error(e.error);
        setPhase("debrief");
      }
      load().then(() => {
        if (e.type === "map_finalized") {
          debriefRef.current?.end();
          loadProtocol(workflowId).then(() => setPhase("protocol"));
        }
      });
    },
  });

  if (!data || !phase) return <div className="mt-10 flex justify-center"><Loader /></div>;

  return (
    <div className="min-h-full paper-grid">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs uppercase tracking-widest text-primary">Learn · {workflow.expertName || "Expert"} teaches Protégé</span>
            <h1 className="mt-2 font-serif text-2xl font-bold">{workflow.title}</h1>
            {(workflow.domain || workflow.useCase) && <p className="text-sm text-muted-foreground">{workflow.domain || workflow.useCase}</p>}
          </div>
          <Stepper phase={phase} />
        </div>

        {phase === "capture" && (
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
            <section className="space-y-6 lg:col-span-7">
              <div className="card p-5 text-sm">
                <p>
                  Do the workflow the way you always do and talk if you like. Protégé watches the screen, stays quiet while you work and asks short questions at natural pauses. Click <strong>Start</strong>, choose the window of the system you work in, then begin. Use test or fictional patients only.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {capture && <OffRecordButton sessionId={capture._id} getAt={getAt} />}
                  <button type="button" onClick={finishCapture} disabled={!capture || !sharing} className="btn btn-primary ml-auto disabled:opacity-50">
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Finished, start the debrief
                  </button>
                </div>
              </div>
              {capture && <ScreenShare sessionId={capture._id} getAt={getAt} onEvents={onVisionEvents} onSharingChange={setSharing} shareRef={shareRef} hideUntilSharing />}
              <EventFeed events={events} />
            </section>
            <section className="space-y-6 lg:col-span-5">
              {capture ? (
                <AgentPanel
                  key="capture"
                  title="Protégé is learning"
                  subtitle="Screen sharing starts with the session."
                  sessionId={capture._id}
                  getAt={getAt}
                  controlRef={controlRef}
                  onUserTurn={markActivity}
                  beforeStart={() => shareRef.current?.start() ?? false}
                  onEnd={() => shareRef.current?.stop()}
                />
              ) : (
                <div className="card flex justify-center p-5"><Loader /></div>
              )}
              <QuestionLog session={captureView} stats={stats} last={last} />
            </section>
          </div>
        )}

        {phase === "building" && (
          <div className="card mt-8 flex items-center gap-3 p-6 text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-primary" /> Building the draft Work Map from what you showed and said…
          </div>
        )}

        {inDebrief && (
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
            <section className="space-y-6 lg:col-span-7">
              <div className="card p-5">
                <h2 className="mb-3 font-semibold">Draft Work Map</h2>
                <WorkMapTimeline workMap={workMap} />
              </div>
            </section>
            <section className="space-y-6 lg:col-span-5">
              {debrief ? (
                <AgentPanel
                  key="debrief"
                  title="Debrief"
                  subtitle="A few questions, then Protégé explains the process back."
                  sessionId={debrief._id}
                  getAt={getDebriefAt}
                  controlRef={debriefRef}
                  clientTools={debriefTools}
                />
              ) : (
                <div className="card flex justify-center p-5"><Loader /></div>
              )}
              {phase === "finalizing" && (
                <div className="card flex items-center gap-3 p-4 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" /> Confirmed. Building the final Work Map and the protocol…
                </div>
              )}
              <OpenQuestions workMap={workMap} />
            </section>
          </div>
        )}

        {phase === "protocol" && (
          <div className="mt-8">
            {protocol ? <Protocol protocol={protocol} workflowId={workflowId} /> : <div className="flex justify-center"><Loader /></div>}
            <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" /> Built from the recorded screen events and the expert&apos;s own words. Nothing in it is generated.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
