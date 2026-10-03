# Protégé

> The AI Apprentice — capture what an expert knows while they work, map it, and teach it to the next generation.

Built for **Hack-Nation × ElevenLabs — 7th Global AI Hackathon, Challenge 01: The AI Apprentice**.

## The idea

An ElevenLabs voice agent watches an expert's screen, stays quiet while they work, and asks *why* at natural pauses. After the task it runs a short debrief, explains the process back until the expert confirms it, and produces a **Work Map**. The same Work Map then powers a voice tutor that coaches a new hire on their own screen.

## Modules

| # | Module | What it does |
|---|--------|--------------|
| 1 | **Capture** | Screen share + voice agent in a side panel. Frames go to a vision model every 1–2 s and come back as events (e.g. "invoice 4471 opened", "cost center 4711 → 0400"). The agent asks ≥3 questions at natural pauses, ≥1 about a guardrail. |
| 2 | **Map** | Spoken debrief (≥3 follow-up questions + teach-back). Output: a clickable Work Map timeline — every step links to a screen moment, the decision, the reason in the expert's words, and its guardrails. |
| 3 | **Teach** | Voice tutor watches the new hire's screen, explains steps in the expert's words, asks them to predict decisions, and steps in before a guardrail is broken (replaying the expert's screen moment). |

## The Apprentice Test (our demo must answer)

1. **When to ask** — how do we detect pauses and stay quiet while the expert types/reads/talks?
2. **What to ask** — how do we pick questions that reveal reasons/guardrails, not what's already on screen?
3. **When it has understood** — how does the debrief decide it's done, and how does the teach-back prove it?
4. **Whether the new hire learned** — how do we show they handle a new case alone?
5. **Trust** — how can the expert go off the record, and how is personal data on screen protected?

## Stack (planned)

- **ElevenAgents** (interviewer + tutor), Expressive Mode
- **Scribe v2 Realtime** for listening / pause detection
- Vision model (Claude / Gemini / GPT) for screen-frame → events
- LLM for merging events + transcript + answers → Work Map JSON
- Microsoft Presidio for PII redaction

## Status

🚧 Skeleton in progress — project structure coming soon.
