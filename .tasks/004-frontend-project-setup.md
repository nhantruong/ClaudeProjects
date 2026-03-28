---
id: "004"
title: "Set up React + Vite frontend project structure"
status: "done"
area: "frontend"
agent: "@frontend-developer"
priority: "high"
created_at: "2026-03-28"
due_date: null
started_at: null
completed_at: "2026-03-28"
prd_refs: ["FR-090", "FR-091"]
blocks: ["006", "011", "012", "013", "014", "015", "017", "019"]
blocked_by: ["002"]
---

## Description

Scaffold the React + Vite frontend with TypeScript, Tailwind CSS, React Query, and a router. Set up the folder structure, API client, auth state, and a basic shell layout (sidebar nav, main content area). This task creates the foundation that all frontend feature tasks build on. The design tokens from task #002 must be available before the full layout is styled, but the scaffolding can start with placeholder tokens.

**IMPORTANT**: This task is no longer a green-field scaffold. An existing production React + Vite + TypeScript + Tailwind frontend exists in the Timesheet app and can be transplanted. This task is about copying and adapting that code, not writing from scratch.

## Reuse Context

### Source Codebase

The Timesheet web app lives at:
`D:\00. CloudData\Personal\OneDrive\MyApp\ClaudeProjects\Timesheet\apps\web\`

This is a production-quality React frontend using the same intended stack. Most of the infrastructure layer can be lifted directly.

### Files to Transplant

Copy the following files from the Timesheet web app into Raphael's `client/` directory, then adapt as described:

| Source (Timesheet) | Destination (Raphael) | Adaptation required |
|--------------------|-----------------------|---------------------|
| `lib/api/client.ts` | `client/src/lib/api.ts` | Update base URL env var to `VITE_API_URL`; retain Axios instance with 401 auto-refresh logic |
| `lib/stores/auth.store.ts` | `client/src/lib/stores/auth.ts` | Update user shape to Raphael's `{ userId, role }` token payload; keep Zustand persist pattern |
| `lib/utils.ts` | `client/src/lib/utils.ts` | Keep `cn()` helper; remove or replace `formatHours()` with Raphael-specific utilities |
| `components/layout/AppShell.tsx` | `client/src/components/layout/AppShell.tsx` | Update nav links to Raphael routes; retain collapsible sidebar + topbar structure |

### React Version

The Timesheet app uses **React 19** (not React 18 as originally specified). Use React 19 for Raphael — there are no known blockers. Update `package.json` accordingly.

### Router Decision Required

The Timesheet app uses **TanStack Router** (file-based routing). Raphael's original spec specified **React Router v6**. Before proceeding, decide:

- **Option A — Use TanStack Router**: Already installed and configured in the Timesheet app; file-based routing is familiar to the codebase. Transplanting the router config is straightforward. Cons: additional learning surface vs. React Router.
- **Option B — Use React Router v6**: Original spec. More widely documented. Cons: does not match the Timesheet app pattern; no transplant advantage.

Document the decision in `docs/technical/DECISIONS.md` as ADR-006 before implementing routing. The recommended default is **Option A (TanStack Router)** to match the Timesheet app and reduce divergence, but defer to human preference.

### Auth State Management

The Timesheet app uses **Zustand** with the `persist` middleware for auth state (not React context as originally planned). Use Zustand for Raphael — this is already the more capable solution and the transplant saves implementation time. The original spec's mention of React context for auth can be disregarded.

### API Client

The Timesheet app uses **Axios** (not a raw fetch wrapper). The existing `client.ts` includes 401 token refresh logic. Transplant this as-is and update only the env var name and token payload shape.

### Dependency on #002

The scaffold can start immediately using placeholder Tailwind color tokens. Do not wait for #002 to deliver the full design system before beginning. Wire up the AppShell with neutral placeholder colors and replace them once design tokens arrive from @ui-ux-designer.

## Acceptance Criteria

- [x] `client/` directory created with Vite + React + TypeScript template
- [x] Tailwind CSS configured
- [x] Router set up with a root layout and placeholder routes for: `/`, `/projects`, `/login` (router choice documented as ADR-006)
- [x] TanStack React Query provider set up at app root
- [x] `client/src/lib/api.ts` — Axios client that reads `VITE_API_URL` from env, includes 401 handling
- [x] `client/src/lib/stores/auth.ts` — Zustand store with persist for auth state
- [x] Folder structure matches ARCHITECTURE.md: `components/`, `features/`, `pages/`, `lib/`
- [x] Basic shell layout: sidebar with nav links, main content area, responsive (collapses to bottom nav on mobile)
- [x] ESLint + Prettier configured (shared config with server if possible)
- [x] `npm run dev` starts Vite dev server at `localhost:5173`
- [x] `npm run build` produces static build in `client/dist/`
- [x] `npm run typecheck` passes with no errors
- [x] Router and auth state decisions documented as ADR-005 + ADR-006 in `docs/technical/DECISIONS.md`

## Technical Notes

- React **19** (not 18 — match Timesheet app version)
- Vite 5, TypeScript strict mode
- Tailwind CSS 3.x — configure with placeholder tokens now; replace with design tokens from task #002 once delivered
- Router: TanStack Router recommended (see decision above — document as ADR-006)
- Auth state: Zustand with persist (not React context)
- API client: Axios (not fetch wrapper) — transplant from Timesheet `lib/api/client.ts`
- TanStack Query v5 for all server state
- API base URL from `VITE_API_URL` env var (default `http://localhost:3001/api/v1`)
- `@dnd-kit/core` and `@dnd-kit/sortable` for Kanban drag-drop (install now, use in task #012)
- Radix UI primitives, Lucide React icons, and Recharts are already in the Timesheet app — install all three now to match the shared component ecosystem
- Timesheet source: `D:\00. CloudData\Personal\OneDrive\MyApp\ClaudeProjects\Timesheet\apps\web\`
- See ARCHITECTURE.md for component structure

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-03-28 | human | Task created during onboarding |
| 2026-03-28 | human | Existing Timesheet codebase and CurrentDb databases identified for reuse — task updated |
| 2026-03-28 | @frontend-developer | Scaffold transplanted from Timesheet app — TanStack Router, Zustand, Axios, AppShell in place |
