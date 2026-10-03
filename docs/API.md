# Backend API (UI ↔ backend contract)

The pages call these endpoints; the voice agents reach the backend only through
client tools that the page implements. All bodies are JSON. Errors come back as
`{ "error": "..." }` with a 4xx/5xx status.

`at` is always milliseconds since the session started (from `useLiveSession().getAt()`):
the "screen moment" key the Work Map links to.

## Flow

```
create workflow ─► capture session ─► POST map (draft) ─► debrief session ─► teach-back ─► POST map {finalize} ─► teach session
                    events, frames,    steps + open        resolve_question    confirm_teach_back   map confirmed,
                    transcript         questions                                                     workflow "mapped"
```

## Workflows

| Method & path | Body | Returns |
|---|---|---|
| `GET /api/workflows` | | `{ workflows }` |
| `POST /api/workflows` | `{ title, scenario, expertName }` | `{ workflow }` |
| `GET /api/workflows/[id]` | | `{ workflow, sessions, workMap }` (`id` may be `demo`) |
| `POST /api/workflows/[id]/map` | `{ finalize?: boolean }` | `{ workMap }` |

`POST .../map` builds a new Work Map version from every capture and debrief session
(10 to 30 s). Call it once after capture (draft + open questions for the debrief),
optionally again after debrief answers, and with `finalize: true` after the teach-back
(409 before that). Answers and the teach-back carry over between versions.

Every step's moment, reason and guardrail is checked against the sessions;
whatever fails is removed and turned into an open question. `workMap.verification.removed`
lists what was removed and why (good for a "verified" badge in the UI).

## Sessions

| Method & path | Body | Returns |
|---|---|---|
| `POST /api/sessions` | `{ workflowId, kind: capture\|debrief\|teach, participantName }` | `{ session }` (use `useLiveSession`) |
| `GET /api/sessions/[id]` | | `{ session }` |
| `PATCH /api/sessions/[id]` | `{ status?, elevenConversationId?, mastery? }` | `{ session }` |
| `POST /api/sessions/[id]/frame` | `{ frameBase64, at }` | `{ activity, events }` (ScreenShare does this) |
| `POST /api/sessions/[id]/transcript` | `{ role: agent\|user, text, at }` | `{ turnIndex }` (AgentPanel does this) |
| `POST /api/sessions/[id]/off-record` | `{ on: boolean, at }` | |
| `POST /api/sessions/[id]/resolve-question` | `{ index, answer, at }` | `{ resolved, openLeft }` (debrief only) |
| `POST /api/sessions/[id]/teach-back` | `{ summary, corrections: [], at }` | `{ confirmed, openLeft }` (debrief only) |
| `POST /api/sessions/[id]/guardrail-check` | `{ at, action: { type, summary, invoice } }` | `{ verdict }` (teach only, sandbox ERP does this) |
| `POST /api/sessions/[id]/intervention` | `{ at, stepIndex, guardrail, learnerAction, outcome }` | (teach only) |
| `POST /api/sessions/[id]/mastery` | `{ mastered?, practice? }` | `{ mastery }` (teach only; empty body = summarize) |
| `GET /api/frames/[id]` | | the stored screen frame (`<img src={"/" + frameKey}>`) |

## Voice agents and their client tools

`POST /api/agent/session { sessionId }` picks the agent from the session kind
(capture/debrief → interviewer, teach → tutor) and builds its variables server-side.
`AgentPanel` handles that; pages only pass `clientTools`. Tool definitions live in
`src/config/prompts.js` (`TOOLS`), shared by ElevenLabs and mock voice.

| Agent | Tool | Input | Page implementation |
|---|---|---|---|
| Interviewer (debrief) | `resolve_question` | `{ index, answer }` | `useDebriefTools` |
| Interviewer (debrief) | `confirm_teach_back` | `{ summary, corrections }` | `useDebriefTools` |
| Tutor | `replay_moment` | `{ step_index }` | teach page |
| Tutor | `log_intervention` | `{ step_index, guardrail, learner_action, outcome }` | teach page |
| Tutor | `finish_lesson` | `{ mastered, practice }` | teach page |

### Debrief page wiring

```jsx
import { useDebriefTools } from "@/lib/useDebriefTools";

const clientTools = useDebriefTools({
  sessionId: session?._id,
  workflowId: workflow?._id,
  getAt,
  onChange: (e) => {
    // question_resolved | teach_back_confirmed | map_finalized | map_failed
    loadData();
  },
});

<AgentPanel clientTools={clientTools} sessionId={session._id} getAt={getAt} controlRef={controlRef} ... />
```

Before starting the debrief, the workflow needs a draft map: `POST /api/workflows/[id]/map`
once after capture, otherwise the interviewer has no open questions.

Pages send screen events and pauses to the agent with `controlRef.current.sendContext(text)`.
Special updates: `PAUSE` (the user stopped working, the agent may speak), and for the
tutor `ALERT step N: ...` and `LESSON DONE`.
