import dbConnect from "@/lib/dbConnect";
import Workflow from "@/backend/models/workflow";
import WorkMap from "@/backend/models/workMap";
import { profileForUseCase } from "@/backend/services/useCase";

// POST { title, expertName, useCase }
// All free text: the workflow, the senior doctor, and the kind of clinical
// work. The domain profile for the agents is generated from it.
const readBody = (body = {}) => ({
  title: body.title?.trim(),
  useCase: body.useCase?.trim() || "",
  expertName: body.expertName?.trim(),
});

// In-memory fallback for local dev when MONGODB_URI is not configured.
let inMemoryWorkflows = [];

export default async function handler(req, res) {
  if (!process.env.MONGODB_URI) {
    if (req.method === "GET") {
      return res.status(200).json({ workflows: inMemoryWorkflows });
    }
    if (req.method === "POST") {
      const { title, useCase, expertName } = readBody(req.body);
      if (!title || !useCase) return res.status(400).json({ error: "title and useCase are required" });
      const newWorkflow = {
        _id: `wf-${Date.now()}`,
        title,
        useCase,
        expertName,
        status: "draft",
        createdAt: new Date().toISOString(),
      };
      inMemoryWorkflows.unshift(newWorkflow);
      return res.status(201).json({ workflow: newWorkflow });
    }
  }

  try {
    await dbConnect();
    // GET -> { workflows } newest first, each with `author` (the senior doctor
    // who taught it), its Work Map size and whether it is ready to learn.
    if (req.method === "GET") {
      const list = await Workflow.find().sort({ createdAt: -1 }).lean();
      const maps = await WorkMap.find({ _id: { $in: list.map((w) => w.workMapId).filter(Boolean) } })
        .select("steps.isJudgmentCall steps.guardrails.kind confirmedAt version")
        .lean();
      const byId = new Map(maps.map((m) => [String(m._id), m]));
      const workflows = list.map((w) => {
        const m = w.workMapId ? byId.get(String(w.workMapId)) : null;
        const steps = m?.steps || [];
        return {
          ...w,
          author: w.expertName || null,
          map: m
            ? {
                steps: steps.length,
                judgmentCalls: steps.filter((s) => s.isJudgmentCall).length,
                guardrails: steps.reduce((n, s) => n + (s.guardrails?.length || 0), 0),
                confirmed: Boolean(m.confirmedAt),
              }
            : null,
          // Ready to learn once the senior doctor confirmed the Work Map.
          ready: Boolean(m?.confirmedAt && steps.length),
        };
      });
      return res.status(200).json({ workflows });
    }
    if (req.method === "POST") {
      const { title, useCase, expertName } = readBody(req.body);
      if (!title || !useCase) return res.status(400).json({ error: "title and useCase are required" });
      const profile = await profileForUseCase({ title, useCase, expertName });
      const workflow = await Workflow.create({ title, useCase, expertName, ...profile });
      return res.status(201).json({ workflow });
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("workflows error:", error);
    return res.status(500).json({ error: error.message });
  }
}
