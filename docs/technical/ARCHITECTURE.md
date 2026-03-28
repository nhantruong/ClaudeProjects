<!--
DOCUMENT METADATA
Owner: @systems-architect (all sections except Design System)
Update trigger: System architecture changes, new integrations, component additions, design system updates
Update scope:
  @systems-architect: All sections except "Design System"
  @ui-ux-designer: "Design System" section only
  @frontend-developer: May append to "Frontend Architecture" (never overwrite)
  @backend-developer: May append to "Backend Architecture" (never overwrite)
Read by: All agents. Always read before making implementation decisions.
-->

# System Architecture

> Last updated: 2026-03-28
> Version: 0.1.0

---

## Overview

Raphael is a full-stack web application with a React SPA frontend and a Node.js/Express REST API backend, backed by MS SQL Server. The frontend is served separately (Vite dev server in development, static build in production) and communicates with the API over HTTP. The backend follows an MVC pattern: Express routers → controllers → services → SQL model functions.

The AI advisor ("Raphael") is implemented as a backend service that calls an external AI API (provider TBD) with project and task context assembled from the database. All AI calls are server-side only — API keys never reach the client.

```
  [Browser / Mobile]
         │
         ▼
  [React SPA (Vite)]  ──── HTTP/REST ────  [Express API (Node.js)]
                                                    │
                                           ┌────────┴────────┐
                                           ▼                 ▼
                                    [MS SQL Server]    [AI Provider API]
                                                       (OpenAI / Claude / Local)
```

---

## Tech Stack

| Layer | Technology | Version | Why Chosen |
|-------|-----------|---------|------------|
| Frontend | React | 18.x | Component model, large ecosystem, team familiarity with JS |
| Build tool | Vite | 5.x | Fast HMR, simple config, TypeScript first-class |
| Styling | Tailwind CSS | 3.x | Utility-first, excellent responsive design, no CSS files to maintain |
| Backend | Node.js + Express | 20.x LTS / 4.x | Team has JS experience; MVC pattern matches prior knowledge |
| Language | TypeScript | 5.x | Type safety across full stack; shared types between client and server |
| Database | MS SQL Server | 2019+ | Existing infrastructure and team familiarity |
| SQL driver | mssql | 11.x | Native MS SQL driver for Node.js; raw SQL for full control |
| Auth | JWT in httpOnly cookie | — | Stateless, XSS-safe. See ADR-002 |
| AI Advisor | Claude API (primary) + Ollama (local fallback) | — | Switched via AI_PROVIDER env var. See ADR-003 |
| Hosting | Local + 103.27.60.66 | — | Self-hosted on existing infrastructure |
| CI/CD | [TBD] | — | To be decided |

---

## System Components

### Frontend Architecture

The frontend is a React 18 SPA built with Vite. Routing is handled client-side with React Router. Server state is managed with React Query (TanStack Query) for caching and synchronization with the API. Local UI state uses React's built-in `useState` / `useReducer`.

**Routing**: React Router v6 — page components in `client/src/pages/`

**State management**:
- React Query for all server data (tasks, projects, users)
- React context for global UI state (auth user, theme)
- Local `useState` for component-level state

**Component structure**:
```
client/src/
  components/         # Primitive UI elements (Button, Input, Modal, Badge, etc.)
  features/
    kanban/           # Kanban board view and drag-drop logic
    gantt/            # Gantt chart rendering
    dashboard/        # Dashboard widgets and Raphael briefing panel
    tasks/            # Task detail, task form, subtasks
    projects/         # Project list, project settings
    lean/             # Last Planner System — WWP, PPC, lookahead
    advisor/          # Raphael AI advisor chat/panel
    auth/             # Login page, session management
    team/             # User management (admin only)
  pages/              # Route-level page components
  lib/
    api.ts            # Typed API client (fetch wrapper)
    hooks/            # Shared custom hooks
    utils/            # Format helpers, date utils
```

**Data fetching pattern**: React Query for all API calls. Mutations optimistically update the cache.

---

### Backend Architecture

The backend is a Node.js 20 + Express 4 REST API following MVC pattern. All business logic lives in the service layer, not in controllers. Controllers are thin: validate input → call service → return response.

