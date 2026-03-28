---
id: "021"
title: "Update user guide documentation with completed features"
status: "todo"
area: "docs"
agent: "@documentation-writer"
priority: "low"
created_at: "2026-03-28"
due_date: null
started_at: null
completed_at: null
prd_refs: ["FR-040", "FR-050", "FR-060", "FR-070", "FR-080"]
blocks: []
blocked_by: ["012", "013", "015", "017"]
---

## Description

Update `docs/user/USER_GUIDE.md` after each major feature area is completed. The current guide has placeholder sections — fill them in with accurate step-by-step instructions once the features are live. Prioritise: Kanban, Gantt, Dashboard, and Lean/LPS sections.

## Acceptance Criteria

- [ ] Kanban board section: how to view, how to move tasks, how to filter
- [ ] Gantt chart section: how to view, how to adjust dates, how to read dependencies
- [ ] Dashboard section: what each widget shows, how to interpret the Raphael briefing
- [ ] Lean/LPS section: how to create a WWP, how to close a week, how to read PPC
- [ ] Screenshots or step numbers are accurate to the final UI
- [ ] FAQ updated with common questions
- [ ] No placeholder text (`*Detailed instructions will be added...*`) remaining

## Technical Notes

- Read the implemented features before writing — do not write instructions for UI that doesn't exist yet
- Use the tone guidelines in `docs/content/CONTENT_STRATEGY.md`

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-03-28 | human | Task created during onboarding |
