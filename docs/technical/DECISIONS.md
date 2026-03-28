<!--
DOCUMENT METADATA
Owner: @systems-architect
Update trigger: Any significant architectural, technology, or design pattern decision is made
Update scope: Append new ADRs only. Never edit the body of an Accepted ADR.
Read by: All agents. Check this file before proposing changes that may conflict with prior decisions.
-->

# Architecture Decision Records

> This log captures the context and reasoning behind key decisions so they are never lost.
>
> **Rule**: Once an ADR is marked **Accepted**, do not edit its body. If a decision needs to change, write a new ADR that explicitly supersedes the old one. Add `**Status**: Superseded by ADR-XXX` to the old record.
>
> **Agents**: Read the relevant ADRs before proposing architectural changes. A proposal that contradicts an Accepted ADR needs a new ADR — not a silent override.

---

## Decision Index

| ID | Title | Status | Date |
|----|-------|--------|------|
| ADR-001 | Initial tech stack selection — React + Node.js + MS SQL Server | Accepted | 2026-03-28 |
| ADR-002 | Authentication — JWT in httpOnly cookies | Accepted | 2026-03-28 |
| ADR-003 | AI provider — Claude API (primary) + Ollama (local fallback) | Accepted | 2026-03-28 |
| ADR-004 | Real-time updates — React Query polling for v1 | Accepted | 2026-03-28 |
| ADR-005 | Auth state management — Zustand with persist (not React context) | Accepted | 2026-03-28 |
| ADR-006 | Frontend router — TanStack Router over React Router v6 | Accepted | 2026-03-28 |
| ADR-005 | Package manager — npm (single package, no monorepo) | Accepted | 2026-03-28 |

---

## ADR-001: Initial Tech Stack Selection — React + Node.js + MS SQL Server

**Date**: 2026-03-28
**Status**: Accepted
**Deciders**: Raphael (project owner) / @systems-architect

### Context

This is a new internal project and task management system for a small team (≤10 people) of electromechanical engineers, BIM managers, and coders. The project owner has existing experience with MVC architecture, HTML, and Java. The team needs a web-based tool that works on desktop, tablet, and mobile. The system will be self-hosted on existing infrastructure (local machine + remote server at 103.27.60.66) with no cloud hosting budget. MS SQL Server is already available on the infrastructure. The initial version must be buildable by a single developer (the project owner, assisted by AI agents).

### Options Considered

1. **Java Spring Boot + Thymeleaf + MS SQL Server**: Aligns directly with the owner's Java/MVC background. Pros: familiar language, mature ecosystem, strong typing. Cons: slower to build UI-heavy features (Kanban, Gantt), Thymeleaf templates are less capable than modern React for complex interactive views, larger deployment footprint.

2. **React + Node.js/Express + MS SQL Server** *(chosen)*: JavaScript/TypeScript full stack. Pros: React enables the rich interactive UI required (drag-drop Kanban, Gantt, real-time updates); Node.js shares language with frontend reducing context switches; large ecosystem for Gantt/calendar libraries; npm package manager handles both sides; MVC pattern on the backend is familiar. Cons: owner is newer to React than Java, but TypeScript adds safety.

3. **Next.js (full-stack) + MS SQL Server**: Would unify frontend and backend in one framework. Pros: less project configuration. Cons: Next.js App Router is complex to learn; server components pattern conflicts with rich client-side state needed for Kanban drag-drop and Gantt; harder to self-host than a simple Express + static build.

### Decision

Chose **React 18 + Vite (frontend) and Node.js 20 + Express (backend)** with MS SQL Server and raw SQL via the `mssql` driver. The primary reason is that the product requires a highly interactive UI (Kanban drag-drop, Gantt timeline, real-time dashboard) which React handles far better than server-side templating. Node.js keeps the language consistent across the stack. Raw SQL was chosen over an ORM because the owner specified it directly and it gives full control over MS SQL Server-specific query patterns.