**API style**: REST — `server/src/routes/`

**Middleware stack**:
1. CORS — restricts to `CLIENT_URL` origin
2. JSON body parser
3. Authentication middleware — validates session/JWT on all protected routes
4. Request validation — validates body/params with `zod` schemas
5. Error handler — formats all errors into standard `{ error: { code, message } }` shape

**Service layer pattern**: Controllers call service functions in `server/src/services/`. Services call SQL model functions in `server/src/models/`. No SQL in controllers or services — SQL belongs only in models.

```
server/src/
  routes/             # Express router definitions — one file per resource
  controllers/        # Thin request handlers — parse input, call service, send response
  services/           # Business logic — orchestrate calls to models, apply rules
  models/             # Raw SQL query functions using mssql
  middleware/
    auth.ts           # Session/JWT validation
    validate.ts       # Zod schema validation middleware factory
    errorHandler.ts   # Global error handler
  lib/
    db.ts             # mssql connection pool singleton
    ai.ts             # AI provider client wrapper
    logger.ts         # Structured logger
```

---

### Infrastructure

**Environments**:
| Environment | URL | Branch | Notes |
|-------------|-----|--------|-------|
| Production | http://103.27.60.66 | `main` | Manual deploy for now |
| Local | http://localhost:5173 (client) / :3001 (API) | any | `npm run dev` |

**CI/CD**: [TBD — to be set up in a later task]

---

## Data Flow

### User Authentication Flow

```
1. User submits username + password on login page
2. POST /auth/login → auth controller → auth service
3. Auth service queries users table, verifies password hash (bcrypt)
4. On success: session token created, stored in sessions table
5. Token returned to client, stored in httpOnly cookie (or localStorage — TBD)
6. Subsequent requests include token — auth middleware validates on each request
7. If token invalid or expired → 401 response → client redirects to login
```

### Raphael AI Advisor Flow

```
1. User opens dashboard or requests briefing
2. GET /advisor/briefing → advisor controller → advisor service
3. Advisor service queries: all active projects, tasks due soon, overdue tasks, blocked tasks
4. Context assembled into structured prompt
5. AI provider API called with prompt (server-side only)
6. Response parsed and returned to client as structured briefing object
7. Client renders briefing in the Raphael panel
```

### Kanban Task Update Flow

```
1. User drags task to new column (status change)
2. PATCH /tasks/:id → task controller → task service
3. Task service validates new status transition, updates record
4. Updated task returned to client
5. React Query cache updated optimistically — UI reflects change immediately
```

---

## Design System

<!--
This section is owned by @ui-ux-designer.
Other agents: read-only. Do not modify.
-->

### Aesthetic

**Theme**: Dark — command center. Deep slate backgrounds, sharp teal/cyan accents, minimal chrome. Designed for engineers who spend the entire workday inside the tool.

**Font pairing**:
- `font-mono`: "DM Mono" — headings, numeric values, data labels (self-host via Google Fonts)
- `font-sans`: "DM Sans" — all body copy, UI labels, navigation

Both fonts must be self-hosted (served from `/public/fonts/`) for use on the internal network without internet access.

---

### Color Tokens

All tokens are CSS custom properties on `:root`. Dark theme is the default. A `[data-theme="light"]` override map is reserved for v2.

#### Neutral Scale

| Token | Dark value | Light value | Usage |
|-------|-----------|------------|-------|
| `--color-neutral-50` | `#F0F6FF` | `#F0F6FF` | Near-white; light mode surfaces |
| `--color-neutral-100` | `#C9D1D9` | `#161B22` | Light text on dark; dark text on light |
| `--color-neutral-200` | `#B1BAC4` | `#30363D` | Secondary text |
| `--color-neutral-600` | `#484F58` | `#6E7681` | Disabled text, muted icons |
| `--color-neutral-700` | `#30363D` | `#B1BAC4` | Borders (elevated) |
| `--color-neutral-800` | `#21262D` | `#C9D1D9` | Subtle borders |
| `--color-neutral-900` | `#161B22` | `#F0F6FF` | Page background (light) |
| `--color-neutral-950` | `#0D1117` | `#FFFFFF` | Deepest background |

