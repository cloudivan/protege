// The "demo" workflow behind /workflows/demo: generated, never hard-coded.
//
// Someone picks a clinical topic once (POST /api/workflows/demo { topic }).
// The LLM then simulates a senior doctor doing that workflow on screen: screen
// events plus a short spoken exchange in which the apprentice asks why at
// pauses. That simulated session goes through the SAME pipeline as a real one
// (buildWorkMap with its citation check), so the demo's Work Map quotes the
// simulated doctor's own words. The workflow is marked simulated for the UI.
//
// The old invoice demo (scenario "invoices") is removed on first access.

import mongoose from "mongoose";
import Workflow from "@/backend/models/workflow";
import WorkMap from "@/backend/models/workMap";
import Session from "@/backend/models/session";
import Frame from "@/backend/models/frame";
import { completeJson } from "@/backend/services/llm";
import { profileForUseCase } from "@/backend/services/useCase";
import { buildWorkMap } from "@/backend/services/workMapBuilder";

export const DEMO_ID = "demo";
// Fixed ids, so every server instance finds the same demo records.
const DEMO_WORKFLOW_OID = "000000000000000000000de0";
const DEMO_WORK_MAP_OID = "000000000000000000000de1";

export class DemoMissingError extends Error {
  constructor() {
    super("No demo yet. Pick a clinical topic to generate one.");
    this.status = 404;
    this.needsTopic = true;
  }
}

async function removeDemo() {
  const sessions = await Session.find({ workflowId: DEMO_WORKFLOW_OID }, { _id: 1 }).lean();
  await Frame.deleteMany({ sessionId: { $in: sessions.map((s) => s._id) } });
  await Session.deleteMany({ workflowId: DEMO_WORKFLOW_OID });
  await WorkMap.deleteMany({ workflowId: DEMO_WORKFLOW_OID });
  await Workflow.deleteOne({ _id: DEMO_WORKFLOW_OID });
}

// The demo workflow, or DemoMissingError. Call after dbConnect().
export async function ensureDemoWorkflow() {
  const existing = await Workflow.findById(DEMO_WORKFLOW_OID);
  if (existing && existing.scenario === "invoices") {
    await removeDemo(); // legacy hard-coded invoice demo
    throw new DemoMissingError();
  }
  if (!existing) throw new DemoMissingError();
  return existing;
}

// --------------------------------------------------------------- generation
const SIM_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string", description: "The workflow as a short task, e.g. 'Write the discharge letter after NSTEMI'." },
    expertName: { type: "string", description: "A fictional senior doctor, e.g. 'Dr. Weber'. Never a real person." },
    useCase: { type: "string", description: "The kind of clinical work and setting, one line." },
    events: {
      type: "array",
      description: "8 to 14 screen events in the hospital system, in time order.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          sec: { type: "integer", description: "Seconds since the start." },
          type: { type: "string", description: "opened_record | field_changed | order_placed | medication_changed | document_written | sent | other" },
          summary: { type: "string", description: "Concrete: what changed, with values. Fictional patient label only." },
        },
        required: ["sec", "type", "summary"],
      },
    },
    dialogue: {
      type: "array",
      description: "The apprentice asks 3 or 4 short questions at pauses right after a judgment call; the senior doctor answers each in their own words.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          sec: { type: "integer" },
          role: { type: "string", enum: ["apprentice", "expert"] },
          text: { type: "string" },
        },
        required: ["sec", "role", "text"],
      },
    },
  },
  required: ["title", "expertName", "useCase", "events", "dialogue"],
};

const SIM_SYSTEM = `You simulate a realistic recording for a training demo: a senior doctor does one clinical desk workflow in the hospital system while an AI apprentice watches and asks why at natural pauses.
- One fictional patient ("Patient A", age, sex). No real names or identifiers.
- Screen events are concrete and clinically coherent: values with units, drug names and doses, orders, document sections.
- Include at least three judgment calls. The expert's answers must contain their real reasoning in plain spoken words: at least one threshold or limit, one exception, one moment they would stop and involve someone, and one thing they would never do.
- Answers sound like a busy, experienced doctor talking, one to three sentences. Questions are short and about what just happened on screen.
- This is fictional training material, not medical advice.`;

