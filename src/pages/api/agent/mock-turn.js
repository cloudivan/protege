// Mock voice: one agent turn as text, using the same prompt and the same
// client tools the ElevenLabs agent runs. Lets the team build without
// spending voice credits.
import { complete, completeWithTools } from "@/backend/services/llm";
import { INTERVIEWER_PROMPT, TUTOR_PROMPT, TOOLS } from "@/config/prompts";

const fill = (tpl, vars) => tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");

// POST { role, dynamicVariables, history: [{ role: "user"|"assistant", text }] }
// -> { text, toolCalls: [{ name, input }] }. The browser runs the tool calls
// through the page's clientTools, like the real agent's client tools.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { role, dynamicVariables = {}, history = [] } = req.body || {};
    const isTutor = role === "tutor";
    const system = fill(isTutor ? TUTOR_PROMPT : INTERVIEWER_PROMPT, dynamicVariables);
    const messages = history.length ? history : [{ role: "user", text: "(session started)" }];
    const tools = isTutor ? TOOLS.tutor : TOOLS.interviewer;

    let { text, toolCalls } = await completeWithTools({ system, history: messages, tools, maxTokens: 300 });
    // A real agent speaks after its tools return. One plain follow-up turn
    // gets that line without replaying tool calls through the provider.
    if (!text && toolCalls.length) {
      const done = toolCalls.map((t) => t.name).join(", ");
      text = await complete({
        system: `${system}\n\n(You just called: ${done}. The tools succeeded. Now say your next line, one or two sentences, no tool names.)`,
        messages,
        maxTokens: 200,
      });
    }
    return res.status(200).json({ text, toolCalls: toolCalls.map(({ name, input }) => ({ name, input })) });
  } catch (error) {
    console.error("agent/mock-turn error:", error);
    return res.status(500).json({ error: error.message });
  }
}
