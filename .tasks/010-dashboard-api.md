---
id: "010"
title: "Implement dashboard summary API endpoint"
status: "todo"
area: "backend"
agent: "@backend-developer"
priority: "normal"
created_at: "2026-03-28"
due_date: null
started_at: null
completed_at: null
prd_refs: ["FR-070", "FR-071", "FR-072", "FR-073"]
blocks: ["015"]
blocked_by: ["001", "003", "005", "008", "009"]
---

## Description

Implement a single `GET /dashboard` endpoint that returns all the data needed to render the main dashboard in one request: active project summaries, task stats (due today, overdue, completed this week), team workload (tasks per person), and PPC trend across projects. This avoids the frontend making 5+ requests to load the dashboard.

## Acceptance Criteria

- [ ] `GET /api/v1/dashboard` returns a single JSON object with:
  - `projects`: array of active project summary cards (name, domain, status, task counts)
  - `stats`: due_today count, overdue count, completed_this_week count (FR-071)
  - `workload`: array of { user, task_count, overdue_count } (FR-072)
  - `ppc_trend`: array of { week, ppc } across all projects for last 8 weeks (FR-073)
- [ ] All data is scoped to the authenticated user's projects (not all projects)
- [ ] Response time under 500ms (single optimized query set, not N+1)
- [ ] Unit tests for dashboard service
- [ ] API.md updated

## Technical Notes

- Use CTEs or multiple targeted queries — avoid N+1 (one query per project)
- `completed_this_week` = tasks where `completed_at >= start of current week`
- `due_today` = tasks where `due_date = today AND status NOT IN ('done')`
- PPC trend is already calculated on wwp records — just aggregate

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-03-28 | human | Task created during onboarding |