### Consequences

- **Positive**: React enables all the interactive UI features in the PRD without compromise. TypeScript across the full stack catches errors early. Large npm ecosystem means libraries exist for Gantt charts (e.g., `frappe-gantt` or `dhtmlx-gantt`) and drag-drop (e.g., `@dnd-kit`).
- **Negative**: Two separate processes to run in development (client + server). The project owner will need to learn React patterns — mitigated by AI agent assistance. Raw SQL requires more boilerplate than an ORM.
- **Neutral**: Deployment is two build artifacts (static client files + Node.js server) served from the same machine.

---

---

## ADR-002: Authentication — JWT in httpOnly Cookies

**Date**: 2026-03-28
**Status**: Accepted
**Deciders**: Raphael (project owner) / @systems-architect

### Context

Raphael is an internal tool requiring authentication on all endpoints. Options considered: session token stored in DB, JWT in localStorage, JWT in httpOnly cookie. The team is small (≤10 users) so scale is not a concern. Security and simplicity are the primary drivers.

### Options Considered

1. **Session token in DB**: Token issued on login, stored in `sessions` table, validated on every request via DB lookup. Pros: easily revocable. Cons: DB round-trip on every request; more tables to manage.
2. **JWT in localStorage**: Signed token stored client-side in localStorage. Pros: simple. Cons: vulnerable to XSS — any injected script can steal the token.
3. **JWT in httpOnly cookie** *(chosen)*: Signed token stored in a cookie with `httpOnly` and `SameSite=Strict` flags. Pros: JS cannot read it (XSS-safe); stateless (no DB lookup per request); easy to implement. Cons: CSRF protection required (handled by `SameSite=Strict`).

### Decision

Use **JWT signed with `SESSION_SECRET`**, stored in an `httpOnly`, `SameSite=Strict` cookie. Token contains `userId`, `role`, and `exp` (30-day expiry). Auth middleware verifies the JWT signature on every protected request — no DB lookup required.

### Consequences

- **Positive**: No DB lookup per request = faster API responses. Token cannot be stolen via XSS. Simple to implement with `jsonwebtoken` + `cookie-parser`.
- **Negative**: Tokens cannot be individually revoked before expiry (acceptable for this use case — logout just clears the cookie client-side). If `SESSION_SECRET` is rotated, all sessions are invalidated.
- **Neutral**: The `sessions` table in the database schema is no longer needed — can be removed during schema design.

---

## ADR-003: AI Provider — Claude API (Primary) + Ollama (Local Fallback)

**Date**: 2026-03-28
**Status**: Accepted
**Deciders**: Raphael (project owner) / @systems-architect

### Context

The Raphael AI advisor requires a language model to generate daily briefings and answer natural language questions about project status. The project owner wants both cloud AI (Claude API) and local AI (Ollama) supported.

### Options Considered

1. **OpenAI GPT-4 only**: Strong reasoning, widely documented. Cons: paid API, data leaves premises, single provider dependency.
2. **Ollama (local) only**: Fully offline, no API costs, data stays on-premises. Cons: quality varies by model; requires local hardware capable of running LLMs.
3. **Claude API (primary) + Ollama (fallback)** *(chosen)*: Best of both — cloud quality when connected, local capability when offline or for cost control.

### Decision

The `AI_PROVIDER` environment variable controls which backend is used: `anthropic` (default) calls the Claude API via `@anthropic-ai/sdk`; `ollama` calls a local Ollama instance via its HTTP API. Both share the same prompt format. Default model: `claude-haiku-4-5-20251001` for cost efficiency on daily briefings; `claude-sonnet-4-6` available for deeper Q&A if needed.

### Consequences

- **Positive**: Flexibility — switch providers without code changes. Ollama enables offline/airgapped use. Claude API provides highest quality for the advisor role.
- **Negative**: Two code paths to maintain in the AI service. Ollama response quality depends on the local model installed.
- **Neutral**: `AI_PROVIDER`, `AI_API_KEY`, and `OLLAMA_URL` all controlled by env vars.

