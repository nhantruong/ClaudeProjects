---
id: "014"
title: "Implement task detail UI"
status: "done"
area: "frontend"
agent: "@frontend-developer"
priority: "normal"
created_at: "2026-03-28"
due_date: null
started_at: "2026-03-31"
completed_at: "2026-03-31"
prd_refs: ["FR-030", "FR-031", "FR-032", "FR-033", "FR-034", "FR-036", "FR-037"]
blocks: []
blocked_by: ["004", "006", "009"]
---

## Description

Build the task detail view — a slide-over panel or full page showing all task information: metadata (title, description, status, priority, assignee, dates), subtasks checklist, comments thread, dependency list. All fields are editable inline.

## Acceptance Criteria

- [x] Task detail slides in as a panel when clicking a task card (or navigates to `/tasks/:id` on mobile)
- [x] Editable inline: title, description, status, priority, assignee (select from project members), start date, due date
- [x] Subtasks section: add/edit/delete/check-off subtasks (FR-034)
- [x] Comments section: chronological thread, add comment form (FR-036)
- [x] Dependencies section: list of blocked-by and blocking tasks with links (FR-037)
- [x] Status badge color matches task status
- [x] Priority badge color matches priority level
- [x] "Mark as Done" button — quick status change
- [x] Responsive: full-screen on mobile

## Technical Notes

- React Query for task data + mutations for each editable field
- Comment submission optimistically appends to thread
- Use `date-fns` or `dayjs` for date formatting

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-03-28 | human | Task created during onboarding |
| 2026-03-31 | @frontend-developer | TaskDrawer (Radix Dialog slide-over), TaskDetailPanel (inline editing), SubtasksSection, CommentsSection (optimistic), DependenciesSection. Wired into KanbanBoard on card click. |
