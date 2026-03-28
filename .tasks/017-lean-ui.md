---
id: "017"
title: "Implement Lean construction UI (WWP, PPC chart, lookahead)"
status: "todo"
area: "frontend"
agent: "@frontend-developer"
priority: "normal"
created_at: "2026-03-28"
due_date: null
started_at: null
completed_at: null
prd_refs: ["FR-060", "FR-061", "FR-062", "FR-063", "FR-064", "FR-065"]
blocks: []
blocked_by: ["004", "006", "011", "016"]
---

## Description

Build the Lean construction section: weekly work plan form, PPC trend chart, and lookahead planning table. This is the project's Lean discipline hub — the place where weekly commitments are made and tracked.

## Acceptance Criteria

- [ ] Weekly Work Plan page: show current week's planned tasks with checkboxes
- [ ] Add task to WWP: search/select from project tasks or create ad-hoc description
- [ ] End-of-week completion form: mark each task complete/incomplete, enter variance reason for incomplete items (FR-063)
- [ ] "Close Week" button calculates and saves PPC (FR-062)
- [ ] PPC history chart: line chart showing weekly PPC over time (FR-064)
- [ ] Lookahead table: tasks due in the next 4 weeks, grouped by week (FR-065)
- [ ] Navigation between past weeks (view history)
- [ ] Responsive layout

## Technical Notes

- Reuse the charting library chosen in task #015 (recharts or chart.js)
- PPC chart should visually show the 80% PPC target line (common LPS benchmark)
- Variance reasons should be selectable from common categories (late delivery, design change, resource unavailable, other) plus free text

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-03-28 | human | Task created during onboarding |
