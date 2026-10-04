import dbConnect from "@/lib/dbConnect";
import Workflow from "@/backend/models/workflow";
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
    if (req.method === "GET") {
      const workflows = await Workflow.find().sort({ createdAt: -1 }).lean();
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
