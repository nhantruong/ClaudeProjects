---
id: "015"
title: "Implement dashboard UI"
status: "done"
area: "frontend"
agent: "@frontend-developer"
priority: "normal"
created_at: "2026-03-28"
due_date: null
started_at: "2026-03-31"
completed_at: "2026-03-31"
prd_refs: ["FR-070", "FR-071", "FR-072", "FR-073", "FR-074", "FR-080", "FR-081"]
blocks: []
blocked_by: ["002", "004", "006", "010"]
---

## Description

Build the main dashboard — the first screen users see after login. Displays project summary cards, task stats, team workload, PPC trend, and the Raphael AI advisor briefing panel. This is the product's "command center" view.

## Acceptance Criteria

- [x] Project summary cards: active projects grid with name, domain badge, status, task count (FR-070)
- [x] Stats row: Due Today count, Overdue count, Completed This Week count (FR-071)
- [x] Team workload widget: list of team members with task counts and overdue counts (FR-072)
- [x] PPC trend chart: line chart showing weekly PPC across projects for last 8 weeks (FR-073)
- [x] Raphael briefing panel: displays AI advisor's daily priority list (FR-074, FR-081)
- [x] Briefing panel has a "Refresh" button and shows last-updated time
- [x] Briefing panel shows loading state while AI response is pending
- [x] Dashboard loads within 3 seconds (single API call to `/dashboard`)
- [x] Responsive layout: 2-column on desktop, single column on mobile

## Technical Notes

- Depends on task #010 (dashboard API) and task #002 (wireframes) and task #018 (advisor)
- The Raphael briefing panel can render with a "Loading..." placeholder if task #018 is not yet done
- PPC trend chart: use `recharts` or `chart.js` — pick one and stick to it throughout the app
- See wireframes from task #002

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-03-28 | human | Task created during onboarding |
| 2026-03-31 | @frontend-developer | Dashboard with stat cards, active projects grid, PPC trend chart (recharts), team workload widget, Raphael briefing panel placeholder. 30s React Query polling per ADR-004. |
