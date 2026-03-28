---
id: "020"
title: "Set up Playwright E2E test suite and write core flow tests"
status: "todo"
area: "qa"
agent: "@qa-engineer"
priority: "normal"
created_at: "2026-03-28"
due_date: null
started_at: null
completed_at: null
prd_refs: ["FR-001", "FR-002", "FR-020", "FR-030", "FR-040", "FR-041"]
blocks: []
blocked_by: ["006", "011", "012"]
---

## Description

Set up the Playwright E2E testing infrastructure and write tests for the core user flows: authentication, project creation, task creation, and Kanban status update. These tests serve as regression coverage for the product's most critical paths.

## Acceptance Criteria

- [ ] Playwright configured in `tests/e2e/` with TypeScript support
- [ ] Page Object Model pattern established — one POM class per page
- [ ] `data-testid` attributes in place on all interactive elements tested
- [ ] Test: login with valid credentials → lands on dashboard
- [ ] Test: login with invalid credentials → shows error message
- [ ] Test: create a project → appears in project list
- [ ] Test: create a task in a project → appears on Kanban board
- [ ] Test: drag task to "Done" column → task status changes
- [ ] All tests pass against the dev server
- [ ] `npm run test:e2e` runs all E2E tests

## Technical Notes

- Use `data-testid` selectors exclusively (not CSS classes or text — they change)
- Tests run against the local dev server (client + server both running)
- Use Playwright fixtures for authenticated test state (log in once, reuse session)
- See PRD FR references for what "done" looks like for each flow

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-03-28 | human | Task created during onboarding |
