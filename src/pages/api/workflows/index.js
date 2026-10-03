import dbConnect from "@/lib/dbConnect";
import Workflow from "@/backend/models/workflow";
import getScenario from "@/config/scenarios";
import { profileForUseCase } from "@/backend/services/useCase";

// POST { title, expertName, useCase, scenario? }
// useCase is free text ("insurance claims triage"). scenario is optional: a
// preset id such as "invoices" (brings its sandbox and demo cases); anything
// else is a custom use case whose domain profile is generated from the text.
const readBody = (body = {}) => {
  const title = body.title?.trim();
  const preset = getScenario(body.scenario);
  const useCase = body.useCase?.trim() || preset?.label || "";
  return { title, preset, useCase, expertName: body.expertName?.trim() };
};

// In-memory fallback for local dev when MongoDB_URI is not yet configured
let inMemoryWorkflows = [
  {
    _id: "demo",
    title: "Process supplier invoices",
    scenario: "invoices",
    expertName: "Sabine",
    status: "mapped",
    createdAt: new Date().toISOString(),
  },
];

export default async function handler(req, res) {
  if (!process.env.MONGODB_URI) {
    if (req.method === "GET") {
      return res.status(200).json({ workflows: inMemoryWorkflows });
    }
    if (req.method === "POST") {
      const { title, preset, useCase, expertName } = readBody(req.body);
      if (!title || !useCase) return res.status(400).json({ error: "title and useCase are required" });
      const newWorkflow = {
        _id: `wf-${Date.now()}`,
        title,
        scenario: preset?.id || "custom",
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
    if (req.method === "GET") {
      const workflows = await Workflow.find().sort({ createdAt: -1 }).lean();
      return res.status(200).json({ workflows });
    }
    if (req.method === "POST") {
      const { title, preset, useCase, expertName } = readBody(req.body);
      if (!title || !useCase) return res.status(400).json({ error: "title and useCase are required" });
      const profile = preset
        ? { domain: preset.domain, curiosity: preset.curiosity }
        : await profileForUseCase({ title, useCase, expertName });
      const workflow = await Workflow.create({ title, scenario: preset?.id || "custom", useCase, expertName, ...profile });
      return res.status(201).json({ workflow });
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("workflows error:", error);
    return res.status(500).json({ error: error.message });
  }
}
