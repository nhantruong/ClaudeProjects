---
id: "014"
title: "Implement task detail UI"
status: "todo"
area: "frontend"
agent: "@frontend-developer"
priority: "normal"
created_at: "2026-03-28"
due_date: null
started_at: null
completed_at: null
prd_refs: ["FR-030", "FR-031", "FR-032", "FR-033", "FR-034", "FR-036", "FR-037"]
blocks: []
blocked_by: ["004", "006", "009"]
---

## Description

Build the task detail view — a slide-over panel or full page showing all task information: metadata (title, description, status, priority, assignee, dates), subtasks checklist, comments thread, dependency list. All fields are editable inline.

## Acceptance Criteria

- [ ] Task detail slides in as a panel when clicking a task card (or navigates to `/tasks/:id` on mobile)
- [ ] Editable inline: title, description, status, priority, assignee (select from project members), start date, due date
- [ ] Subtasks section: add/edit/delete/check-off subtasks (FR-034)
- [ ] Comments section: chronological thread, add comment form (FR-036)
- [ ] Dependencies section: list of blocked-by and blocking tasks with links (FR-037)
- [ ] Status badge color matches task status
- [ ] Priority badge color matches priority level
- [ ] "Mark as Done" button — quick status change
- [ ] Responsive: full-screen on mobile

## Technical Notes

- React Query for task data + mutations for each editable field
- Comment submission optimistically appends to thread
- Use `date-fns` or `dayjs` for date formatting

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-03-28 | human | Task created during onboarding |
