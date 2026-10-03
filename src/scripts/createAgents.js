// npm run create-agents: creates (or updates in place) the two ElevenLabs
// agents and prints their IDs for .env.local. Zero npm dependencies, so CI can
// run it without `npm ci`. Ported from haggle's createAgents.js.
//
// Both agents are generic templates. Everything workflow-specific arrives as
// {{dynamic_variables}} built server-side by src/backend/services/agentVars.js.

const fs = require("fs");
const path = require("path");
const { INTERVIEWER_PROMPT, TUTOR_PROMPT, TOOLS } = require("../config/prompts");

function loadEnv() {
  const file = path.join(__dirname, "..", "..", ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

// Shared tool definition (src/config/prompts.js TOOLS) -> ElevenLabs client tool.
const clientTool = ({ name, description, schema }) => ({
  type: "client",
  name,
  description,
  expects_response: true,
  response_timeout_secs: 20,
  parameters: schema,
});

const SYSTEM_TOOLS = [
  { type: "system", name: "end_call" },
  { type: "system", name: "language_detection" },
];

const LLM = "claude-sonnet-4-6";

// Calm, patient voice on the expressive v3 conversational model (the brief
// asks for Expressive Mode). Same voice for both roles: the apprentice that
// learned from the expert is audibly the one teaching the new hire.
const TTS = {
  voice_id: "cgSgspJ2msm6clMCkdW9",
  model_id: "eleven_v3_conversational",
  expressive_mode: true,
  stability: 0.6,
  similarity_boost: 0.8,
};

// The expert explains in German, the tutor may teach in English (stretch goal).
const LANGUAGES = { de: { overrides: {} } };

// Interviewer (Modules 1 + 2). The first message comes from {{opening_line}}:
// empty in capture mode (silent until the page sends "PAUSE"), a short opener
// in debrief mode. Never re-engage on silence, since silence is the expert
// working.
const interviewerAgent = {
  name: "Protégé · Interviewer",
  conversation_config: {
    turn: { turn_timeout: -1 },
    tts: TTS,
    language_presets: LANGUAGES,
    agent: {
      first_message: "{{opening_line}}",
      prompt: {
        prompt: INTERVIEWER_PROMPT,
        llm: LLM,
        tools: [...TOOLS.interviewer.map(clientTool), ...SYSTEM_TOOLS],
      },
    },
  },
};

// Tutor (Module 3). Watches the new hire's screen via contextual updates and
// steps in on "ALERT" (server-side guardrail check) before a wrong save.
const tutorAgent = {
  name: "Protégé · Tutor",
  conversation_config: {
    turn: { turn_timeout: -1 },
    tts: TTS,
    language_presets: LANGUAGES,
    agent: {
      first_message:
        "Hi, I'm Protégé. I learned this task from {{expert_name}}. Open the first invoice whenever you're ready, I'll be right here.",
      prompt: {
        prompt: TUTOR_PROMPT,
        llm: LLM,
        tools: [...TOOLS.tutor.map(clientTool), ...SYSTEM_TOOLS],
      },
    },
  },
};

async function eleven(url, method, payload) {
  const res = await fetch(`https://api.elevenlabs.io${url}`, {
    method,
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`${method} ${url} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// Update in place when the agent already exists, keeping the same id. The
// display name is not sent on update, so a rename in the dashboard sticks.
async function upsertAgent(existingId, payload) {
  if (existingId) {
    const { name, ...config } = payload;
    await eleven(`/v1/convai/agents/${existingId}`, "PATCH", config);
    return { id: existingId, action: "Updated" };
  }
  const data = await eleven("/v1/convai/agents/create", "POST", payload);
  return { id: data.agent_id, action: "Created" };
}

async function main() {
  loadEnv();
  if (!process.env.ELEVENLABS_API_KEY) {
    console.error("ELEVENLABS_API_KEY is not set (put it in .env.local)");
    process.exit(1);
  }
  // CI may only update the two known agents. Creating there would mint a new
  // agent on every push if a secret is missing, and nobody sees the IDs.
  if (process.env.CI && !(process.env.ELEVENLABS_INTERVIEWER_AGENT_ID && process.env.ELEVENLABS_TUTOR_AGENT_ID)) {
    console.error("CI run refused: ELEVENLABS_INTERVIEWER_AGENT_ID and ELEVENLABS_TUTOR_AGENT_ID must be set as secrets.");
    process.exit(1);
  }
  const interviewer = await upsertAgent(process.env.ELEVENLABS_INTERVIEWER_AGENT_ID, interviewerAgent);
  console.log(`${interviewer.action} interviewer agent: ${interviewer.id}`);
  const tutor = await upsertAgent(process.env.ELEVENLABS_TUTOR_AGENT_ID, tutorAgent);
  console.log(`${tutor.action} tutor agent:       ${tutor.id}`);
  if (interviewer.action === "Created" || tutor.action === "Created") {
    console.log("\nAdd to .env.local:\n");
    console.log(`ELEVENLABS_INTERVIEWER_AGENT_ID=${interviewer.id}`);
    console.log(`ELEVENLABS_TUTOR_AGENT_ID=${tutor.id}`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
