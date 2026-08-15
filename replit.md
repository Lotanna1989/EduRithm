# EduRithm

An AI-powered coding education platform where students submit HTML assignments, receive Gemini-graded feedback, fix flagged work in an interactive code+preview workspace, and learn from a curated concept library.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/edurithm run dev` — run the frontend (Vite, port 24846)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `GEMINI_API_KEY`, `SESSION_SECRET`, optionally `INSTRUCTOR_PASSWORD` (defaults to `edurithm2025`)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 18 + Vite + Tailwind CSS + Wouter routing
- API: Express 5 + cookie-session
- AI: `@google/genai` (Gemini 2.5 Flash) — grading + Fix It chat
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for API contract
- `lib/db/src/schema/edurithm.ts` — all EduRithm Drizzle table definitions
- `artifacts/api-server/src/lib/gemini.ts` — Gemini grading + chat helpers (update the grading prompt here)
- `artifacts/api-server/src/routes/` — Express route handlers (assignments, submissions, instructor, learn)
- `artifacts/edurithm/src/pages/` — all frontend pages (home, fix-it, learn, instructor, instructor-upload)
- `artifacts/edurithm/src/components/shared.tsx` — shared UI components

## Architecture decisions

- **OpenAPI-first**: all routes are spec'd in `openapi.yaml`; Orval generates React Query hooks and Zod validators automatically.
- **Zod v3 compat**: avoid `format: uuid` and `type: integer` in the OpenAPI spec — the installed Zod runtime doesn't expose `.uuid()` or `.int()`. Use plain `type: string` and `type: number` instead.
- **Session-based instructor auth**: cookie-session (not JWT) keeps the instructor flow dead simple — one shared password, no user accounts.
- **Chat cap enforced server-side**: the 5-message per submission limit is checked in `submissions.ts`, not just the frontend, so it cannot be bypassed.
- **Gemini call logging**: every grading and chat call is recorded in `edurithm_gemini_calls` with a timestamp, request, and response for audit purposes.

## Product

- **Student upload** (`/`): select level + track → get random assignment → fill in name/ID → upload `.html` → see score, explanation, corrected snippet → link to Fix It if flagged.
- **Fix It workspace** (`/fix/:id`): code editor + live iframe preview side-by-side, grading breakdown, corrected snippet with copy button, capped Gemini chat (5 questions).
- **Learn** (`/learn`): searchable concept library (8 concepts seeded) with code examples and YouTube links.
- **Instructor dashboard** (`/instructor`): password gate → summary metrics → filterable submissions table → row detail drawer → batch upload page.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any OpenAPI spec change, run codegen and inspect `lib/api-zod/src/generated/api.ts` for `.uuid()` or `.int()` calls before restarting the API — they crash at module init time.
- The API server uses `SESSION_SECRET` from env — it will throw on startup if missing.
- Instructor password defaults to `edurithm2025`; override with `INSTRUCTOR_PASSWORD` env var.
- The seeded assignment questions are placeholders — replace them in `edurithm_assignments` table with the real instructor-provided list.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
