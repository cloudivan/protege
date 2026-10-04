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
import { BookOpen, Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { api, noEmDash } from "@/lib/utils";
import { Loader } from "@/components/ui/Loader";
import AgentPanel from "@/components/voice/AgentPanel";
import MomentReplay from "@/components/teach/MomentReplay";
import MasteryReport from "@/components/teach/MasteryReport";
import DemoTopicGate from "@/components/demo/DemoTopicGate";
import StageRail, { stagesDone } from "@/components/ui/StageRail";

// "Dr. Mei Tanaka" -> "MT"
const initials = (name) =>
  name
    .replace(/^dr\.?\s+/i, "")
    .split(/\s+/)
    .map((x) => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

// The patient as a chart: who, where, the key facts as tiles, the full
// history folded away.
function PatientChart({ lesson }) {
  const c = lesson.case;
  return (
    <section className="card flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-xs text-muted-foreground">Fictional patient</span>
        <h2 className="m-0 text-xl font-semibold tracking-tight">{c.patient}</h2>
        <span className="text-sm text-muted-foreground">{c.setting}</span>
      </div>
      <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
        {c.facts.map((f, i) => (
          <li key={i} className="rounded-xl bg-muted px-3 py-2.5 text-sm leading-snug">{f}</li>
        ))}
      </ul>
      <details className="text-sm leading-relaxed text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground">{c.title}</summary>
        <p className="mb-0 mt-2">{c.presentation}</p>
      </details>
    </section>
  );
}

// One segment per step: done in ink, the current one orange, the rest grey.
function ProgressBar({ lesson, progress, current }) {
  const done = progress.filter((p) => p.status !== "open").length;
  const mastered = progress.filter((p) => p.status === "mastered").length;
  return (
    <div className="flex flex-col gap-2">
      <div aria-hidden="true" className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${lesson.steps.length}, minmax(0, 1fr))` }}>
        {lesson.steps.map((s) => {
          const st = progress.find((x) => x.index === s.index)?.status || "open";
          const color = s.index === current ? "bg-primary-400" : st === "open" ? "bg-border" : "bg-foreground";
          return <span key={s.index} title={`${s.index}. ${s.title}`} className={`h-1.5 rounded-full transition-colors duration-500 ${color}`} />;
        })}
      </div>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{current ? `Step ${current} of ${lesson.steps.length}` : `All ${lesson.steps.length} steps done`}</span>
        <span>{mastered} mastered{done > mastered ? ` · ${done - mastered} with help` : ""}</span>
      </div>
    </div>
  );
}

// The backend's verdict as a reply from the senior doctor, in their words.
function Verdict({ result, expertName, onReplay }) {
  const e = result.expert;
  const heading = {
    correct: `Right. That is what ${expertName} does.`,
    revealed: `Here is what ${expertName} decided.`,
    partly: "Almost. Something is missing.",
    incorrect: result.caught ? `${expertName} would stop you here.` : "Not quite. Try again.",
  }[result.verdict];
  const accent = result.verdict === "correct" ? "shadow-[inset_3px_0_0_#0F172A]" : result.caught ? "shadow-[inset_3px_0_0_#FF5A1F]" : "";
  return (
    <div className="playback-in flex max-w-[92%] items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
        {initials(expertName)}
      </span>
      <div className={`card flex flex-col gap-3 rounded-[6px_20px_20px_20px] p-5 text-[15px] leading-relaxed ${accent}`}>
        <strong className="text-base font-semibold">{heading}</strong>
        {result.missing && <p className="m-0">{result.missing}</p>}
        {result.caught && e?.guardrail && <p className="m-0 font-medium">{e.guardrail.rule}</p>}
        {result.expected && <p className="m-0"><span className="text-muted-foreground">Decision: </span>{result.expected}</p>}
        {result.explanation && <p className="m-0 text-muted-foreground">{result.explanation}</p>}
        {e?.reason && <p className="m-0 text-muted-foreground">&ldquo;{noEmDash(e.reason)}&rdquo;</p>}
        {e?.hasMoment && (
          <button type="button" onClick={onReplay} className="flex items-center gap-2 self-start text-sm font-medium text-primary hover:underline">
            <Play className="h-3.5 w-3.5 fill-current" /> See the moment {expertName} decided this
          </button>
        )}
      </div>
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
      setResults((x) => ({ ...x, [r.step]: { ...r, answerText: reveal ? null : answer } }));
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
          <div className="mt-8 flex flex-col gap-8">
            <ProgressBar lesson={lesson} progress={progress} current={current} />
            <div className="flex flex-wrap items-start gap-7">
              <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-6 lg:max-w-[400px]">
                <PatientChart lesson={lesson} />
                <AgentPanel
                  title="Talk it through"
                  subtitle={`A voice tutor that explains in ${expertName}'s words. Optional.`}
                  sessionId={session._id}
                  getAt={getAt}
                  controlRef={controlRef}
                  clientTools={clientTools}
                  onConnected={briefTutor}
                />
              </aside>

              <section className="flex min-w-0 flex-[999_1_520px] flex-col gap-5">
                {currentStep && (
                  <>
                    <h2 className="m-0 text-[clamp(24px,2.6vw,34px)] font-semibold leading-tight tracking-[-0.03em]">{currentStep.task}</h2>
                    <div className="flex flex-col gap-3">
                      {last?.answerText && (
                        <p className="playback-in m-0 max-w-[75%] self-end rounded-[20px_20px_6px_20px] bg-foreground px-5 py-3.5 text-[15px] leading-relaxed text-background">
                          {last.answerText}
                        </p>
                      )}
                      {last && <Verdict result={last} expertName={expertName} onReplay={() => setReplayStep(workMapStep(currentStep.workMapStep))} />}
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        submit(false);
                      }}
                      className="flex items-end gap-2.5 rounded-[20px] bg-card p-2.5 pl-5 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_20px_40px_-20px_rgba(15,23,42,0.30)]"
                    >
                      <label className="flex min-w-0 flex-1">
                        <span className="sr-only">Your decision</span>
                        <textarea
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              submit(false);
                            }
                          }}
                          rows={2}
                          placeholder={last ? "Try again: your decision, as you would order it" : "Your decision, as you would write or order it"}
                          className="min-w-0 flex-1 resize-none border-0 bg-transparent p-0 py-2 text-base leading-relaxed outline-none placeholder:text-muted-foreground/70 focus:ring-0"
                          disabled={checking}
                        />
                      </label>
                      <button type="submit" disabled={checking || !answer.trim()} className="btn btn-primary min-h-[44px] gap-2 px-5 disabled:opacity-50">
                        {checking ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking…</> : "Check"}
                      </button>
                    </form>
                    <div className="flex flex-wrap justify-between gap-3 text-sm text-muted-foreground">
                      <button type="button" onClick={() => submit(true)} disabled={checking} className="underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50">
                        Show me {expertName}&apos;s decision
                      </button>
                      <span>Training only. Fictional patients, not medical advice.</span>
                    </div>
                  </>
                )}
                {!currentStep && lastDone && <Verdict result={lastDone} expertName={expertName} onReplay={() => setReplayStep(workMapStep(finalStep.workMapStep))} />}
                {mastery && <MasteryReport mastery={mastery} interventions={[]} />}
              </section>
            </div>
          </div>
        )}
      </div>
      <MomentReplay step={replayStep} expertName={expertName} onClose={() => setReplayStep(null)} />
    </div>
  );
}
