@AGENTS.md

# Project Aligner

Business software that keeps organizations aligned and accountable to their core mission.

## Stack
- Next.js (App Router, `src/` dir) + TypeScript + Tailwind CSS
- AI: Vercel AI SDK (`ai`) with the Anthropic provider (`@ai-sdk/anthropic`); model set by `ANTHROPIC_MODEL`
- Hosting: Vercel (preview deploy on every PR, production on `main`)
- Data and auth: Supabase (Postgres, email + Google sign in) via `@supabase/ssr`; schema in `supabase/migrations/`
- Map canvas: React Flow (`@xyflow/react`) with dagre auto layout

## Data and auth
- `src/proxy.ts` refreshes the session and routes signed-out people to `/login`.
- Server code gets a user-scoped client from `src/lib/supabase/server.ts`; row level security limits every query to the owner's rows. Never use a service-role key in the app.
- Map reads and writes go through `src/lib/maps/repository.ts`; server actions in `src/app/maps/actions.ts` re-check the session and validate input with zod.
- Map rules (adding nodes, variations, validation) are pure functions in `src/lib/map/`.
- Cache Components is on: anything that reads cookies or params must render inside `<Suspense>`.
- Google Docs linking uses only the `drive.file` scope and only reads file metadata (`src/lib/google/`). Refresh tokens are encrypted with `GOOGLE_TOKEN_ENCRYPTION_KEY` before they reach Supabase. Never request broader Google scopes without asking.
- Tests never call Google: stub `fetch`, or mock `@/app/maps/google-actions` in component tests.

## Conventions
- Server code calls Claude; never expose `ANTHROPIC_API_KEY` to the client.
- API routes live in `src/app/api/*/route.ts`. Shared UI in `src/components/`.
- Validate inputs with `zod`.
- Before finishing any task: `npm run check` (lint, typecheck, unit tests, build) must pass; also run `npm run test:e2e` when UI changes.

## Testing
- Tests never call the real Claude API. Create models only through `getModel()` in `src/lib/model.ts`; tests mock it with the helpers in `src/test/mock-model.ts`.
- Unit tests sit next to the code as `*.test.ts(x)` (Vitest). Component tests start with `// @vitest-environment jsdom`.
- Tests never call real Supabase: repository tests use `src/test/fake-supabase.ts`; component tests mock the server action modules.
- Canvas component tests call `stubReactFlowDom()` from `src/test/react-flow-jsdom.ts` and select nodes with `fireEvent.click`.
- E2E tests live in `e2e/` (Playwright) and cover signed-out flows (CI has no Supabase project).
- CI (`.github/workflows/ci.yml`) runs all of this on every PR and push to `main`.

## Commands
- `npm run dev` start locally at http://localhost:3000
- `npm run build` production build
- `npm run lint` lint
- `npm run typecheck` TypeScript check
- `npm test` unit tests (Vitest); `npm run test:watch` to watch
- `npm run test:e2e` end-to-end tests (Playwright; reuses a running dev server)
- `npm run check` everything CI runs except e2e