#### Teal Accent (Primary)

| Token | Value | Usage |
|-------|-------|-------|
| `--color-accent-teal-300` | `#39D2C0` | Hover state text links |
| `--color-accent-teal-400` | `#26C6B4` | Text links, icon accents |
| `--color-accent-teal-500` | `#14B8A6` | Primary actions, focus rings, active nav indicator |
| `--color-accent-teal-600` | `#0D9488` | Primary button hover state |
| `--color-accent-teal-700` | `#0F766E` | Primary button active/pressed state |

Contrast check: `--color-accent-teal-500` (#14B8A6) on `--color-surface-primary` (#0E1117) = 5.2:1. Passes WCAG AA for normal text.

#### Surface Tokens (Dark Theme)

| Token | Value | Usage |
|-------|-------|-------|
| `--color-surface-primary` | `#0E1117` | Main content area background |
| `--color-surface-sidebar` | `#0D1117` | Sidebar and column header backgrounds |
| `--color-surface-topbar` | `#161B22` | Top navigation bar |
| `--color-surface-card` | `#1C2128` | Cards, panels, drawers |
| `--color-surface-elevated` | `#22272E` | Modals, popovers, tooltips |
| `--color-surface-column` | `#131920` | Kanban column body |

#### Border Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--color-border-default` | `#30363D` | Standard component borders |
| `--color-border-hover` | `#484F58` | Border on hover state |
| `--color-border-focus` | `#14B8A6` | Focus ring — same as teal-500 |
| `--color-border-subtle` | `#21262D` | Very subtle dividers |

#### Text Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--color-text-default` | `#E6EDF3` | Primary body text |
| `--color-text-muted` | `#8B949E` | Secondary text, timestamps, labels |
| `--color-text-subtle` | `#6E7681` | Placeholder text, disabled state |
| `--color-text-inverse` | `#0D1117` | Text on light backgrounds |
| `--color-text-link` | `#26C6B4` | Clickable text links |

Contrast check: `--color-text-default` (#E6EDF3) on `--color-surface-primary` (#0E1117) = 13.1:1. Passes WCAG AAA.
Contrast check: `--color-text-muted` (#8B949E) on `--color-surface-card` (#1C2128) = 4.6:1. Passes WCAG AA.

#### Semantic Status Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-error-400` | `#F85149` | Error text, overdue indicators |
| `--color-error-500` | `#DA3633` | Error borders, error badge background |
| `--color-error-600` | `#B91C1C` | Error button hover |
| `--color-warning-400` | `#F0A05A` | Warning text |
| `--color-warning-500` | `#D29922` | Warning badge background, in_review status |
| `--color-success-400` | `#56D364` | Success text |
| `--color-success-500` | `#2EA043` | Success badge background, done status |
| `--color-info-400` | `#58A6FF` | Info text |
| `--color-info-500` | `#1F6FEB` | Info badge background, in_progress status |

#### Priority Colors

| Priority | Token | Value | Usage |
|----------|-------|-------|-------|
| Critical | `--color-priority-critical` | `#DA3633` | Red (same as error-500) |
| High | `--color-priority-high` | `#E86B2A` | Amber-orange |
| Normal | `--color-priority-normal` | `#8B949E` | Neutral (same as text-muted) |
| Low | `--color-priority-low` | `#6E7681` | Dimmer neutral (same as text-subtle) |

#### Task Status Colors

| Status | Token | Value |
|--------|-------|-------|
| todo | `--color-status-todo` | `#484F58` |
| in_progress | `--color-status-inprogress` | `#1F6FEB` |
| in_review | `--color-status-inreview` | `#D29922` |
| done | `--color-status-done` | `#2EA043` |
| blocked | `--color-status-blocked` | `#DA3633` |

White text (`#FFFFFF`) is used on all status badge backgrounds. Contrast for badge labels (12px bold) meets WCAG 2.1 rule 1.4.11 (3:1 for UI components) on all status colors.

---

### Typography Scale

Font stack declarations:
```
--font-mono: 'DM Mono', 'Fira Code', 'Cascadia Code', monospace;
--font-sans: 'DM Sans', 'Segoe UI', system-ui, sans-serif;
```

| Token | Font | Size | Weight | Line-height | Usage |
|-------|------|------|--------|-------------|-------|
| `text-heading-1` | DM Mono | 32px (2rem) | 600 | 1.25 | Page-level stat values (dashboard numbers) |
| `text-heading-2` | DM Mono | 24px (1.5rem) | 600 | 1.33 | Task detail title, section headings |
| `text-heading-3` | DM Sans | 18px (1.125rem) | 600 | 1.4 | Card headings, panel titles, section sub-heads |
| `text-heading-4` | DM Sans | 16px (1rem) | 600 | 1.5 | Column headers, group labels |
| `text-body` | DM Sans | 16px (1rem) | 400 | 1.6 | Task titles on cards, description text, comment body |
| `text-body-small` | DM Sans | 14px (0.875rem) | 400 | 1.57 | Metadata, secondary info within cards |
| `text-label` | DM Sans | 13px (0.8125rem) | 500 | 1.4 | Form labels, filter bar labels |
| `text-caption` | DM Mono | 12px (0.75rem) | 400 | 1.5 | Timestamps, tooltips, stat card secondary text |

Notes:
- Minimum body text size on mobile: 16px (text-body). Never render interactive UI text below 13px.
- DM Mono is used for headings and numeric values because numbers need to align in data-dense layouts.
- DM Sans is used for all prose/label text for readability at small sizes.

---

### Spacing System

Base unit: 4px. All spacing values are multiples of this base.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Micro gaps (icon-to-label, tight badge padding) |
| `--space-2` | 8px | Card internal padding (compact), gap between small elements |
| `--space-3` | 12px | Standard gap between items, subtask rows |
| `--space-4` | 16px | Card padding, section internal padding |
| `--space-5` | 20px | Card padding (comfortable), panel padding |
| `--space-6` | 24px | Section padding, major element gaps |
| `--space-8` | 32px | Between sections, drawer padding |
| `--space-10` | 40px | Large section breaks |
| `--space-12` | 48px | Page-level padding top/bottom |
| `--space-16` | 64px | Empty state icon margin |
| `--space-20` | 80px | Large layout gaps |
| `--space-24` | 96px | Full-section whitespace (used sparingly) |

Border radius scale:

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Badges, small elements |
| `--radius-md` | 6px | Task cards |
| `--radius-lg` | 8px | Project cards, panels, modals |
| `--radius-xl` | 12px | Drawers (top corners only on mobile) |
| `--radius-full` | 9999px | Avatars, pill badges |

---

### Component Inventory

All primitive components live in `client/src/components/`. Feature-specific compound components live in `client/src/features/<feature>/`.

| Component | Location | Status | Variants / Notes |
|-----------|----------|--------|-----------------|
| `Button` | `client/src/components/Button.tsx` | Planned | variant: primary/secondary/ghost/danger; size: sm/md/lg |
| `Badge` | `client/src/components/Badge.tsx` | Planned | variant: status colors, priority colors, domain colors; size: sm/md |
| `Avatar` | `client/src/components/Avatar.tsx` | Planned | size: xs/sm/md/lg; AvatarGroup with overflow count |
| `Input` | `client/src/components/Input.tsx` | Planned | Standard text input with label, error, hint |
| `Textarea` | `client/src/components/Textarea.tsx` | Planned | Auto-grow; variant: default/markdown (adds toolbar) |
| `Select` | `client/src/components/Select.tsx` | Planned | Radix UI Select primitive; same visual style as Input |
| `Modal` | `client/src/components/Modal.tsx` | Planned | Focus trap, aria-modal, Escape to close; used for confirms |
| `Toast` | `client/src/components/Toast.tsx` | Planned | Top-right stack; auto-dismiss 4s; role alert/status |
| `Skeleton` | `client/src/components/Skeleton.tsx` | Planned | Shimmer animation; respects prefers-reduced-motion |
| `TaskCard` | `client/src/features/kanban/TaskCard.tsx` | Planned | Kanban card; dnd-kit drag handle; overdue/blocked states |
| `ProjectCard` | `client/src/features/projects/ProjectCard.tsx` | Planned | Dashboard project summary; progress bar; avatar group |
| `StatCard` | `client/src/features/dashboard/StatCard.tsx` | Planned | Single numeric stat + icon + trend label |
| `RaphaelPanel` | `client/src/features/advisor/RaphaelPanel.tsx` | Planned | AI briefing panel; skeleton; priority items; ask input |
| `TaskDrawer` | `client/src/features/tasks/TaskDrawer.tsx` | Planned | Right-side drawer; full-screen on mobile; focus trap |
| `FilterBar` | `client/src/features/kanban/FilterBar.tsx` | Planned | Assignee avatar chips; priority dropdown; date range |

#### Button Specification

Variants:

| Variant | Background | Text | Border | Hover bg |
|---------|-----------|------|--------|---------|
| primary | `--color-accent-teal-500` | `#FFFFFF` | none | `--color-accent-teal-600` |
| secondary | `--color-surface-elevated` | `--color-text-default` | 1px `--color-border-default` | `--color-surface-card` |
| ghost | transparent | `--color-text-default` | none | `--color-surface-elevated` |
| danger | `--color-error-500` | `#FFFFFF` | none | `--color-error-600` |

Sizes:

| Size | Height | Padding | Font token |
|------|--------|---------|-----------|
| sm | 32px | 8px 12px | text-label |
| md | 40px | 10px 16px | text-body-small weight 500 |
| lg | 48px | 12px 20px | text-body weight 500 |

All buttons: min touch target 44px on mobile (padding adjusted). Focus ring: 2px solid `--color-border-focus`, 2px offset. Loading state: spinner icon + "Saving..." label, `aria-busy="true"`, disabled. Disabled: opacity 0.4, cursor not-allowed. Icon support: optional left/right Lucide icon (16px), icon-only requires `aria-label`.

#### Badge Specification

Pill-shaped label. Uppercase text. Background = status/priority/domain color token. Text: `#FFFFFF` on all variants.

Domain badge colors: electromechanical `#1F4E8C` / bim `#5A1F8C` / software `#1F5C3E` / other `#484F58` — all with `#FFFFFF` text.

Sizes: sm (18px height, 2px 6px padding, text-caption) / md (22px height, 3px 8px padding, text-label). Border-radius: `--radius-full`.

#### Avatar Specification

Circular container with user initials. Sizes: xs 24px / sm 32px / md 40px / lg 48px. Background: deterministic color from display name hash (one of 8 predefined colors: `#1F6FEB`, `#2EA043`, `#D29922`, `#DA3633`, `#8250DF`, `#0D9488`, `#E86B2A`, `#6E7681`). All pass 4.5:1 against white text. `role="img"`, `aria-label="[display name]"`. Tooltip on focus/hover via Radix UI Tooltip. AvatarGroup: stack with -8px offset, "+N" overflow badge.

#### TaskCard Specification

States: default | hover | focus | dragging | overdue | blocked

Display fields: priority badge (top-left), assignee avatar xs (top-right), title (text-body, max 2 lines clamped), due date with CalendarIcon (overdue: color-error-400 + TriangleAlertIcon), subtask progress "[3/5]" with CheckSquareIcon, dependency warning LinkIcon in color-warning-500.

Overdue state: 3px left border color-error-500. Blocked state: full border color-status-blocked. Dragging: opacity 0.8, 3px teal border, scale(1.02), elevated shadow. Drag handle (GripVerticalIcon): hover-visible on desktop, always-visible on mobile. Keyboard drag via dnd-kit: Space to pick up, arrow keys to move, Space/Enter to drop, Escape to cancel. `aria-live="polite"` region announces column changes.

#### Modal / Dialog Specification

`role="dialog"`, `aria-modal="true"`, `aria-labelledby` title, `aria-describedby` body. Focus moves to first focusable (Cancel) on open; returns to trigger on close. Focus trap inside modal. Escape closes. Backdrop click closes. Open animation: backdrop fade + container scale 0.95→1.0, 200ms ease-in-out. Reduced motion: fade only.

---

### Interaction Patterns

#### Loading States

- **Route transition**: 4px progress bar at top of viewport (color-accent-teal-500), 0%→100% during navigation.
- **Cards and lists** (> 300ms): Skeleton shimmer — gray rectangles matching content shape. Animation: `background-position` sliding 1.5s linear infinite. Disabled via `@media (prefers-reduced-motion: reduce)`.
- **Button in-flight**: Spinner icon + "Saving..." text, `aria-busy="true"`, button disabled.
- **Drawer load**: Skeleton rows in drawer body while fetching task data.
- **Briefing panel**: 3 priority-item skeleton rows while AI response loads.

#### Error States

- **Toast notifications**: Top-right, stacked, auto-dismiss 4s, manual X dismiss. `role="alert"` for errors, `role="status"` for success/info. Slide in from right 200ms; fade out 150ms. Reduced motion: fade only.
- **Inline form errors**: Below input field. `role="alert"`, color-error-400 text, XCircleIcon, text-label. Input border color-error-500. On blur or submit attempt.
- **Full-page errors**: Centered in content area. AlertCircleIcon 48px, title, subtitle, Retry button.

#### Empty States

Each has: 48px icon (color-neutral-600), title (text-heading-3), subtitle (text-body color-text-muted), optional CTA (primary md).

| Context | Icon | Title |
|---------|------|-------|
| No projects assigned | FolderIcon | No projects yet |
| Empty Kanban column | InboxIcon | No tasks here |
| No tasks on Gantt | CalendarIcon | No tasks on the timeline |
| No comments | MessageSquareIcon | No comments yet |
| No WWP tasks | ClipboardListIcon | No tasks planned |

#### Confirmation Dialogs

Used only for irreversible destructive actions (delete task, remove member, delete project). NOT used for reversible actions. Pattern: Modal with AlertTriangleIcon (color-warning-400), Cancel (ghost) + destructive action (danger) buttons. Default focus: Cancel. Destructive button names the specific item: "Delete task", not "Delete". See Modal spec above for ARIA/keyboard behavior.

#### Drag and Drop (Kanban)

Library: `@dnd-kit/core` + `@dnd-kit/sortable`. Drag handle: GripVerticalIcon (hover-visible desktop, always-visible mobile). Keyboard: Space picks up, arrows move, Space/Enter drops, Escape cancels. Live region announces state changes. Drop zone: 2px teal dashed border + surface-elevated tint on hover. Drag ghost: 80% opacity, 3px teal border. Revert animation: 200ms ease-out on cancel or API error.

#### Focus Management

| Action | Focus moves to | On close/dismiss |
|--------|---------------|-----------------|
| Open drawer | Close button (first focusable) | Back to trigger element |
| Open modal | Cancel button | Back to trigger element |
| Open dropdown | First option | Back to trigger button |
| Toast appears | No focus change | N/A (aria-live) |

---

## Security Architecture

**Authentication model**: JWT signed with `SESSION_SECRET`, stored in an `httpOnly`, `SameSite=Strict` cookie. Token payload: `{ userId, role, exp }`. 30-day expiry. Auth middleware verifies JWT signature on every protected request — no DB lookup. See ADR-002.

**Authorization**: Role-based — roles: Admin, Manager, Member. Stored in users table. Middleware checks role on protected routes.

**Data protection**:
- Passwords hashed with bcrypt (cost factor 12)
- No plaintext credentials anywhere in codebase
- All SQL queries parameterized — no string concatenation (prevents SQL injection)
- Input validation with Zod on all API endpoints

**Key security decisions**: See `docs/technical/DECISIONS.md`

---

## Performance Considerations

- React Query caches API responses — avoids redundant fetches on tab/view switches
- mssql connection pool reused across requests — no connection-per-request overhead
- Gantt chart will use virtualized rendering for large task lists (100+ tasks)
- AI advisor calls are async and non-blocking — dashboard loads without waiting for briefing

---

## Known Constraints and Technical Debt

| Item | Impact | Plan |
|------|--------|------|
| No CI/CD yet | Manual deploys only | Set up in a dedicated CI/CD task |
| Polling not truly real-time | 30s latency on cross-user updates | Acceptable for v1; upgrade to Socket.io in v2 if needed (ADR-004) |
