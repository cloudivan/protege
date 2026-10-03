// The session protocol: a readable record of how the Work Map came to be.
// Built deterministically from stored data (no LLM), so nothing in it can be
// invented: the screen timeline, every live question with the expert's
// answer, the debrief answers, the confirmed teach-back with corrections, the
// Work Map, and what is still open. Off-the-record spans appear only as gaps.

import { stripOffRecord } from "@/backend/services/workMapBuilder";

const fmt = (ms = 0) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

const KIND_LABEL = {
  why: "Why",
  guardrail: "Guardrail",
  limit: "Limit",
  exception: "Exception",
  stop_and_ask: "Stop and ask",
  never: "Never",
  other: "Question",
};

function liveQuestions(session) {
  const said = (i) => (i != null ? session.transcript[i] : null);
  return (session.questions || [])
    .filter((q) => q.askedTurnIndex != null)
    .map((q) => {
      const asked = said(q.askedTurnIndex);
      const answer = said(q.answerTurnIndex);
      return {
        at: asked?.at ?? q.at,
        kind: q.kind || "other",
        question: asked?.text || q.text,
        answer: answer && !answer.offRecord ? answer.text : null,
        answerAt: answer?.at ?? null,
        rationale: q.rationale || null,
      };
    });
}

export function buildProtocol({ workflow, sessions, workMap }) {
  const captures = sessions.filter((s) => s.kind === "capture");
  const debriefs = sessions.filter((s) => s.kind === "debrief");

  const timeline = [];
  const qa = [];
  const offRecord = [];
  for (const s of captures) {
    const { events } = stripOffRecord(s);
    for (const e of events) timeline.push({ at: e.at, type: "event", text: e.summary, eventType: e.type });
    for (const q of liveQuestions(s)) {
      qa.push(q);
      timeline.push({ at: q.at, type: "question", text: q.question, kind: q.kind });
      if (q.answer) timeline.push({ at: q.answerAt, type: "answer", text: q.answer });
    }
    for (const span of s.offRecordSpans || []) {
      offRecord.push({ from: span.from, to: span.to ?? null });
      timeline.push({ at: span.from, type: "off_record", text: `Off the record${span.to != null ? ` until ${fmt(span.to)}` : ""}` });
    }
  }
  timeline.sort((a, b) => a.at - b.at);

  const steps = workMap?.steps || [];
  const resolved = (workMap?.openQuestions || []).filter((q) => q.resolved);
  const open = (workMap?.openQuestions || []).filter((q) => !q.resolved);
  const lastEvent = timeline.length ? timeline[timeline.length - 1].at : 0;

  const data = {
    title: workflow.title,
    expert: workflow.expertName || "the expert",
    generatedAt: new Date().toISOString(),
    recordedAt: captures[0]?.startedAt || captures[0]?.createdAt || null,
    workMap: workMap ? { version: workMap.version, confirmed: Boolean(workMap.confirmedAt), confirmedAt: workMap.confirmedAt || null } : null,
    summary: {
      captureDuration: fmt(lastEvent),
      screenEvents: timeline.filter((t) => t.type === "event").length,
      liveQuestions: qa.length,
      liveAnswered: qa.filter((q) => q.answer).length,
      guardrailQuestions: qa.filter((q) => ["guardrail", "limit", "exception", "stop_and_ask"].includes(q.kind)).length,
      debriefSessions: debriefs.length,
      debriefAnswers: resolved.length,
      steps: steps.length,
      judgmentCalls: steps.filter((s) => s.isJudgmentCall).length,
      guardrails: steps.reduce((n, s) => n + (s.guardrails?.length || 0), 0),
      openPoints: open.length,
    },
    timeline: timeline.map((t) => ({ ...t, time: fmt(t.at) })),
    liveQA: qa.map((q) => ({ ...q, time: fmt(q.at) })),
    debrief: {
      answers: resolved.map((q) => ({ question: q.text, answer: q.answer, aboutStep: q.aboutStepIndex })),
      teachBack: workMap?.teachBack?.text
        ? { text: workMap.teachBack.text, confirmed: Boolean(workMap.teachBack.confirmed), corrections: workMap.teachBack.corrections || [] }
        : null,
    },
    steps: steps.map((s) => ({
      index: s.index,
      title: s.title,
      decision: s.decision,
      isJudgmentCall: s.isJudgmentCall,
      moment: s.moment ? { time: fmt(s.moment.at), label: s.moment.label, frameKey: s.moment.frameKey || null } : null,
      reason: s.reason?.text ? { text: s.reason.text, time: fmt(s.reason.at) } : null,
      guardrails: (s.guardrails || []).map((g) => ({ kind: g.kind, label: KIND_LABEL[g.kind] || "Rule", rule: g.rule, quote: g.quote?.text || null })),
    })),
    openPoints: [
      ...open.map((q) => ({ type: "question", text: q.text, aboutStep: q.aboutStepIndex })),
      ...(workMap?.verification?.removed || []).map((r) => ({ type: "removed", text: `Step ${r.stepIndex}: ${r.what} removed (${r.why})` })),
    ],
    offRecord: offRecord.map((o) => ({ from: fmt(o.from), to: o.to != null ? fmt(o.to) : null })),
  };
  return { data, markdown: toMarkdown(data) };
}

