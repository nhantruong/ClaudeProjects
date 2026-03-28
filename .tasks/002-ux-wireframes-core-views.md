---
id: "002"
title: "Design UI/UX wireframes for core views"
status: "done"
area: "design"
agent: "@ui-ux-designer"
priority: "high"
created_at: "2026-03-28"
due_date: null
started_at: "2026-03-28"
completed_at: "2026-03-28"
prd_refs: ["FR-040", "FR-041", "FR-042", "FR-050", "FR-051", "FR-070", "FR-071", "FR-072", "FR-073", "FR-074", "FR-080", "FR-090"]
blocks: ["004", "012", "013", "015"]
blocked_by: []
---

## Description

Design wireframes and component specifications for the four core views: Dashboard, Kanban Board, Gantt Chart, and Task Detail panel. These specs must be complete enough for @frontend-developer to implement without design questions. The tool is used on desktop, tablet, and mobile — all views must be designed responsively. The aesthetic should feel like a "command center" — dark theme preferred, clean, professional, inspired by the Raphael advisor concept from TenSura.

## Reuse Context

An existing production Timesheet web application exists at `D:\00. CloudData\Personal\OneDrive\MyApp\ClaudeProjects\Timesheet\apps\web\` that shares the same intended visual language and component library. Wireframes for Raphael should be consistent with or deliberately improve upon this shell.

### Existing AppShell Reference

The Timesheet app has a production-quality AppShell layout at:
`D:\00. CloudData\Personal\OneDrive\MyApp\ClaudeProjects\Timesheet\apps\web\src\components\layout\AppShell.tsx`

Key characteristics of the existing shell:
- Collapsible sidebar + topbar layout
- Tailwind CSS dark theme
- Already in use by the same team — Raphael's shell should feel familiar, not foreign

### Existing Component Library

The Timesheet app uses the following library stack, which Raphael will also adopt. Wireframes should specify components from within this ecosystem rather than introducing new ones:

| Library | Role | Notes |
|---------|------|-------|
| Radix UI | Primitive components | Avatar, Dialog, Dropdown, Select, Tabs, Toast already in use |
| Lucide React | Icon library | Consistent icon set across both apps |
| Recharts | Data visualisation | Already used for charts — apply to dashboard stat widgets and PPC trend |
| Tailwind CSS | Styling | Dark theme, utility-first |

When specifying components in the design system inventory, annotate each with the Radix UI or Lucide primitive it should be built on, where applicable.

## Acceptance Criteria

- [x] Dashboard wireframe: layout of project summary cards, stats widgets (overdue, due today, completed this week), team workload, and Raphael briefing panel
- [x] Kanban board wireframe: column layout, task card design, drag indicator, filter bar
- [x] Gantt chart wireframe: timeline grid, task bar design, dependency arrows, today marker, overdue highlighting
- [x] Task detail wireframe: full task view with subtasks checklist, comments section, file attachment area, dependency list
- [x] Mobile layout specified for each view (min-width 375px)
- [x] Color tokens defined in ARCHITECTURE.md Design System section
- [x] Typography scale defined in ARCHITECTURE.md Design System section
- [x] Component inventory started in ARCHITECTURE.md (at minimum: Button, Input, Badge, TaskCard, ProjectCard)

## Technical Notes

- The app must be responsive down to 375px (FR-090)
- WCAG 2.1 AA accessibility required (FR-090 non-functional)
- Kanban drag-drop will use `@dnd-kit` library — design should account for drag handles
- Gantt will use a library (frappe-gantt or similar) — design should work within library constraints
- Reference the existing AppShell at `Timesheet/apps/web/src/components/layout/AppShell.tsx` for the sidebar/topbar pattern — extend it, do not replace it without justification
- Recharts is already available for the PPC trend chart and dashboard stat visualisations — no new chart library needed
- Radix UI primitives should be the base for all interactive components (modals, dropdowns, selects, toasts)
- See ARCHITECTURE.md for planned component structure: `client/src/components/` and `client/src/features/`

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-03-28 | human | Task created during onboarding |
| 2026-03-28 | human | Existing Timesheet codebase and CurrentDb databases identified for reuse — task updated |
| 2026-03-28 | @ui-ux-designer | Completed — wireframes written to docs/technical/WIREFRAMES.md; Design System section in ARCHITECTURE.md fully populated with color tokens, typography scale, spacing system, and component specifications |
