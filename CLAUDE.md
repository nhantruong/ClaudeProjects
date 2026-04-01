# Raphael — Claude Instructions

> Stack: React + Vite · Node.js 20 + Express · MS SQL Server · Local + 103.27.60.66
> Last updated: 2026-03-28

## Project Context

Raphael is an AI-powered project and task management system inspired by the Great Sage advisor from TenSura. It serves a small team of electromechanical engineers, BIM managers, and coders who need a unified workspace with Kanban boards, Gantt charts, Lean construction (Last Planner System) support, and an AI advisor that tells them what to do next. The core problem it solves is the lack of a single, domain-aware system that can manage multi-discipline engineering projects and intelligently surface priorities.

**Tech stack summary**: React 18 + Vite · Node.js 20 + Express (MVC) · MS SQL Server · Local dev + 103.27.60.66

---

## Agents Available

**Mandatory delegation — this is not optional.** Every task that falls within a specialist's domain MUST be routed to that agent. Do not implement code, design schemas, write docs, or configure pipelines yourself — delegate. Only handle directly: project-level questions, routing decisions, and tasks explicitly outside all specialist domains.

| Agent | Role | Invoke when... |
|-------|------|----------------|
| `project-manager` | Backlog & coordination | "What's next?", sprint planning, breaking down features, reprioritizing |
| `systems-architect` | Architecture & ADRs | New feature design, tech decisions, system integration |
| `frontend-developer` | UI implementation | Components, pages, client-side state, styling |
| `backend-developer` | API & business logic | Endpoints, auth, background jobs, integrations |
| `ui-ux-designer` | UX & design system | User flows, wireframes, component specs, accessibility |
| `database-expert` | Schema & queries | Migrations, schema design, query optimization |
| `qa-engineer` | Testing (Playwright) | E2E tests, test strategy, coverage gaps |
| `documentation-writer` | Living docs | User guide updates, post-feature documentation |
| `cicd-engineer` | CI/CD & GitHub Actions | Pipelines, deployments, branch protection, release automation |
| `docker-expert` | Containerization | Dockerfiles, docker-compose, image optimization, container networking |
| `copywriter-seo` | Copy & SEO | Landing page copy, marketing content, meta tags, keyword strategy, structured data specs, brand voice |

---

## Critical Rules

These apply to all agents at all times. No exceptions without explicit human instruction.

1. **PRD.md is read-only.** Never modify it. Read it to understand requirements.
2. **TODO.md is the living backlog.** Agents may add items, mark items complete, and move items to "Completed". Preserve section order and existing item priority — do not reorder items within a section unless explicitly asked to reprioritize.
3. **All commits use Conventional Commits format** (see Git Conventions below).
4. **Update the relevant `docs/` file** after every significant change before marking a task complete.
5. **Run tests before marking any implementation task complete.**
6. **Never hardcode secrets, credentials, or environment-specific values** in source code.
7. **Consult `docs/technical/DECISIONS.md`** before proposing changes that may conflict with prior architectural decisions.
8. **Always delegate to the right specialist.** If a task touches frontend, backend, database, UX/design, QA, documentation, CI/CD, Docker, or copy/SEO — invoke the appropriate agent immediately. Do not implement it yourself. The delegation table above is binding, not advisory.

---

## Project Structure

```
client/                 # React + Vite frontend
  src/
    components/         # Shared UI components
    features/           # Feature-specific modules (kanban, gantt, dashboard, etc.)
    pages/              # Route-level page components
    lib/                # Utilities, hooks, API client
server/                 # Node.js + Express backend
  src/
    controllers/        # Express route controllers (MVC)
    services/           # Business logic layer
    models/             # SQL query functions (raw mssql)
    middleware/         # Auth, validation, error handling
    routes/             # Express router definitions
tests/
  e2e/                  # Playwright E2E tests (*.spec.ts)
docs/
  user/USER_GUIDE.md    # User-facing documentation
  technical/            # Architecture, API, DB, decisions
  content/              # N/A — internal tool
.claude/agents/         # Specialist agent definitions
.claude/templates/      # Blank doc templates (synced from upstream — do not edit)
.tasks/                 # Detailed task files — one per TODO item (owned by @project-manager)
```

---

## Git Conventions

### Commit Format
```
<type>(<scope>): <short description>

[optional body]
[optional footer: Closes #issue]
```

**Types**: `feat` · `fix` · `docs` · `style` · `refactor` · `test` · `chore` · `perf` · `ci`

Examples:
```
feat(auth): add OAuth2 login with Google
fix(api): handle null response from payment provider
docs(user-guide): update onboarding section after flow change
```

### Branch Naming
```
feature/<ticket-id>-short-description
fix/<ticket-id>-short-description
chore/<description>
docs/<description>
refactor/<description>
```

### PR Requirements
- PR title follows Conventional Commits format
- Fill out `.github/PULL_REQUEST_TEMPLATE.md` completely — do not delete sections
- Link to the related issue/ticket (`Closes #XXX`)
- At least one reviewer required before merge
- All CI checks must pass

---

## Code Style

- **Language**: TypeScript (strict mode)
- **Formatter**: Prettier — config in `.prettierrc`
- **Linter**: ESLint — config in `.eslintrc`
- **Import style**: absolute imports from `src/`
- **No `console.log`** in production code — use the project logger utility
- **No commented-out code** committed — delete it or track it in TODO.md

---

## Testing Conventions

- **Unit tests**: Vitest — colocated as `*.test.ts` next to source files
- **E2E tests**: Playwright — in `tests/e2e/*.spec.ts`
- **Run unit**: `npm test`
- **Run E2E**: `npm run test:e2e`
- **Coverage target**: 80% for new features
- E2E tests use Page Object Model pattern and `data-testid` selectors

---

## Environment & Commands

- **Node**: 20.x LTS (see `.nvmrc`)
- **Package manager**: npm
- `npm run dev` — start dev server (client + server concurrently)
- `npm run build` — production build
- `npm test` — unit tests (Vitest)
- `npm run test:e2e` — E2E tests (Playwright)
- `npm run lint` — lint check (ESLint)
- `npm run typecheck` — TypeScript check

---

## Key Documentation

@docs/technical/ARCHITECTURE.md
@docs/technical/DECISIONS.md
@docs/technical/API.md
@docs/technical/DATABASE.md
@docs/user/USER_GUIDE.md
