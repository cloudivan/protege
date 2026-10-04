// Module 3: Teach. A junior doctor works a fictional practice case that the
// backend generated from the senior doctor's Work Map, one decision at a time.
//
// The backend runs the lesson (services/lessonGenerator.js, lessonGrader.js):
// it writes the case, grades every answer against the Work Map, records
// interventions and mastery. This page only shows it and explains: the case,
// the current step, the verdict with the senior doctor's own words, the
// replay of their screen moment, and the mastery report at the end.
//
// The voice tutor is optional. It is briefed with prompts ("CASE: ...",
// "STEP n: ...", "RESULT step n: ...") so it speaks at the right moments.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { BookOpen, CheckCircle2, Circle, Eye, Loader2, Play, Quote, RotateCcw, ShieldAlert, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { api, noEmDash } from "@/lib/utils";
import { Loader } from "@/components/ui/Loader";
import AgentPanel from "@/components/voice/AgentPanel";
import MomentReplay from "@/components/teach/MomentReplay";
import MasteryReport from "@/components/teach/MasteryReport";
import DemoTopicGate from "@/components/demo/DemoTopicGate";
import StageRail, { stagesDone } from "@/components/ui/StageRail";

const STATUS_ICON = {
  mastered: <CheckCircle2 className="h-4 w-4 text-success-500" />,
  corrected: <RotateCcw className="h-4 w-4 text-warning-500" />,
  revealed: <Eye className="h-4 w-4 text-muted-foreground" />,
  open: <Circle className="h-4 w-4 text-muted-foreground" />,
};

function CaseCard({ lesson }) {
  const c = lesson.case;
  return (
    <section className="card p-6">
      <p className="m-0 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        <Stethoscope className="h-3.5 w-3.5" /> Practice case · fictional patient
      </p>
      <h2 className="mt-2 font-serif text-xl font-bold">{c.title}</h2>
      <p className="m-0 text-sm text-muted-foreground">{c.setting} · {c.patient}</p>
      <p className="mt-3 text-sm">{c.presentation}</p>
      <ul className="mt-3 grid list-none gap-1.5 p-0 text-sm sm:grid-cols-2">
        {c.facts.map((f, i) => (
          <li key={i} className="rounded border border-border bg-muted/40 px-3 py-1.5">{f}</li>
        ))}
      </ul>
    </section>
  );
}

function StepList({ lesson, progress, current }) {
  return (
    <ol className="m-0 list-none space-y-1 p-0 text-sm">
      {lesson.steps.map((s) => {
        const p = progress.find((x) => x.index === s.index);
        return (
          <li key={s.index} className={`flex items-center gap-2 rounded px-2 py-1.5 ${s.index === current ? "bg-primary/10 text-primary" : ""}`}>
            {STATUS_ICON[p?.status || "open"]}
            <span>{s.index}. {s.title}</span>
          </li>
        );
      })}
    </ol>
  );
}

// The backend's verdict, explained with the senior doctor's own words.
function Verdict({ result, expertName, onReplay }) {
  const e = result.expert;
  const tone = {
    correct: "border-success-500 bg-success-500/5",
    revealed: "border-border bg-muted/40",
    partly: "border-warning-500 bg-warning-500/5",
    incorrect: result.caught ? "sketch-border-alert bg-primary/5" : "border-warning-500 bg-warning-500/5",
  }[result.verdict];
  const heading = {
    correct: `Right. That is what ${expertName} does.`,
    revealed: `${expertName}'s decision`,
    partly: "Almost. Something is missing.",
    incorrect: result.caught ? `${expertName} would stop here.` : "Not quite. Try again.",
  }[result.verdict];
  return (
    <div className={`animate-fadeIn space-y-3 rounded-md border-2 p-4 text-sm ${tone}`}>
      <p className="m-0 flex items-center gap-2 font-semibold">
        {result.caught && <ShieldAlert className="h-4 w-4 text-primary" />} {heading}
      </p>
      {result.missing && <p className="m-0">{result.missing}</p>}
      {result.caught && e?.guardrail && (
        <p className="m-0">
          <span className="font-medium">{e.guardrail.rule}</span>
          {e.guardrail.quote && <span className="text-muted-foreground"> &ldquo;{noEmDash(e.guardrail.quote)}&rdquo;</span>}
        </p>
      )}
      {result.expected && <p className="m-0"><span className="text-muted-foreground">Decision: </span>{result.expected}</p>}
      {result.explanation && <p className="m-0 text-muted-foreground">{result.explanation}</p>}
      {e?.reason && (
        <p className="m-0 flex gap-2 border-l-2 border-primary pl-2 font-serif italic">
          <Quote className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 not-italic" /> {noEmDash(e.reason)} <span className="not-italic text-muted-foreground">{expertName}</span>
        </p>
      )}
      {e?.hasMoment && (
        <button type="button" onClick={onReplay} className="flex items-center gap-2 rounded border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted">
          <Play className="h-3 w-3 fill-current text-primary" /> Replay {expertName}&apos;s screen moment
        </button>
      )}
    </div>
  );
}

