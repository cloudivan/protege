import mongoose from "mongoose";

// One clinical workflow a senior doctor teaches (title, doctor and use case
// are free text). Owns its sessions and its Work Map.
const workflowSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    // Legacy preset id from early builds; new workflows leave it unset.
    scenario: { type: String },
    // The use case in the user's own words, and the domain profile generated
    // from it (services/useCase.js).
    useCase: { type: String },
    domain: { type: String },
    curiosity: [{ type: String }],
    expertName: { type: String },
    status: {
      type: String,
      enum: ["draft", "capturing", "debriefing", "mapped", "teaching"],
      default: "draft",
    },
    workMapId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkMap" },
    // Generated demo (services/demoWorkflow.js): a simulated senior doctor,
    // marked so the UI can say so. demoTopic is the topic it was made from.
    simulated: { type: Boolean, default: false },
    demoTopic: { type: String },
    // Three lines for the landing page playback, generated with the demo.
    playback: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

export default mongoose.models.Workflow || mongoose.model("Workflow", workflowSchema);
