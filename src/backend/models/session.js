import mongoose from "mongoose";

// One live voice session. kind decides which module it belongs to:
//   capture  (Module 1) expert works, interviewer asks why at pauses
//   debrief  (Module 2) interviewer closes gaps, then teach-back
//   teach    (Module 3) junior doctor works a case, tutor coaches
//
// `at` everywhere = milliseconds since session start. That is the "screen
// moment" key the Work Map links to.

const turnSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["agent", "user"], required: true },
    text: { type: String, required: true },
    at: { type: Number, required: true },
    offRecord: { type: Boolean, default: false },
  },
  { _id: false },
);

const screenEventSchema = new mongoose.Schema(
  {
    at: { type: Number, required: true },
    // e.g. opened_record, field_changed, moved_item, approved, held, navigated
    type: { type: String, required: true },
    summary: { type: String, required: true }, // "eGFR field set to 28 in the discharge letter"
    data: { type: mongoose.Schema.Types.Mixed },
    frameKey: { type: String }, // stored frame for replay: "api/frames/<frameId>" (models/frame.js)
  },
  { _id: false },
);

const questionSchema = new mongoose.Schema(
  {
    at: { type: Number, required: true },
    text: { type: String, required: true },
    kind: { type: String, enum: ["why", "guardrail", "limit", "exception", "stop_and_ask", "other"] },
    aboutEventAt: { type: Number }, // which screen event triggered it
    answerTurnIndex: { type: Number }, // index into transcript
    // Chosen by the question planner (services/questionPlanner.js) at a pause;
    // askedTurnIndex is set once the agent actually says it.
    planned: { type: Boolean, default: false },
    askedTurnIndex: { type: Number },
    rationale: { type: String }, // why the planner picked it (shown in the UI)
  },
  { _id: false },
);

const interventionSchema = new mongoose.Schema(
  {
    at: { type: Number, required: true },
    stepIndex: { type: Number },
    guardrail: { type: String },
    learnerAction: { type: String },
    outcome: { type: String, enum: ["caught", "corrected", "missed"] },
  },
  { _id: false },
);

const sessionSchema = new mongoose.Schema(
  {
    workflowId: { type: mongoose.Schema.Types.ObjectId, ref: "Workflow", required: true },
    kind: { type: String, enum: ["capture", "debrief", "teach"], required: true },
    participantName: { type: String },
    status: { type: String, enum: ["pending", "live", "done", "failed"], default: "pending" },
    startedAt: { type: Date },
    endedAt: { type: Date },
    elevenConversationId: { type: String },
    transcript: [turnSchema],
    events: [screenEventSchema],
    questions: [questionSchema],
    // Expert pressed "off the record": nothing in these spans reaches the Work Map.
    offRecordSpans: [{ from: Number, to: Number, _id: false }],
    // Teach sessions only
    interventions: [interventionSchema],
    mastery: { type: mongoose.Schema.Types.Mixed },
    // The generated practice case (services/lessonGenerator.js) and the
    // learner's progress through its steps (services/lessonGrader.js).
    lesson: { type: mongoose.Schema.Types.Mixed },
    progress: { type: mongoose.Schema.Types.Mixed },
    // Debrief sessions only
    teachBackConfirmed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.models.Session || mongoose.model("Session", sessionSchema);