function toMarkdown(p) {
  const L = [];
  const s = p.summary;
  L.push(`# Protocol: ${p.title}`);
  L.push("");
  L.push(`Expert: ${p.expert}  `);
  if (p.recordedAt) L.push(`Recorded: ${new Date(p.recordedAt).toISOString().slice(0, 16).replace("T", " ")} UTC  `);
  L.push(`Work Map: ${p.workMap ? `version ${p.workMap.version}, ${p.workMap.confirmed ? "confirmed by the expert" : "draft, not yet confirmed"}` : "not built yet"}`);
  L.push("");
  L.push("## Summary");
  L.push("");
  L.push(`- Capture: ${s.captureDuration}, ${s.screenEvents} screen events`);
  L.push(`- Live questions: ${s.liveQuestions} asked, ${s.liveAnswered} answered, ${s.guardrailQuestions} about a guardrail`);
  L.push(`- Debrief: ${s.debriefAnswers} questions answered${p.debrief.teachBack?.confirmed ? ", teach-back confirmed" : ""}`);
  L.push(`- Work Map: ${s.steps} steps, ${s.judgmentCalls} judgment calls, ${s.guardrails} guardrails`);
  L.push(`- Open points: ${s.openPoints}`);
  L.push("");

  L.push("## Work Map");
  L.push("");
  for (const st of p.steps) {
    L.push(`### ${st.index}. ${st.title}${st.isJudgmentCall ? " (judgment call)" : ""}`);
    L.push("");
    if (st.moment) L.push(`- Screen moment: ${st.moment.label || st.moment.time}`);
    if (st.decision) L.push(`- Decision: ${st.decision}`);
    if (st.reason) L.push(`- Reason: "${st.reason.text}" (${p.expert}, ${st.reason.time})`);
    for (const g of st.guardrails) L.push(`- ${g.label}: ${g.rule}${g.quote ? ` ("${g.quote}")` : ""}`);
    L.push("");
  }

  L.push("## Live questions during the task");
  L.push("");
  if (!p.liveQA.length) L.push("No questions were asked during the task.");
  for (const q of p.liveQA) {
    L.push(`- **${q.time} · ${KIND_LABEL[q.kind] || q.kind}:** ${q.question}`);
    L.push(`  - ${q.answer ? `${p.expert}: "${q.answer}"` : "No answer recorded."}`);
  }
  L.push("");

  L.push("## Debrief");
  L.push("");
  if (!p.debrief.answers.length) L.push("No debrief answers recorded.");
  for (const a of p.debrief.answers) L.push(`- **${a.question}**\n  - ${p.expert}: "${a.answer}"`);
  if (p.debrief.teachBack) {
    L.push("");
    L.push(`**Teach-back${p.debrief.teachBack.confirmed ? " (confirmed)" : ""}:** ${p.debrief.teachBack.text}`);
    for (const c of p.debrief.teachBack.corrections) L.push(`- Correction: ${c}`);
  }
  L.push("");

  L.push("## Timeline");
  L.push("");
  for (const t of p.timeline) {
    const tag = t.type === "question" ? "Q" : t.type === "answer" ? "A" : t.type === "off_record" ? "--" : " ";
    L.push(`- \`${t.time}\` ${tag === " " ? "" : `**${tag}** `}${t.text}`);
  }
  L.push("");

  L.push("## Open points");
  L.push("");
  if (!p.openPoints.length) L.push("None.");
  for (const o of p.openPoints) L.push(`- ${o.text}`);
  if (p.offRecord.length) {
    L.push("");
    L.push(`Off the record (not recorded): ${p.offRecord.map((o) => `${o.from}${o.to ? `–${o.to}` : ""}`).join(", ")}`);
  }
  L.push("");
  return L.join("\n");
}
