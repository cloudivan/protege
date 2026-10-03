# Project rules

- Read [ARCHITECTURE.md](ARCHITECTURE.md) before touching code.
- **Never kill or restart the dev server** (`next dev`, port 3002). If a restart is needed (e.g. after `.env.local` changes), ask the user to do it and wait.
- **No em dashes** in website copy or code comments. Rewrite with a period, comma, colon, or parentheses instead.
- Plain JavaScript/JSX, Pages Router, Tailwind. No TypeScript.
- Develop with `NEXT_PUBLIC_VOICE_MODE=mock` unless you are testing real voice. ElevenLabs credits are limited.