---

## ADR-004: Real-Time Updates — React Query Polling for v1

**Date**: 2026-03-28
**Status**: Accepted
**Deciders**: Raphael (project owner) / @systems-architect

### Context

The Kanban board and dashboard benefit from showing updates made by other team members without requiring a manual refresh. Options: WebSockets (true real-time push), Server-Sent Events (one-way push), or HTTP polling (periodic re-fetch).

### Options Considered

1. **WebSockets (Socket.io)**: True real-time, bidirectional. Pros: instant updates. Cons: requires persistent connection infrastructure, more complex to implement and deploy on self-hosted server, overkill for a team of ≤10.
2. **Server-Sent Events**: One-way push from server. Pros: simpler than WebSockets. Cons: still requires persistent connection; less browser support in some scenarios.
3. **React Query polling** *(chosen)*: `refetchInterval: 30000` (30 seconds) on key queries. Pros: zero infrastructure overhead, already using React Query, trivial to implement. Cons: 30-second latency on cross-user updates — acceptable for a small team.

### Decision

Use **React Query `refetchInterval`** (30-second polling) on the dashboard, Kanban board, and task list queries. No WebSocket infrastructure needed for v1. If the team finds 30-second latency unacceptable in practice, upgrade to Socket.io in v2 — this is a contained change in the data-fetching layer.

### Consequences

- **Positive**: Zero additional infrastructure. Works reliably behind any proxy or firewall. Trivial to implement.
- **Negative**: Up to 30 seconds before another user's change appears. Not truly real-time.
- **Neutral**: React Query's background refetch is invisible to users when tab is in focus.

---

## ADR-005: Auth State Management — Zustand with Persist (Not React Context)

