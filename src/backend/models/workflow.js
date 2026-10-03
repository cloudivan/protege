import mongoose from "mongoose";

// One expert task we want to capture and teach (e.g. "Process supplier
// invoices"). Owns its sessions and its Work Map.
const workflowSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    // Scenario config id (src/config/scenarios). Drives prompts and demo data.
    scenario: { type: String, required: true },
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
