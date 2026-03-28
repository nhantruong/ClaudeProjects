---
id: "013"
title: "Implement Gantt chart UI"
status: "todo"
area: "frontend"
agent: "@frontend-developer"
priority: "normal"
created_at: "2026-03-28"
due_date: null
started_at: null
completed_at: null
prd_refs: ["FR-050", "FR-051", "FR-052", "FR-053", "FR-054"]
blocks: []
blocked_by: ["002", "004", "006", "009", "011"]
---

## Description

Build the Gantt chart view for a project using a Gantt library. Tasks are displayed as bars on a timeline. Dependencies are shown as arrows. Overdue tasks are highlighted. Users can drag bars to reschedule tasks.

## Acceptance Criteria

- [ ] Timeline view with tasks as horizontal bars (start_date to due_date) (FR-051)
- [ ] Task bars show task title and assignee
- [ ] Dependency arrows between tasks (FR-052)
- [ ] Today marker line on the timeline
- [ ] Overdue tasks highlighted in a distinct color (FR-053)
- [ ] Drag task bar to change dates — updates via `PATCH /tasks/:id` (FR-054)
- [ ] Zoom controls: day / week / month view
- [ ] Tasks with no dates shown in a separate "unscheduled" section
- [ ] Responsive: horizontal scroll on smaller screens

## Technical Notes

- Evaluate `frappe-gantt` (MIT, lightweight) vs `dhtmlx-gantt` (commercial) — prefer open source
- If library doesn't support MS SQL dates directly, transform dates to ISO strings before passing to library
- Depends on task #009 for the task data including dependency records
- See wireframes from task #002

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-03-28 | human | Task created during onboarding |