**Date**: 2026-03-28
**Status**: Accepted
**Deciders**: @frontend-developer (transplant decision during task #004)

### Context

The original architecture spec described using React context for global auth state (authenticated user, role). During task #004 the existing Timesheet app was identified as a reuse source. That app uses Zustand with the `persist` middleware, which stores auth state to `localStorage` and rehydrates it on page load. This is a more capable solution than React context.

### Options Considered

1. **React context** *(original spec)*: Standard React pattern, no extra library. Cons: loses state on page refresh (requires token re-validation on every load), more boilerplate to implement auth guard logic cleanly.
2. **Zustand with `persist`** *(chosen)*: Auth state survives page refresh via localStorage. `useAuthStore.getState()` allows synchronous reads outside of React components (needed in Axios interceptors and route `beforeLoad` guards). Matches the Timesheet app pattern, enabling direct transplant.

### Decision

Use **Zustand** (`create` + `persist` middleware) for auth state. Store key: `raphael-auth`. Persisted fields: `user`, `accessToken`, `isAuthenticated`. The `logout()` action clears all three. Synchronous reads via `useAuthStore.getState()` are used in the Axios 401 interceptor and TanStack Router `beforeLoad` guards — this is not possible with React context.

### Consequences

- **Positive**: Auth state survives page refresh without an extra network round-trip. Route guards work synchronously. Axios interceptor can read the token outside React. Direct transplant from Timesheet app reduces implementation time.
- **Negative**: Adds Zustand as a dependency (already listed for other state purposes, so no net addition). localStorage is readable by JS — only a concern if XSS is possible; mitigated by not storing sensitive data beyond the access token which is short-lived.
- **Neutral**: The original spec's mention of React context for auth is superseded by this decision.

---

## ADR-006: Frontend Router — TanStack Router over React Router v6

**Date**: 2026-03-28
**Status**: Accepted
**Deciders**: @frontend-developer (transplant decision during task #004)

### Context

The original architecture spec specified React Router v6. Task #004 identified the Timesheet app (reuse source) as using TanStack Router v1 with code-based route definitions. A decision was required before implementing routing.

### Options Considered

1. **React Router v6** *(original spec)*: Widely documented, large community. Cons: does not match the Timesheet app; no transplant advantage; `beforeLoad` auth guard pattern is different from TanStack Router.
2. **TanStack Router v1** *(chosen)*: Already used in the Timesheet app. Has first-class TypeScript route typing, synchronous `beforeLoad` hooks that integrate cleanly with Zustand's `getState()` for auth guards, and type-safe `redirect()`. Code-based (not file-based) routing is simpler to understand for a new codebase.

### Decision

Use **TanStack Router v1** for all client-side routing. Route definitions live in `client/src/router.tsx`. Auth guards use `beforeLoad` with `useAuthStore.getState().isAuthenticated` — synchronous, no async needed. The router is registered in the `@tanstack/react-router` module augmentation so all `Link` and `redirect` calls are fully typed.

### Consequences

- **Positive**: Full TypeScript type safety on routes, params, and redirects. Auth guard pattern is clean and synchronous. Transplant from Timesheet app is straightforward — same API surface.
- **Negative**: TanStack Router has a smaller community than React Router; some questions may be harder to find answers to. Team must learn TanStack Router patterns.
- **Neutral**: File-based routing (the more popular TanStack Router pattern) is not used — code-based routing is simpler for this project size.

---

## ADR-005: Package Manager — npm (Single Package, No Monorepo)

**Date**: 2026-03-28
**Status**: Accepted
**Deciders**: Raphael (project owner) / @backend-developer

### Context

The Timesheet source codebase being transplanted uses **pnpm workspaces + Turborepo** as a monorepo. Raphael's original specification called for **npm**. A decision was required before scaffolding the backend on whether to adopt the monorepo tooling or keep the simpler npm setup.

### Options Considered

1. **npm, single packages per workspace layer (chosen)**: Each layer (`server/`, `client/`) has its own `package.json`. No shared-types package. Pros: simple to understand, no monorepo tooling knowledge required, lower CI/CD overhead, matches original spec. Cons: no compile-time sharing of types between client and server — types must be duplicated or communicated via API contracts.

2. **pnpm + Turborepo monorepo**: Mirror the Timesheet setup. Add a `packages/shared-types` workspace. Pros: single source of truth for types shared between frontend and backend, faster installs. Cons: adds significant complexity (workspace symlinks, Turborepo pipeline config, requires pnpm on all dev machines), overkill for a team of ≤10 with two workspace layers.

### Decision

Use **npm** with separate `package.json` files per layer (`server/`, `client/`). No shared-types package. The team is small, the project has two layers (not many micro-services), and monorepo tooling would add friction without proportionate benefit. If shared types become painful to maintain in the future, migration to pnpm workspaces is straightforward.

### Consequences

- **Positive**: Simpler `npm install` workflow, no Turborepo configuration, no pnpm version constraint on dev machines.
- **Negative**: TypeScript types for API request/response shapes must be manually kept in sync between `server/` and `client/`. Mitigated by documenting shapes in `docs/technical/API.md`.
- **Neutral**: Both layers still use TypeScript strict mode — type safety within each layer is preserved.

---

<!--
TEMPLATE FOR NEW ADRs — copy this block when adding a new record:

## ADR-[NNN]: [Short Title]

**Date**: YYYY-MM-DD
**Status**: Accepted
**Deciders**: [Human name(s)] / @systems-architect

### Context
[What situation or problem prompted this decision. Include relevant constraints.]

### Options Considered
1. **[Option A]**: [Description] — Pros: [...] Cons: [...]
2. **[Option B]**: [Description] — Pros: [...] Cons: [...]

### Decision
[What was decided and the primary reason why.]

### Consequences
- **Positive**: [What becomes easier or better]
- **Negative**: [Trade-offs or what becomes harder]
- **Neutral**: [What changes but is neither better nor worse]
-->
