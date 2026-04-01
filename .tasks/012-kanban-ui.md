---
id: "012"
title: "Implement Kanban board UI"
status: "done"
area: "frontend"
agent: "@frontend-developer"
priority: "normal"
created_at: "2026-03-28"
due_date: null
started_at: "2026-03-30"
completed_at: "2026-03-30"
prd_refs: ["FR-040", "FR-041", "FR-042", "FR-043"]
blocks: []
blocked_by: ["002", "004", "006", "009", "011"]
---

## Description

Build the Kanban board view for a project. Tasks are displayed in columns by status. Users can drag tasks between columns to change status. Filter bar allows filtering by assignee, priority, and due date. Overdue tasks must be visually indicated.

## Acceptance Criteria

- [x] Five columns: To Do, In Progress, In Review, Done, Blocked
- [x] Task cards show: title, assignee avatar/name, priority badge, due date
- [x] Overdue tasks highlighted (red border or badge) on the card (FR-043)
- [x] Drag-and-drop to move tasks between columns — optimistic update (FR-041)
- [x] Filter bar: filter by assignee (dropdown), priority (multiselect), due date range (FR-042)
- [x] "Add task" button in each column opens quick-add task form
- [x] Click task card opens task detail panel/drawer
- [x] Column shows task count
- [x] Responsive: on mobile, columns scroll horizontally (swipe)

## Technical Notes

- Use `@dnd-kit/core` + `@dnd-kit/sortable` for drag-and-drop (installed in task #004)
- `PATCH /tasks/:id` with `{ status }` on drop
- React Query optimistic update on status change — roll back on API error
- See wireframes from task #002 for card design

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-03-28 | human | Task created during onboarding |
| 2026-03-30 | @frontend-developer | Implemented KanbanBoard, KanbanColumn, TaskCard, FilterBar, QuickAddTaskForm, KanbanPage, tasks.api.ts. Drag-drop with @dnd-kit, optimistic updates. |
