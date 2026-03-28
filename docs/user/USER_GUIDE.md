<!--
DOCUMENT METADATA
Owner: @documentation-writer
Update trigger: Any user-facing feature is added, changed, or removed
Update scope: Full document
Read by: @qa-engineer (to understand expected user behavior and flows)
-->

# Raphael — User Guide

> Last updated: 2026-03-28
> Version: 0.1.0 (pre-release — updated as features are built)

---

## Getting Started

### Logging In

1. Navigate to the Raphael app URL (ask your admin for the address)
2. Enter your username and password
3. Click **Log In**

**Forgot your password?** Contact your system admin — they can reset it for you. There is no self-service reset in v1.

**New user?** Accounts are created by admins. You'll receive your credentials directly.

---

## Navigation

Raphael has the following main sections (filled in as features are built):

- **Dashboard** — overview of all your projects, today's tasks, and the Raphael briefing
- **Projects** — list of all projects you're assigned to
- **Kanban** — visual board view for a project's tasks
- **Gantt** — timeline view for a project's tasks and dependencies
- **Lookahead** — Lean construction 3–6 week plan view
- **Team** — user management (admin only)

---

## Features

### Dashboard

The dashboard is your command center. It shows:
- Summary cards for each active project
- Tasks due today and overdue tasks
- Team workload at a glance
- **Raphael's Briefing** — the AI advisor's daily priority list

*Detailed instructions will be added when this feature is implemented.*

---

### Kanban Board

The Kanban board shows all tasks in a project organized by status columns: **To Do → In Progress → In Review → Done**.

#### Moving Tasks

1. Open a project
2. Click **Kanban** in the project navigation
3. Drag any task card to a different column to update its status

#### Filtering

Use the filter bar above the board to filter by assignee, priority, or due date.

*Detailed instructions will be added when this feature is implemented.*

---

### Gantt Chart

The Gantt chart shows tasks as horizontal bars on a timeline, with arrows indicating dependencies.

- **Overdue tasks** are highlighted in red
- **Drag a bar** to reschedule a task's dates

*Detailed instructions will be added when this feature is implemented.*

---

### Last Planner System (Lean Construction)

Raphael supports the Last Planner System for Lean construction project delivery.

#### Weekly Work Plan (WWP)

At the start of each week, create a Weekly Work Plan:
1. Open a project
2. Go to **Lean** → **Weekly Plan**
3. Add the tasks your team commits to completing this week
4. At week end, mark each task Complete or Incomplete
5. For incomplete tasks, enter a reason (variance analysis)

#### Percent Plan Complete (PPC)

PPC is calculated automatically at week end: `completed tasks / total planned tasks × 100%`. The trend chart shows your project's reliability over time.

*Detailed instructions will be added when this feature is implemented.*

---

### Raphael AI Advisor

The Raphael advisor panel appears on your dashboard. It generates a daily briefing showing:
- Your top 3–5 priorities across all active projects
- Overdue and blocked tasks that need attention
- Scheduling conflicts and at-risk items

You can also ask Raphael questions in natural language:
- *"What's blocking the electrical panel project?"*
- *"Who has the most tasks due this week?"*
- *"What should I focus on today?"*

*Detailed instructions will be added when this feature is implemented.*

---

## Account Settings

### Changing Your Password

1. Click your name in the top-right corner
2. Select **Account Settings**
3. Enter your current password and new password
4. Click **Save**

---

## Troubleshooting

### Common Error Messages

| Message | Meaning | What to Do |
|---------|---------|------------|
| Invalid username or password | Credentials are incorrect | Double-check your username; contact admin if locked out |
| You don't have permission | Your role doesn't allow this action | Contact your admin |
| Session expired | Your session has timed out after inactivity | Log in again |

### Getting Help

Contact the system administrator directly. There is no external support channel for this internal tool.

---

## FAQ

**Q: Can I register myself?**
A: No — accounts are created by the admin only.

**Q: Does this work on my phone?**
A: Yes — the app is fully responsive and works on mobile browsers.

**Q: How does Raphael decide what my priorities are?**
A: The AI advisor analyses task due dates, priorities, blocked tasks, and project status across all your active projects, then generates a ranked recommendation with reasoning.
