// Module 2: what the interviewer's debrief tools write. Both act on the
// workflow's CURRENT Work Map version in place (the next build carries them
// forward), and only from a debrief session, so the capture agent cannot
// close questions or confirm a map.

import Session from "@/backend/models/session";
import Workflow from "@/backend/models/workflow";
import WorkMap from "@/backend/models/workMap";

class DebriefError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function loadDebrief(sessionId) {
  const session = await Session.findById(sessionId);
  if (!session) throw new DebriefError(404, "Session not found");
  if (session.kind !== "debrief") throw new DebriefError(400, "Only debrief sessions can do this");
  const workflow = await Workflow.findById(session.workflowId);
  const workMap = workflow?.workMapId ? await WorkMap.findById(workflow.workMapId) : null;
  if (!workMap) throw new DebriefError(409, "Build the draft Work Map first");
  return { session, workflow, workMap };
}

// The interviewer sees unresolved questions numbered by their index in
// workMap.openQuestions (agentVars.buildInterviewerVars).
export async function resolveQuestion({ sessionId, index, answer, at }) {
  const { session, workMap } = await loadDebrief(sessionId);
  const q = workMap.openQuestions[index];
  if (!q) throw new DebriefError(400, `No open question ${index}`);
  if (!answer?.trim()) throw new DebriefError(400, "answer is required");
  q.resolved = true;
  q.answer = answer.trim();
  q.sessionId = session._id;
  q.at = at;
  workMap.markModified("openQuestions");
  await workMap.save();
  const left = workMap.openQuestions.filter((x) => !x.resolved).length;
  return { resolved: index, openLeft: left };
}

export async function confirmTeachBack({ sessionId, summary, corrections = [], at }) {
  const { session, workMap } = await loadDebrief(sessionId);
  if (!summary?.trim()) throw new DebriefError(400, "summary is required");
  workMap.teachBack = { text: summary.trim(), confirmed: true, corrections, sessionId: session._id, at };
  await workMap.save();
  session.teachBackConfirmed = true;
  await session.save();
  return { confirmed: true, openLeft: workMap.openQuestions.filter((x) => !x.resolved).length };
}

export const debriefStatus = (error) => error.status || 500;
