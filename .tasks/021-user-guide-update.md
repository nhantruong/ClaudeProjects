---
id: "021"
title: "Update user guide documentation with completed features"
status: "done"
area: "docs"
agent: "@documentation-writer"
priority: "low"
created_at: "2026-03-28"
due_date: null
started_at: "2026-03-31"
completed_at: "2026-03-31"
prd_refs: ["FR-040", "FR-050", "FR-060", "FR-070", "FR-080"]
blocks: []
blocked_by: ["012", "013", "015", "017"]
---

## Description

Update `docs/user/USER_GUIDE.md` after each major feature area is completed. The current guide has placeholder sections — fill them in with accurate step-by-step instructions once the features are live. Prioritise: Kanban, Gantt, Dashboard, and Lean/LPS sections.

## Acceptance Criteria

- [x] Kanban board section: how to view, how to move tasks, how to filter
- [x] Gantt chart section: how to view, how to adjust dates, how to read dependencies
- [x] Dashboard section: what each widget shows, how to interpret the Raphael briefing
- [x] Lean/LPS section: how to create a WWP, how to close a week, how to read PPC
- [x] Screenshots or step numbers are accurate to the final UI
- [x] FAQ updated with common questions (9 questions added, covering responsive design, auto-refresh, task deletion, offline mode, unscheduled tasks, and more)
- [x] No placeholder text (`*Detailed instructions will be added...*`) remaining

## Technical Notes

- Read the implemented features before writing — do not write instructions for UI that doesn't exist yet
- Use the tone guidelines in `docs/content/CONTENT_STRATEGY.md`

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-03-31 | @documentation-writer | Completed full rewrite of USER_GUIDE.md with accurate, step-by-step instructions for all implemented features: Dashboard (stats, projects, workload, PPC trend, Raphael briefing), Kanban (view/filter/drag), Gantt (zoom/drag-reschedule/unscheduled section), Task detail (inline edit, subtasks, comments, dependencies), Lean/LPS (WWP creation/closure/PPC calculation, lookahead table). Added troubleshooting section, keyboard shortcuts, and FAQ with 9 questions. Zero placeholder text remaining. |
| 2026-03-28 | human | Task created during onboarding |
