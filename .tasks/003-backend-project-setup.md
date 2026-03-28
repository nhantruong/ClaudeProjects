---
id: "003"
title: "Set up Node.js + Express backend project structure"
status: "done"
area: "backend"
agent: "@backend-developer"
priority: "high"
created_at: "2026-03-28"
due_date: null
started_at: "2026-03-28"
completed_at: "2026-03-28"
prd_refs: []
blocks: ["005", "007", "008", "009", "010", "016", "018"]
blocked_by: ["001"]
---

## Description

Scaffold the Node.js 20 + Express 4 backend with TypeScript, following the MVC structure defined in ARCHITECTURE.md. Set up the mssql connection pool, middleware stack (CORS, auth, validation, error handler), folder structure, and a working health-check endpoint. This task creates the foundation that all backend feature tasks build on.

**IMPORTANT**: This task is no longer a green-field scaffold. An existing production Express + TypeScript + mssql backend exists in the Timesheet app and is nearly identical to what Raphael needs. This task is about transplanting and adapting that code, not writing from scratch.

## Reuse Context

### Source Codebase

The Timesheet API lives at:
`D:\00. CloudData\Personal\OneDrive\MyApp\ClaudeProjects\Timesheet\apps\api\`

This is a production Express + TypeScript + mssql backend. The structure and patterns are the same as what Raphael requires.

### Files to Transplant

Copy the following files from the Timesheet API into Raphael's `server/` directory, then adapt as described:

| Source (Timesheet) | Destination (Raphael) | Adaptation required |
|--------------------|-----------------------|---------------------|
| `config/database.ts` | `server/src/lib/db.ts` | Simplify to a single connection pool — remove the dual-pool DMC/BIM logic that exists in the Timesheet version; Raphael has one database |
| `config/env.ts` | `server/src/lib/env.ts` | Update env var names to match Raphael's `.env.example` |
| `config/logger.ts` | `server/src/lib/logger.ts` | Keep as-is — Winston configuration is reusable unchanged |
| `middleware/auth.ts` | `server/src/middleware/auth.ts` | Adapt JWT logic to match Raphael's token payload (`userId`, `role`, `exp`) per ADR-002 |
| `middleware/errorHandler.ts` | `server/src/middleware/errorHandler.ts` | Keep as-is — standard error shape matches Raphael's API spec |
| `app.ts` | `server/src/app.ts` | Update route mounts to Raphael's routes; retain middleware stack order |
| `server.ts` | `server/src/server.ts` | Update port env var name if needed; keep structure |

### Package Manager Decision Required

The Timesheet app uses **pnpm workspaces + Turborepo**. Raphael's original spec used **npm**. Before transplanting, decide:

- **Option A — Keep npm**: Simpler, matches original spec. Transplant files only; do not adopt the pnpm/Turborepo monorepo structure.
- **Option B — Adopt pnpm + Turborepo**: Gives a proper monorepo with shared types between client and server. Higher setup cost but better long-term DX.

Document the decision in `docs/technical/DECISIONS.md` as ADR-005 before proceeding. The recommended default is Option A (npm) unless the human explicitly chooses otherwise, since complexity is not warranted for a team of this size.

### mssql Version

Use `mssql` **v11** (already in use in the Timesheet app — upgrade from v10 originally specified). This avoids introducing a version downgrade and keeps parity with the proven Timesheet configuration.

### Logger

Use **Winston** (already in Timesheet `config/logger.ts`). The original task spec mentioned `pino` — disregard that. Winston is already configured and battle-tested in the source codebase.

### Dependency on #001

The scaffold (folder structure, middleware, health endpoint, env wiring) can proceed without the database schema. The mssql connection pool can be configured with placeholder env vars and will simply fail to connect until the schema exists. Do not wait for #001 to complete before starting the scaffold — just do not write any SQL model files yet.

## Acceptance Criteria

- [x] `server/` directory created with `package.json`, `tsconfig.json`
- [x] Express app bootstrapped with TypeScript
- [x] Folder structure matches ARCHITECTURE.md: `routes/`, `controllers/`, `services/`, `models/`, `middleware/`, `lib/`
- [x] `mssql` connection pool configured in `server/src/lib/db.ts` — reads config from env vars
- [x] Middleware stack in place: CORS, JSON body parser, auth middleware stub, Zod validation factory, global error handler
- [x] `GET /health` endpoint returns `{ status: "ok" }` — used to verify server is running
- [x] `.env.example` file created with all required env var names (no values)
- [x] `npm run dev` starts the server with hot reload (tsx watch)
- [x] `npm run build` compiles TypeScript to `dist/`
- [x] `npm test` runs Vitest unit tests (Vitest configured; tests require `npm install` to run — no live DB needed for unit tests)
- [x] ESLint + Prettier configured
- [x] Package manager decision documented as ADR-005 in `docs/technical/DECISIONS.md`

## Technical Notes

- Node.js 20 LTS, Express 4.x
- Use `mssql` v11 (not v10 as originally specified — match Timesheet app version)
- Use `zod` for request validation
- Use `bcrypt` for password hashing (installed but not wired — auth task uses it)
- Logger: use **Winston** (transplanted from Timesheet `config/logger.ts`) — not pino
- The dual-pool database setup in Timesheet's `config/database.ts` must be reduced to a single pool for Raphael — Raphael has one database, not two
- Auth middleware must emit JWT payload shape `{ userId, role, exp }` per ADR-002 — verify the Timesheet version matches or adapt it
- See ARCHITECTURE.md for full middleware stack order and folder structure
- Timesheet source: `D:\00. CloudData\Personal\OneDrive\MyApp\ClaudeProjects\Timesheet\apps\api\`

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-03-28 | human | Task created during onboarding |
| 2026-03-28 | human | Existing Timesheet codebase and CurrentDb databases identified for reuse — task updated |
| 2026-03-28 | @backend-developer | Scaffold transplanted from Timesheet app — all infrastructure in place. Winston logger, mssql v11 single pool, JWT httpOnly cookie auth (ADR-002), Zod validation middleware, global error handler, health endpoint, six stub routers, controllers/services/models stubs, vitest config, unit tests for auth + errorHandler middleware. ADR-005 (npm, no monorepo) documented. |
