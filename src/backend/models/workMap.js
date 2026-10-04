import mongoose from "mongoose";

// The Work Map: the product of Modules 1 + 2 and the input to Module 3.
// Invariant: every step and every guardrail links to a screen moment and to
// the expert's own words (see ARCHITECTURE.md).

const momentSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session" },
    at: { type: Number }, // ms since session start
    frameKey: { type: String },
    label: { type: String }, // "03:12, medication plan, anticoagulation field"
  },
  { _id: false },
);

const quoteSchema = new mongoose.Schema(
  {
    text: { type: String }, // verbatim expert words
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session" },
    turnIndex: { type: Number },
    at: { type: Number },
  },
  { _id: false },
);

const guardrailSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ["limit", "exception", "stop_and_ask", "never"] },
    rule: { type: String, required: true }, // "Never restart a DOAC without checking renal function."
    quote: quoteSchema,
    moment: momentSchema,
  },
  { _id: false },
);

const stepSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true },
    title: { type: String, required: true }, // "Adjust the anticoagulation in the discharge plan"
    moment: momentSchema,
    decision: { type: String }, // "Switched apixaban 5 mg to 2.5 mg twice daily"
    isJudgmentCall: { type: Boolean, default: false },
    reason: quoteSchema, // "Over 80 and creatinine above 1.5, I always halve it."
    guardrails: [guardrailSchema],
  },
  { _id: false },
);

const workMapSchema = new mongoose.Schema(
  {
    workflowId: { type: mongoose.Schema.Types.ObjectId, ref: "Workflow", required: true },
    version: { type: Number, default: 1 },
    steps: [stepSchema],
    // Gaps the builder found; the debrief asks about these.
    // Resolved in the debrief via the interviewer's resolve_question tool; the
    // answer and where it was said carry into the next build.
    openQuestions: [
      {
        text: String,
        aboutStepIndex: Number,
        resolved: Boolean,
        answer: String,
        sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session" },
        at: Number,
        _id: false,
      },
    ],
    teachBack: { text: String, confirmed: Boolean, corrections: [String], sessionId: mongoose.Schema.Types.ObjectId, at: Number },
    // What the citation check removed on the last build (see workMapBuilder).
    verification: {
      checkedAt: Date,
      removed: [{ stepIndex: Number, what: String, why: String, _id: false }],
    },
    confirmedAt: { type: Date },
  },
  { timestamps: true },
);

export default mongoose.models.WorkMap || mongoose.model("WorkMap", workMapSchema);