const PLAYBACK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    question: { type: "string", description: "The tutor's short question to a junior doctor at this step of a new case, under 18 words." },
    wrongAnswer: { type: "string", description: "A plausible short wrong answer a junior doctor might give, which breaks the rule. Under 10 words." },
  },
  required: ["question", "wrongAnswer"],
};

export async function generateDemoWorkflow(topic, expertName) {
  await removeDemo();
  return simulateWorkflow({ topic, expertName, ids: { workflow: DEMO_WORKFLOW_OID, workMap: DEMO_WORK_MAP_OID } });
}

// A simulated senior doctor's workflow on any clinical topic, through the
// real pipeline (capture session -> buildWorkMap with its citation check ->
// confirmed Work Map). Used for the demo and for sample workflows; marked
// simulated. expertName is optional (the LLM invents a fictional one).
export async function simulateWorkflow({ topic, expertName, ids = {} }) {
  if (!topic?.trim()) throw Object.assign(new Error("topic is required"), { status: 400 });
  const sim = await completeJson({
    system: SIM_SYSTEM,
    text: `Topic: ${topic.trim()}${expertName?.trim() ? `\nThe senior doctor is ${expertName.trim()}.` : ""}`,
    schema: SIM_SCHEMA,
    tier: "smart",
  });
  const author = expertName?.trim() || sim.expertName;

  const profile = await profileForUseCase({ title: sim.title, useCase: sim.useCase, expertName: author });
  const workflow = await Workflow.create({
    ...(ids.workflow && { _id: ids.workflow }),
    title: sim.title,
    expertName: author,
    useCase: sim.useCase,
    ...profile,
    simulated: true,
    demoTopic: topic.trim(),
    status: "capturing",
  });

  // The simulated recording as a capture session, questions linked to answers.
  const transcript = [];
  const questions = [];
  for (const d of [...(sim.dialogue || [])].sort((a, b) => a.sec - b.sec)) {
    const role = d.role === "expert" ? "user" : "agent";
    transcript.push({ role, text: d.text, at: d.sec * 1000, offRecord: false });
    const i = transcript.length - 1;
    if (role === "agent") questions.push({ at: d.sec * 1000, text: d.text, kind: "why", planned: true, askedTurnIndex: i });
    else {
      const q = [...questions].reverse().find((x) => x.answerTurnIndex == null);
      if (q) q.answerTurnIndex = i;
    }
  }
  const capture = await Session.create({
    workflowId: workflow._id,
    kind: "capture",
    participantName: author,
    status: "done",
    events: (sim.events || []).map((e) => ({ at: e.sec * 1000, type: e.type, summary: e.summary })),
    transcript,
    questions,
  });

  const built = await buildWorkMap({ workflow, sessions: [capture.toObject()], previous: null });
  const workMap = await WorkMap.create({
    ...(ids.workMap && { _id: ids.workMap }),
    workflowId: workflow._id,
    version: 1,
    steps: built.steps,
    openQuestions: built.openQuestions,
    verification: built.verification,
    teachBack: { text: "Simulated: the generated senior doctor's session, confirmed automatically.", confirmed: true, corrections: [] },
    confirmedAt: new Date(),
  });
  workflow.workMapId = workMap._id;
  workflow.status = "mapped";
  workflow.playback = await buildPlayback(workflow, workMap);
  await workflow.save();
  return workflow;
}

// Three lines for the landing page: the tutor asks, a junior answers wrong,
// the tutor stops them with the expert's verified rule (from the Work Map).
async function buildPlayback(workflow, workMap) {
  const step = workMap.steps.find((s) => s.guardrails?.length);
  if (!step) return null;
  const rule = step.guardrails[0].rule;
  try {
    const p = await completeJson({
      system: "You write two short lines for a training animation. Fictional case, not medical advice.",
      text: `Workflow: ${workflow.title}\nStep: ${step.title}\nRule the junior doctor will break: ${rule}`,
      schema: PLAYBACK_SCHEMA,
      tier: "fast",
    });
    return [
      { from: "tutor", text: p.question },
      { from: "you", text: p.wrongAnswer },
      { from: "tutor", text: `${workflow.expertName} would stop you here. ${rule}` },
    ];
  } catch {
    return null;
  }
}

export const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
