---
id: "012"
title: "Implement Kanban board UI"
status: "todo"
area: "frontend"
agent: "@frontend-developer"
priority: "normal"
created_at: "2026-03-28"
due_date: null
started_at: null
completed_at: null
prd_refs: ["FR-040", "FR-041", "FR-042", "FR-043"]
blocks: []
blocked_by: ["002", "004", "006", "009", "011"]
---

## Description

Build the Kanban board view for a project. Tasks are displayed in columns by status. Users can drag tasks between columns to change status. Filter bar allows filtering by assignee, priority, and due date. Overdue tasks must be visually indicated.

## Acceptance Criteria

- [ ] Five columns: To Do, In Progress, In Review, Done, Blocked
- [ ] Task cards show: title, assignee avatar/name, priority badge, due date
- [ ] Overdue tasks highlighted (red border or badge) on the card (FR-043)
- [ ] Drag-and-drop to move tasks between columns — optimistic update (FR-041)
- [ ] Filter bar: filter by assignee (dropdown), priority (multiselect), due date range (FR-042)
- [ ] "Add task" button in each column opens quick-add task form
- [ ] Click task card opens task detail panel/drawer
- [ ] Column shows task count
- [ ] Responsive: on mobile, columns scroll horizontally (swipe)

## Technical Notes

- Use `@dnd-kit/core` + `@dnd-kit/sortable` for drag-and-drop (installed in task #004)
- `PATCH /tasks/:id` with `{ status }` on drop
- React Query optimistic update on status change — roll back on API error
- See wireframes from task #002 for card design

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-03-28 | human | Task created during onboarding |
