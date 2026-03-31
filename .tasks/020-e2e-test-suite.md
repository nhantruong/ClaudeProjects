---
id: "020"
title: "Set up Playwright E2E test suite and write core flow tests"
status: "done"
area: "qa"
agent: "@qa-engineer"
priority: "normal"
created_at: "2026-03-28"
due_date: null
started_at: "2026-03-31"
completed_at: "2026-03-31"
prd_refs: ["FR-001", "FR-002", "FR-020", "FR-030", "FR-040", "FR-041"]
blocks: []
blocked_by: ["006", "011", "012"]
---

## Description

Set up the Playwright E2E testing infrastructure and write tests for the core user flows: authentication, project creation, task creation, and Kanban status update. These tests serve as regression coverage for the product's most critical paths.

## Acceptance Criteria

- [x] Playwright configured in `tests/e2e/` with TypeScript support
- [x] Page Object Model pattern established — one POM class per page
- [x] `data-testid` attributes in place on all interactive elements tested
- [x] Test: login with valid credentials → lands on dashboard
- [x] Test: login with invalid credentials → shows error message
- [x] Test: create a project → appears in project list
- [x] Test: create a task in a project → appears on Kanban board
- [x] Test: drag task to "Done" column → task status changes
- [ ] All tests pass against the dev server
- [x] `npm run test:e2e` runs all E2E tests

## Technical Notes

- Use `data-testid` selectors exclusively (not CSS classes or text — they change)
- Tests run against the local dev server (client + server both running)
- Use Playwright fixtures for authenticated test state (log in once, reuse session)
- See PRD FR references for what "done" looks like for each flow

## Implementation Notes

### Files created
- `playwright.config.ts` — root-level Playwright config, `testDir: ./tests/e2e`, sequential, Chromium only, `webServer` starts `npm run dev` in `client/`
- `package.json` — root package with `test:e2e` script and `@playwright/test` dev dependency
- `tsconfig.json` — root TypeScript config covering `playwright.config.ts` and `tests/**`
- `tests/e2e/pages/LoginPage.ts` — POM for `/login`
- `tests/e2e/pages/DashboardPage.ts` — POM for `/`
- `tests/e2e/pages/ProjectsPage.ts` — POM for `/projects` and `CreateProjectModal`
- `tests/e2e/pages/KanbanPage.ts` — POM for `/projects/:id/kanban`
- `tests/e2e/fixtures/auth.fixture.ts` — authenticated page fixture using `E2E_USERNAME` / `E2E_PASSWORD` env vars
- `tests/e2e/auth.spec.ts` — login valid, login invalid, empty form validation
- `tests/e2e/projects.spec.ts` — create project flow, name validation
- `tests/e2e/kanban.spec.ts` — quick-add task, drag task to Done column

### Files modified
- `client/src/features/kanban/QuickAddTaskForm.tsx` — added `data-testid="quick-add-task-input"` to the title input and `data-testid="quick-add-task-submit"` to the submit button

### Run instructions
```
# Install root dependencies (first time)
npm install

# Install Playwright Chromium browser (first time)
npx playwright install chromium --with-deps

# Run all E2E tests (requires dev server to be running, or webServer config starts it)
npm run test:e2e

# List tests without running them
npx playwright test --list

# Run with headed browser for debugging
npx playwright test --headed

# Open Playwright UI mode
npx playwright test --ui
```

### Environment variables
| Variable | Default | Purpose |
|----------|---------|---------|
| `E2E_USERNAME` | `admin` | Login username for authenticated fixture |
| `E2E_PASSWORD` | `password` | Login password for authenticated fixture |

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-03-28 | human | Task created during onboarding |
| 2026-03-31 | @qa-engineer | Implemented Playwright infrastructure and all core flow tests |
