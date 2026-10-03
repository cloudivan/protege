// Mock voice: one agent turn as text, using the same prompt the ElevenLabs
// agent runs. Lets the team build without spending voice credits.
import { complete } from "@/backend/services/llm";
import { INTERVIEWER_PROMPT, TUTOR_PROMPT } from "@/config/prompts";

const fill = (tpl, vars) => tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");

// POST { role, dynamicVariables, history: [{ role: "user"|"assistant", text }] }
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { role, dynamicVariables = {}, history = [] } = req.body || {};
    const system = fill(role === "tutor" ? TUTOR_PROMPT : INTERVIEWER_PROMPT, dynamicVariables);
    const messages = history.length ? history : [{ role: "user", text: "(session started)" }];
    const text = await complete({ system, messages, maxTokens: 300 });
    return res.status(200).json({ text });
  } catch (error) {
    console.error("agent/mock-turn error:", error);
    return res.status(500).json({ error: error.message });
  }
}
