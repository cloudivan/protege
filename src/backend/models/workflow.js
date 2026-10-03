import mongoose from "mongoose";

// One expert task we want to capture and teach (e.g. "Process supplier
// invoices"). Owns its sessions and its Work Map.
const workflowSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    // Preset id from src/config/scenarios (e.g. "invoices", which brings the
    // sandbox ERP and demo cases), or "custom" for a free-text use case.
    scenario: { type: String, default: "custom" },
    // The use case in the user's own words, and the domain profile generated
    // from it (services/useCase.js). Presets fill these from their config.
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
  },
  { timestamps: true },
);

export default mongoose.models.Workflow || mongoose.model("Workflow", workflowSchema);
