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
- Before finishing any task: `npm run check` (lint, typecheck, unit tests, build) must pass; also run `npm run test:e2e` when UI changes.

## Testing
- Tests never call the real Claude API. Create models only through `getModel()` in `src/lib/model.ts`; tests mock it with the helpers in `src/test/mock-model.ts`.
- Unit tests sit next to the code as `*.test.ts(x)` (Vitest). Component tests start with `// @vitest-environment jsdom`.
- E2E tests live in `e2e/` (Playwright) and intercept `/api/*` calls in the browser.
- CI (`.github/workflows/ci.yml`) runs all of this on every PR and push to `main`.

## Commands
- `npm run dev` start locally at http://localhost:3000
- `npm run build` production build
- `npm run lint` lint
- `npm run typecheck` TypeScript check
- `npm test` unit tests (Vitest); `npm run test:watch` to watch
- `npm run test:e2e` end-to-end tests (Playwright; reuses a running dev server)
- `npm run check` everything CI runs except e2e