export default function TeachPage() {
  const { query } = useRouter();
  const [data, setData] = useState(null);
  const [needsTopic, setNeedsTopic] = useState(false);
  const [learner, setLearner] = useState("");
  const [session, setSession] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [progress, setProgress] = useState([]);
  const [mastery, setMastery] = useState(null);
  const [preparing, setPreparing] = useState(false);
  const [answer, setAnswer] = useState("");
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState({}); // step index -> latest verdict
  const [replayStep, setReplayStep] = useState(null);
  const controlRef = useRef(null);
  const startedAt = useRef(Date.now());
  const getAt = useCallback(() => Date.now() - startedAt.current, []);

  const load = useCallback(() => {
    if (!query.id) return;
    api(`/api/workflows/${query.id}`)
      .then((d) => {
        setNeedsTopic(false);
        setData(d);
      })
      .catch((e) => (e.data?.needsTopic ? setNeedsTopic(true) : toast.error(e.message)));
  }, [query.id]);
  useEffect(load, [load]);

  const workflow = data?.workflow;
  const workMap = data?.workMap;
  const expertName = workflow?.expertName || "The senior doctor";
  const current = progress.find((p) => p.status === "open")?.index ?? null;
  const currentStep = lesson?.steps.find((s) => s.index === current);

  const prompt = (text) => controlRef.current?.prompt?.(text);
  const briefTutor = () => {
    if (!lesson) return;
    prompt(`CASE: ${lesson.case.title}. ${lesson.case.patient}. ${lesson.case.presentation} Facts: ${lesson.case.facts.join("; ")}`);
    if (currentStep) prompt(`STEP ${currentStep.index}: ${currentStep.task}`);
  };

  const startLesson = async (e) => {
    e.preventDefault();
    setPreparing(true);
    try {
      const { session: s } = await api("/api/sessions", {
        method: "POST",
        body: { workflowId: workflow._id, kind: "teach", participantName: learner.trim() || "Junior doctor" },
      });
      setSession(s);
      startedAt.current = Date.now();
      const r = await api(`/api/sessions/${s._id}/lesson`, { method: "POST" });
      setLesson(r.lesson);
      setProgress(r.progress);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPreparing(false);
    }
  };

  const submit = async (reveal = false) => {
    if (!currentStep || checking) return;
    setChecking(true);
    try {
      const r = await api(`/api/sessions/${session._id}/answer`, {
        method: "POST",
        body: reveal ? { step: currentStep.index, reveal: true, at: getAt() } : { step: currentStep.index, answer, at: getAt() },
      });
      setResults((x) => ({ ...x, [r.step]: r }));
      setProgress(r.progress);
      if (r.verdict === "correct" || r.verdict === "revealed") setAnswer("");
      // Brief the voice tutor so it explains, in the senior doctor's words.
      const why = r.expert?.reason ? ` ${expertName} said: "${r.expert.reason}"` : "";
      if (r.verdict === "correct") prompt(`RESULT step ${r.step}: correct. Decision: ${r.expected}.${why}`);
      else if (r.verdict === "revealed") prompt(`RESULT step ${r.step}: revealed. Decision: ${r.expected}.${why}`);
      else if (r.caught) prompt(`RESULT step ${r.step}: stopped. Rule: ${r.expert?.guardrail?.rule}. ${r.explanation}${why} Work Map step ${currentStep.workMapStep}.`);
      else prompt(`RESULT step ${r.step}: partly. Missing: ${r.missing || r.explanation}`);
      if (r.done) {
        setMastery(r.mastery);
        prompt(`LESSON DONE: mastered ${r.mastery.mastered.length}, practice ${r.mastery.practice.length}.`);
      } else if (r.next !== currentStep.index) {
        const next = lesson.steps.find((s) => s.index === r.next);
        if (next) prompt(`STEP ${next.index}: ${next.task}`);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setChecking(false);
    }
  };

  // The tutor's replay_moment tool opens the same replay as the button.
  const workMapStep = (i) => workMap?.steps?.find((s) => s.index === Number(i));
  const clientTools = {
    replay_moment: async ({ step_index }) => {
      const s = workMapStep(step_index);
      if (!s) return `error: no step ${step_index}`;
      setReplayStep(s);
      return "showing the screen moment";
    },
  };

  if (needsTopic) return <DemoTopicGate onReady={load} />;
  if (!data) return <div className="mt-10 flex justify-center"><Loader /></div>;
  if (!workMap?.steps?.length) {
    return <p className="mx-auto max-w-3xl px-6 py-10 text-sm text-muted-foreground">This workflow has no Work Map yet. Let {expertName} teach it first.</p>;
  }

  const last = currentStep ? results[currentStep.index] : null;
  const finalStep = lesson?.steps[lesson.steps.length - 1];
  const lastDone = !currentStep && finalStep ? results[finalStep.index] : null;

  return (
    <div className="min-h-full paper-grid">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="m-0 text-3xl font-semibold tracking-tight">{workflow.title}</h1>
            {workflow.simulated && <p className="m-0 text-xs text-muted-foreground">Sample: the senior doctor and all patients are simulated.</p>}
          </div>
          <StageRail workflowId={workflow._id} current="teach" done={stagesDone(workflow, true)} />
        </div>

        {!lesson && (
          <form onSubmit={startLesson} className="card mt-8 max-w-2xl space-y-4 p-6">
            <h2 className="m-0 flex items-center gap-2 font-semibold"><BookOpen className="h-5 w-5 text-primary" /> A practice case, step by step</h2>
            <p className="m-0 text-sm text-muted-foreground">
              Protégé writes a fictional case {expertName} never showed and asks you for each decision. Every answer is checked against {expertName}&apos;s steps and rules before it counts, and explained in their own words.
            </p>
            <label className="block text-sm">
              Your name
              <input value={learner} onChange={(e) => setLearner(e.target.value)} placeholder="optional" className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm focus:border-foreground focus:outline-none focus:ring-0" />
            </label>
            <button type="submit" disabled={preparing} className="btn btn-primary gap-2 disabled:opacity-50">
              {preparing ? <><Loader2 className="h-4 w-4 animate-spin" /> Writing a practice case from {expertName}&apos;s Work Map…</> : "Start the practice case"}
            </button>
            <p className="m-0 text-xs text-muted-foreground">Training only. Fictional patients, not medical advice.</p>
          </form>
        )}

        {lesson && (
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
            <section className="space-y-6 lg:col-span-7">
              <CaseCard lesson={lesson} />
              {currentStep && (
                <section className="card space-y-4 p-6">
                  <p className="m-0 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Step {currentStep.index} of {lesson.steps.length} · {currentStep.title}
                  </p>
                  <p className="m-0 text-lg font-medium">{currentStep.task}</p>
                  {last && <Verdict result={last} expertName={expertName} onReplay={() => setReplayStep(workMapStep(currentStep.workMapStep))} />}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      submit(false);
                    }}
                    className="space-y-3"
                  >
                    <textarea
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      rows={3}
                      placeholder="Your decision, as you would write or order it"
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm focus:border-foreground focus:outline-none focus:ring-0"
                      disabled={checking}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="submit" disabled={checking || !answer.trim()} className="btn btn-primary gap-2 disabled:opacity-50">
                        {checking ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking against {expertName}&apos;s rules…</> : "Check my decision"}
                      </button>
                      <button type="button" onClick={() => submit(true)} disabled={checking} className="btn btn-secondary disabled:opacity-50">
                        <Eye className="mr-2 h-4 w-4" /> Show me {expertName}&apos;s decision
                      </button>
                    </div>
                  </form>
                </section>
              )}
              {!currentStep && lastDone && <Verdict result={lastDone} expertName={expertName} onReplay={() => setReplayStep(workMapStep(finalStep.workMapStep))} />}
              {mastery && <MasteryReport mastery={mastery} interventions={[]} />}
            </section>

            <section className="space-y-6 lg:col-span-5">
              <section className="card p-5">
                <h2 className="mb-3 mt-0 font-semibold">Steps</h2>
                <StepList lesson={lesson} progress={progress} current={current} />
              </section>
              <AgentPanel
                title="Voice tutor (optional)"
                subtitle={`Talks you through the case in ${expertName}'s words. Ask it anything.`}
                sessionId={session._id}
                getAt={getAt}
                controlRef={controlRef}
                clientTools={clientTools}
                onConnected={briefTutor}
              />
            </section>
          </div>
        )}
      </div>
      <MomentReplay step={replayStep} expertName={expertName} onClose={() => setReplayStep(null)} />
    </div>
  );
}
