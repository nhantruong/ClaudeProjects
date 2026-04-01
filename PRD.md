# Product Requirements Document

> [!WARNING]
> **READ-ONLY FOR ALL AGENTS**
> This document is the source of truth for what we are building.
> Claude agents must READ this document to understand requirements.
> **Do not edit, rewrite, or "update to reflect current state" without explicit human instruction.**
> When in doubt, leave it unchanged and ask the human.

---

**Version**: 1.0
**Status**: Draft
**Last updated by human**: 2026-03-28
**Product owner**: Raphael (project owner)

---

## 1. Executive Summary

Raphael is an AI-powered project and task management system for small engineering teams. It provides Kanban boards, Gantt charts, and Lean construction workflows (Last Planner System) in a single platform, with an AI advisor — also named Raphael — that analyzes project state and tells the team what to work on next. The primary users are electromechanical engineers, BIM managers, and coders who currently manage their work across disconnected tools with no intelligent prioritization. The intended outcome is that the team uses Raphael as their daily command center: every project tracked, every task visible, and every morning the advisor surfaces exactly what matters most.

---

## 2. Problem Statement

### 2.1 Current Situation

The team manages projects spanning electromechanical engineering, BIM coordination, and software development using a combination of spreadsheets, whiteboards, chat messages, and ad-hoc notes. There is no unified backlog, no visual workflow, and no system that understands project dependencies across disciplines.

### 2.2 The Problem

Without a unified system, critical tasks are lost between tools, priorities are unclear, and there is no mechanism to apply Lean construction discipline (Last Planner System, Percent Plan Complete tracking) to engineering project delivery. The team has no way to get a quick answer to "what should I do right now?" across all active projects.

### 2.3 Why Now

AI capabilities have matured enough to build a genuinely useful project advisor at low cost. The team is growing in complexity — more projects, more disciplines — and the cost of coordination failure is increasing. Self-hosted infrastructure is available and ready.

---

## 3. Goals & Success Metrics

### 3.1 Business Goals

- The project owner and team use Raphael as their primary task management system daily
- All active projects are tracked in one place with no tasks managed outside the system
- The Raphael AI advisor reduces time spent deciding "what to do next" each morning

### 3.2 Success Metrics

| Metric | Baseline | Target | How Measured |
|--------|----------|--------|--------------|
| Daily active use | 0 days/week | 5 days/week | Server session logs |
| Tasks managed outside system | All tasks | 0 tasks | Self-reported |
| Morning planning time | ~20 min | < 5 min | Self-reported |
| Lean PPC (Percent Plan Complete) | Not tracked | Tracked weekly | In-app metric |

---

## 4. User Personas

### Persona: Raphael — Project Owner & Engineer

- **Role**: Electromechanical engineer, BIM manager, and coder; sole decision-maker for the system
- **Goals**: Manage all projects across all disciplines from one screen; get AI-assisted daily briefings; track team progress without micromanaging
- **Pain points**: Context-switching between tools; no cross-discipline task visibility; spends too long each morning figuring out priorities
- **Technical level**: Developer (comfortable with code and tools)
- **Usage frequency**: Daily

### Persona: Team Member — Engineer / Specialist

- **Role**: Electromechanical engineer, BIM specialist, or developer on the team
- **Goals**: See what tasks are assigned to them, update task status, view project Kanban and Gantt
- **Pain points**: Unclear priorities; not knowing what blocks others; missing deadlines because of poor visibility
- **Technical level**: Moderate (comfortable with web tools, not necessarily coding)
- **Usage frequency**: Daily

---

## 5. Functional Requirements

> Requirements are numbered FR-XXX for unambiguous cross-referencing by agents and in tests.

### 5.1 Authentication

- **FR-001**: Users must be able to log in with a username and password
- **FR-002**: Authenticated sessions must persist across browser refreshes
- **FR-003**: Admin users must be able to create new user accounts (no self-registration)
- **FR-004**: Sessions must expire after 30 days of inactivity
- **FR-005**: Users must be able to change their own password

### 5.2 Team Management

- **FR-010**: Admin must be able to create, edit, and deactivate user accounts
- **FR-011**: The system must support roles: Admin, Manager, Member
- **FR-012**: Managers and Admins must be able to assign users to projects
- **FR-013**: Users must only see projects they are assigned to

### 5.3 Project Management

- **FR-020**: Users must be able to create and manage multiple projects
- **FR-021**: Projects must support a domain/category tag: Electromechanical, BIM, Software, Other
- **FR-022**: Projects must have a name, description, start date, end date, and status
- **FR-023**: Project status options: Planning, Active, On Hold, Completed, Cancelled
- **FR-024**: The dashboard must display a summary card for each active project

### 5.4 Task Management

- **FR-030**: Users must be able to create, edit, assign, and delete tasks within a project
- **FR-031**: Tasks must have: title, description, assignee, priority, status, start date, due date
- **FR-032**: Task status options: To Do, In Progress, In Review, Done, Blocked
- **FR-033**: Task priority options: Critical, High, Normal, Low
- **FR-034**: Tasks must support subtasks (checklists)
- **FR-035**: Tasks must support file attachments
- **FR-036**: Tasks must support comments from team members
- **FR-037**: Tasks must support dependency links (blocks / blocked-by)

