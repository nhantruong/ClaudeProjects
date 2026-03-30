# TODO / Backlog

> **Governor**: @project-manager — invoke for sprint planning, prioritization, and feature breakdown
> **Agents**: May add items to "Backlog" and move completed items to "Completed". Preserve section order. Never reorder items within a section — priority position is set by humans or @project-manager when explicitly asked.

---

## In Progress

_(nothing — ready to pick up next tasks)_

---

## Up Next (prioritized)

- [ ] #011 — Implement project management UI (project list, create/edit project, members) [area: frontend] → [.tasks/011-project-ui.md](.tasks/011-project-ui.md)
- [ ] #012 — Implement Kanban board UI (drag-drop columns, task cards, filters) [area: frontend] → [.tasks/012-kanban-ui.md](.tasks/012-kanban-ui.md)
- [ ] #014 — Implement task detail UI (full task view, subtasks, comments, attachments) [area: frontend] → [.tasks/014-task-detail-ui.md](.tasks/014-task-detail-ui.md)
- [ ] #015 — Implement dashboard UI (project cards, stats widgets, Raphael briefing panel) [area: frontend] → [.tasks/015-dashboard-ui.md](.tasks/015-dashboard-ui.md)
- [ ] #016 — Implement Lean construction API (WWP create/update, PPC calculation, lookahead) [area: backend] → [.tasks/016-lean-api.md](.tasks/016-lean-api.md)
- [ ] #018 — Implement Raphael AI advisor (briefing endpoint, ask endpoint, AI provider integration) [area: backend] → [.tasks/018-raphael-advisor-api.md](.tasks/018-raphael-advisor-api.md)
- [ ] #019 — Implement team management UI (user list, create/edit user — admin only) [area: frontend] → [.tasks/019-team-management-ui.md](.tasks/019-team-management-ui.md)

---

## Backlog
- [ ] #013 — Implement Gantt chart UI (timeline bars, dependency arrows, date drag) [area: frontend] → [.tasks/013-gantt-ui.md](.tasks/013-gantt-ui.md)
- [ ] #017 — Implement Lean construction UI (WWP form, PPC chart, lookahead view) [area: frontend] → [.tasks/017-lean-ui.md](.tasks/017-lean-ui.md)
- [ ] #020 — Set up Playwright E2E test suite and write core flow tests (auth, project creation, task management) [area: qa] → [.tasks/020-e2e-test-suite.md](.tasks/020-e2e-test-suite.md)
- [ ] #021 — Update user guide documentation with completed features [area: docs] → [.tasks/021-user-guide-update.md](.tasks/021-user-guide-update.md)

---

## Completed

- [x] #000 — Initial project setup and template configuration → [.tasks/000-initial-project-setup.md](.tasks/000-initial-project-setup.md)
- [x] #001 — Design and document full database schema for all entities [area: database] → [.tasks/001-database-schema-design.md](.tasks/001-database-schema-design.md)
- [x] #002 — Design UI/UX wireframes for core views: dashboard, kanban, gantt, task detail [area: design] → [.tasks/002-ux-wireframes-core-views.md](.tasks/002-ux-wireframes-core-views.md)
- [x] #003 — Set up Node.js + Express backend project structure (TypeScript, MVC, mssql) [area: backend] → [.tasks/003-backend-project-setup.md](.tasks/003-backend-project-setup.md)
- [x] #004 — Set up React + Vite frontend project structure (TypeScript, Tailwind, TanStack Router, TanStack Query) [area: frontend] → [.tasks/004-frontend-project-setup.md](.tasks/004-frontend-project-setup.md)
- [x] #005 — Implement authentication API (login, logout, password change, session validation) [area: backend] → [.tasks/005-auth-api.md](.tasks/005-auth-api.md)
- [x] #006 — Implement authentication UI (login page, session management) [area: frontend] → [.tasks/006-auth-ui.md](.tasks/006-auth-ui.md)
- [x] #007 — Implement user management API (create, list, update, deactivate — admin only) [area: backend] → [.tasks/007-user-management-api.md](.tasks/007-user-management-api.md)
- [x] #008 — Implement project CRUD API (create, list, get, update, delete, members) [area: backend] → [.tasks/008-project-api.md](.tasks/008-project-api.md)
- [x] #009 — Implement task CRUD API (create, list, get, update, delete, comments, subtasks, dependencies) [area: backend] → [.tasks/009-task-api.md](.tasks/009-task-api.md)
- [x] #010 — Implement dashboard API (summary endpoint for all dashboard data) [area: backend] → [.tasks/010-dashboard-api.md](.tasks/010-dashboard-api.md)

---

## Item Format Guide

When adding new items, use this format:

```
- [ ] #NNN — Brief description of the task [area: frontend|backend|database|qa|docs|infra|design] → [.tasks/NNN-short-title.md](.tasks/NNN-short-title.md)
```

Every TODO item must have a corresponding `.tasks/NNN-*.md` file. @project-manager creates both together.

**Area tags** help agents know which specialist to use:
- `frontend` → @frontend-developer
- `backend` → @backend-developer
- `database` → @database-expert
- `design` → @ui-ux-designer
- `qa` → @qa-engineer
- `docs` → @documentation-writer
- `infra` → @systems-architect
- `setup` → general

**Priority**: Items higher in "Up Next" are higher priority. Agents move completed items to "Completed" and may add new items to "Backlog". Only humans reorder items within a section to change priority, unless explicitly asked to reprioritize.
