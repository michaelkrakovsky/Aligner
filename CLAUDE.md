@AGENTS.md

# Project Aligner

Business software that keeps organizations aligned and accountable to their core mission.

## Stack
- Next.js (App Router, `src/` dir) + TypeScript + Tailwind CSS
- AI: Vercel AI SDK (`ai`) with the Anthropic provider (`@ai-sdk/anthropic`); model set by `ANTHROPIC_MODEL`
- Hosting: Vercel (preview deploy on every PR, production on `main`)
- Planned: Supabase (Postgres + auth) when we need data and users

## Conventions
- Server code calls Claude; never expose `ANTHROPIC_API_KEY` to the client.
- API routes live in `src/app/api/*/route.ts`. Shared UI in `src/components/`.
- Validate inputs with `zod`.
- Before finishing any task: `npm run lint` and `npm run build` must pass.

## Commands
- `npm run dev` start locally at http://localhost:3000
- `npm run build` production build
- `npm run lint` lint