### 5.5 Kanban Board

- **FR-040**: Each project must have a Kanban board view with columns matching task statuses
- **FR-041**: Users must be able to drag and drop tasks between Kanban columns
- **FR-042**: Kanban board must support filtering by assignee, priority, and due date
- **FR-043**: Kanban board must visually indicate overdue tasks

### 5.6 Gantt Chart

- **FR-050**: Each project must have a Gantt chart view showing tasks on a timeline
- **FR-051**: Gantt chart must render task start and due dates as horizontal bars
- **FR-052**: Gantt chart must visualize task dependencies as arrows between bars
- **FR-053**: Gantt chart must highlight overdue tasks and critical path items
- **FR-054**: Users must be able to adjust task dates by dragging bars on the Gantt chart

### 5.7 Lean Construction — Last Planner System

- **FR-060**: Each project must support weekly work plan (WWP) creation
- **FR-061**: Users must be able to mark weekly plan tasks as Complete or Incomplete at week end
- **FR-062**: The system must automatically calculate and display Percent Plan Complete (PPC) per week
- **FR-063**: Users must be able to record a reason for each incomplete task (variance analysis)
- **FR-064**: The system must display a PPC trend chart over time per project
- **FR-065**: The system must support 3–6 week lookahead planning view

### 5.8 Dashboard

- **FR-070**: The main dashboard must display summary cards for all active projects
- **FR-071**: Dashboard must show: tasks due today, overdue tasks, tasks completed this week
- **FR-072**: Dashboard must show a team workload summary (tasks per person)
- **FR-073**: Dashboard must display the weekly PPC trend across all projects
- **FR-074**: Dashboard must show a "Raphael's Briefing" panel with AI-generated priorities

### 5.9 Raphael AI Advisor

- **FR-080**: The system must provide an AI advisor panel accessible from the dashboard
- **FR-081**: The advisor must generate a daily briefing: top 3–5 priorities across all projects, with reasoning
- **FR-082**: The advisor must detect scheduling conflicts (overdue tasks, blocked tasks) and surface them
- **FR-083**: The advisor must answer natural language questions about project status (e.g., "What's blocking project X?")
- **FR-084**: The advisor must suggest task reprioritization when critical-path tasks are at risk
- **FR-085**: Advisor responses must cite specific tasks and projects by name

### 5.10 Cross-Platform Support

- **FR-090**: The application must be fully responsive and usable on desktop, tablet, and mobile (min-width 375px)
- **FR-091**: The application must work on modern browsers: Chrome 110+, Firefox 110+, Edge 110+, Safari 16+

---

## 6. Non-Functional Requirements

### Performance
- API responses must be under 500ms at p95 for all standard queries
- Page initial load must be under 3 seconds on a standard broadband connection
- Gantt chart must render up to 200 tasks without visible lag

### Security
- Authentication required for all endpoints — no unauthenticated access to any data
- Passwords hashed with bcrypt (cost factor ≥ 12)
- All inputs validated and sanitized server-side to prevent SQL injection and XSS
- HTTPS required in production

### Scalability
- System must support up to 20 concurrent users without degradation (small team tool)

### Accessibility
- WCAG 2.1 AA compliance for all primary user flows

### Browser / Platform Support
- Modern browsers: Chrome 110+, Firefox 110+, Edge 110+, Safari 16+
- Mobile-responsive down to 375px width

### Reliability
- Self-hosted; uptime is best-effort (no formal SLA for v1)
- Database backups must be configured before production use

---

## 7. Out of Scope (v1.0)

- **Billing and payments** — not applicable; internal tool
- **Client portal** — external stakeholder access not planned for v1
- **Email notifications** — in-app only for v1; email integration is v2
- **Native mobile apps** — responsive web covers mobile; native iOS/Android is v2
- **Third-party integrations** (Jira, MS Project, AutoCAD, Revit) — v2
- **Time tracking / timesheets** — out of scope
- **Document management / DMS** — file attachments on tasks only; no full DMS
- **Multi-language / i18n** — English only for v1
- **SSO / LDAP / Active Directory** — TBD for v2 depending on need

---

## 8. Open Questions

> These are unresolved decisions that require human input before implementation can proceed.

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | Authentication method: username/password only, or add Microsoft SSO? | Raphael | **Resolved** — JWT in httpOnly cookies (ADR-002) |
| 2 | AI provider for Raphael advisor: OpenAI GPT-4, Claude API, or local model (Ollama)? | Raphael | **Resolved** — Claude API (primary) + Ollama local fallback (ADR-003) |
| 3 | Mobile: responsive web is sufficient for v1, or is a PWA wrapper needed? | Raphael | **Resolved** — Responsive web only for v1 |
| 4 | Real-time updates: WebSockets for live Kanban/task updates, or standard HTTP polling? | Raphael | **Resolved** — React Query polling (30s interval) for v1 (ADR-004) |

---

## 9. Revision History

> Human entries only. Agents do not modify this section.

| Date | Author | Change Description |
|------|--------|--------------------|
| 2026-03-28 | Raphael | Initial draft — onboarding complete |
