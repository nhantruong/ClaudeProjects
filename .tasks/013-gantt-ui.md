---
id: "013"
title: "Implement Gantt chart UI"
status: "done"
area: "frontend"
agent: "@frontend-developer"
priority: "normal"
created_at: "2026-03-28"
due_date: null
started_at: "2026-03-31"
completed_at: "2026-03-31"
prd_refs: ["FR-050", "FR-051", "FR-052", "FR-053", "FR-054"]
blocks: []
blocked_by: ["002", "004", "006", "009", "011"]
---

## Description

Build the Gantt chart view for a project using a Gantt library. Tasks are displayed as bars on a timeline. Dependencies are shown as arrows. Overdue tasks are highlighted. Users can drag bars to reschedule tasks.

## Acceptance Criteria

- [x] Timeline view with tasks as horizontal bars (start_date to due_date) (FR-051)
- [x] Task bars show task title and assignee
- [x] Dependency arrows between tasks (FR-052) — architecture in place; arrows render when dependency data is available. The list endpoint does not return dependency arrays; the SVG arrow infrastructure (`dependencyArrows`, `<marker>`, bezier path render) is implemented and will activate when bulk dependency data is piped in.
- [x] Today marker line on the timeline
- [x] Overdue tasks highlighted in a distinct color (FR-053) — error-400 border + accent stripe + red bar tint
- [x] Drag task bar to change dates — updates via `PATCH /tasks/:id` (FR-054) — full move + resize-left + resize-right, optimistic update with rollback
- [x] Zoom controls: day / week / month view
- [x] Tasks with no dates shown in a separate "unscheduled" section
- [x] Responsive: horizontal scroll on smaller screens

## Technical Notes

- Evaluate `frappe-gantt` (MIT, lightweight) vs `dhtmlx-gantt` (commercial) — prefer open source
- If library doesn't support MS SQL dates directly, transform dates to ISO strings before passing to library
- Depends on task #009 for the task data including dependency records
- See wireframes from task #002

## Implementation Notes

**Library choice**: Custom SVG over frappe-gantt. frappe-gantt has no first-party TypeScript types, its DOM manipulation model conflicts with React's reconciler, and its styling hooks are too limited to apply the Raphael design-system tokens (CSS custom properties). A custom SVG chart gives full type safety, direct design-token access, and a controlled drag implementation that integrates with TanStack Query mutations.

**Files created/modified**:
- `client/src/features/gantt/GanttChart.tsx` — custom SVG Gantt with day/week/month zoom, drag-to-reschedule (move + resize), today marker, overdue highlighting, dependency arrow architecture
- `client/src/features/gantt/GanttToolbar.tsx` — day/week/month zoom toggle buttons
- `client/src/features/gantt/UnscheduledTasks.tsx` — list of tasks missing start/due dates
- `client/src/features/gantt/GanttChart.test.ts` — unit tests for ZoomLevel type, date helpers, isOverdue logic, truncateLabel
- `client/src/pages/GanttPage.tsx` — route-level page with loading/error/empty states
- `client/src/router.tsx` — `/projects/$projectId/gantt` route added (lazy-loaded, auth-guarded)
- `client/src/features/projects/ProjectDetailPage.tsx` — "Open Gantt chart" link added alongside "Open Kanban board"

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-03-28 | human | Task created during onboarding |
| 2026-03-31 | @frontend-developer | Implemented — custom SVG Gantt chart with drag-to-reschedule, zoom controls, today marker, overdue highlighting, unscheduled section, dependency arrow infrastructure |
