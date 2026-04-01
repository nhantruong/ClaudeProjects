<!--
DOCUMENT METADATA
Owner: @documentation-writer
Update trigger: Any user-facing feature is added, changed, or removed
Update scope: Full document
Read by: @qa-engineer (to understand expected user behavior and flows)
-->

# Raphael — User Guide

> Last updated: 2026-03-31
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

Raphael has the following main sections:

- **Dashboard** — overview of all your projects, team workload, and key stats
- **Projects** — list of all projects you're assigned to
- **Kanban** — visual board view for a project's tasks (by status)
- **Gantt** — timeline view for a project's tasks with drag-to-reschedule
- **Lean** — Last Planner System weekly work plan and PPC trend
- **Lookahead** — rolling 3–6 week plan table for upcoming tasks
- **Team** — user management (admin only)

---

## Features

### Dashboard

The dashboard is your command center. It displays:

#### Stats Row

Three summary cards at the top:
- **Due Today** — tasks with today's due date and status not done
- **Overdue** — tasks past their due date and not complete
- **Completed This Week** — tasks marked done since Monday of the current ISO week

#### Active Projects

A grid of project summary cards (updated and planning status only). Each card shows:
- Project name
- Domain (electromechanical, BIM, software, or other)
- Task count and member count

Click a project card to navigate to its Kanban board.

#### Team Workload

A list of team members and their open task counts, ordered by the most loaded person first. Shows only users who have at least one open task assigned. Overdue counts are highlighted separately for each person.

#### PPC Trend Chart

A line chart showing Percent Plan Complete (PPC) history over the last 12 closed weeks (if any). The chart includes:
- Each closed week's PPC plotted as a point
- A horizontal yellow reference line at the 80% target
- A trend line connecting all points

Empty state displays "No PPC data yet" if no weeks have been closed.

#### Raphael's Briefing Panel

Displays "AI Advisor Coming Soon" — the briefing panel will show daily priorities once the advisor API is online.

---

### Kanban Board

The Kanban board shows all tasks in a project organized by five status columns: **To Do → In Progress → In Review → Done → Blocked**.

#### How to View the Kanban Board

1. Open a project from the Projects page or a project card on the Dashboard
2. Click **Kanban** in the project navigation
3. The board loads with all tasks for that project grouped by status

#### Moving Tasks Between Columns

1. Find the task card you want to move
2. **Click and drag** the card left or right to a different column
3. Release the mouse to drop it in the new column
4. The task status updates immediately

**On keyboard**: Press Space to pick up a task, use arrow keys to move it, then press Space or Enter to drop it.

**What to expect**: The card moves instantly (optimistic update). If the server update fails, the card reverts to its original column.

#### Filtering Tasks

1. Look for the filter bar above the board (displays a filter icon)
2. Select an **Assignee** from the dropdown to show only tasks assigned to that person
3. Click a **Priority** chip (Critical, High, Normal, Low) to filter by that priority level
4. Click **Clear** to remove all filters

Multiple filters can be applied at once. The board updates instantly.

#### Common Issues

**Task card doesn't update its status after dragging**
The board may be out of sync. Wait 30 seconds for the auto-refresh, or press Ctrl+R to manually refresh the page.

**Can't find a task you know exists**
Check the filters — it may be hidden by an active filter. Click **Clear** to show all tasks.

---

### Gantt Chart

The Gantt chart displays tasks as horizontal bars on a timeline. Bars show each task's start and due dates. Overdue tasks are highlighted in red.

#### How to View the Gantt Chart

1. Open a project
2. Click **Gantt** in the project navigation
3. The chart loads with all scheduled tasks displayed on a timeline
4. Today is marked with a vertical teal dashed line labeled "Today"

#### Changing the Zoom Level

Click one of the zoom buttons in the toolbar above the chart:
- **Day** — shows individual calendar days (finest detail)
- **Week** — shows weeks (default)
- **Month** — shows months (broadest view)

The chart automatically scrolls to show today's date when you change zoom levels.

#### Rescheduling a Task

1. Find a task bar on the chart
2. **Move the entire bar**: Click in the middle and drag left or right to shift both start and due dates
3. **Extend the end date**: Click and drag the right edge of the bar to the right
4. **Move the start date**: Click and drag the left edge of the bar to the right or left
5. Release the mouse to save

The dates snap to the zoom level (days, weeks, or months). **What to expect**: The bar moves instantly. If the update fails, it reverts to the original position.

#### Understanding Task Colors and Indicators

- **Teal bar** — task in progress
- **Blue bar** — task in progress (focused)
- **Red bar** — overdue task (past due date and not complete)
- **Red stripe on left** — overdue indicator on the bar
- **Green bar** — completed task
- **Gray bar** — task to do or on hold
- **Assignee initials** — shown to the left of the task title (small avatar)
- **Priority dot** — colored dot in the left margin (red = critical, orange = high, etc.)

#### Unscheduled Section

Below the chart, a list shows tasks with no start date or due date. These tasks have:
- Priority badge (Critical, High, Normal, Low)
- Assignee name (if assigned)
- A "No dates set" label

You can reschedule these tasks by setting start and due dates in their task detail panel (click to open the task).

#### Common Issues

**Task bars don't appear on the chart**
The task may not have both a start date and due date set. Check the Unscheduled section below the chart. Click the task to open its detail panel and add dates.

**Dragging a bar doesn't seem to work**
Make sure you're clicking in the middle of the bar (drag to move), not at the edges. The edges are for resizing only.

---

### Task Detail Panel

Click any task card on the Kanban board, or a task row on the Gantt chart or Lookahead table, to open the task detail panel on the right side.

#### What You Can Edit

**Title** — Click the title text to edit it inline. Press Enter to save or Escape to cancel.

**Description** — Click the description area to edit a longer text. Press Ctrl+Enter to save or Escape to cancel.

**Assignee** — Click the assignee field to open a dropdown of team members. Select someone to assign the task, or select "Unassigned" to remove the assignment.

**Status** — Click the status badge to pick a new status: To Do, In Progress, In Review, Done, or Blocked.

**Priority** — Click the priority badge to change it: Critical, High, Normal, or Low.

**Start Date** — Click to open a date picker and set the start date, or leave it blank.

**Due Date** — Click to open a date picker and set the due date, or leave it blank.

All changes save automatically when you click outside the field (no Save button needed).

#### Subtasks (Checklist)

A section titled "Subtasks" shows a checklist for the task.

**How to add a subtask:**
1. Click the **+** icon in the Subtasks section
2. Type the subtask title
3. Press Enter to create it

**How to mark a subtask complete:**
- Click the checkbox next to the subtask title

**How to edit a subtask:**
- Click the subtask title to edit it inline, press Enter to save

**How to delete a subtask:**
- Click the trash icon next to the subtask

#### Comments

A "Comments" section shows all team discussion on the task.

**How to add a comment:**
1. Scroll to the Comments section
2. Type your message in the "Add a comment" input field
3. Click the **Send** button (paper plane icon) or press Ctrl+Enter

**Comment display:**
- Each comment shows the author's name, timestamp (e.g., "2 hours ago"), and message text
- Older comments appear at the top; newer comments at the bottom

#### Dependencies

A "Dependencies" section (if any) shows:
- **Depends on** — tasks that must complete before this task can start
- **Blocks** — tasks that are waiting for this task to complete

Dependency management allows you to explicitly model task blocking relationships for planning and risk detection.

#### Closing the Panel

Click the **X** button in the top-right corner of the panel, press Escape, or click the darkened area outside the panel.

---

### Last Planner System (Lean Construction)

Raphael supports the Last Planner System for Lean construction project delivery. The Lean section includes weekly work plans (WWP), Percent Plan Complete (PPC) tracking, and lookahead planning.

#### Creating a Weekly Work Plan

1. Open a project
2. Click **Lean** in the project navigation
3. Use the week navigation buttons (← →) to select the week you want to plan for
4. If a plan doesn't exist for that week, click **Create plan for this week**
5. The new plan is created and you can immediately add task commitments

**Week navigation**: The current week is labeled "Current week" below the date range. Navigate back or forward to plan past weeks or future weeks.

#### Adding Task Commitments

1. In the WWP view, you'll see a section labeled "No commitments yet" or a list of existing tasks
2. Click **Add task** at the bottom
3. A form appears with fields:
   - **Description** — what the team commits to completing (required)
   - **Assignee** — who is responsible (optional)
   - **Link to existing task** — select an existing task to link this commitment to (optional)
4. Click **Save** to add the commitment to the plan

#### Marking Tasks Complete or Incomplete

1. Find the task in the weekly plan list
2. Click the checkbox icon next to the task description
3. A checkmark appears and the task fades (complete state)

**If the task is incomplete:**
- A variance reason section appears below the task with a dropdown
- Select a reason why the task wasn't completed:
  - Late delivery from upstream
  - Design change
  - Resource unavailable
  - Prerequisite not complete
  - Other (free text)
- A variance reason is **required** before closing the week

#### Closing the Week and Calculating PPC

1. Ensure all incomplete tasks have a variance reason assigned
2. Click **Close week & calculate PPC** button
3. The system calculates PPC: `(completed tasks / total tasks) × 100%`
4. A green success message displays the PPC result
5. The button changes to "Recalculate PPC" — you can recalculate at any time to update the percentage

**What to expect**: If any incomplete task lacks a variance reason, the close fails with an error message. Add the missing reason and try again.

**PPC value**: The calculated PPC is stored and appears in the header (e.g., "PPC: 85.7%").

#### Common Issues

**"Failed to close week" — required variance reasons**
One or more incomplete tasks is missing a variance reason. Scroll through the list, find incomplete tasks, and add a reason to each one.

**Can't create a plan for a week**
A plan already exists for that week. Use the navigation buttons to find a different week, or click the existing plan to view and edit it.

---

### PPC Trend Chart

Located on the main Lean page, the PPC Trend chart displays project reliability over time.

**What it shows:**
- X-axis: weeks (from oldest to newest)
- Y-axis: Percent Plan Complete (0–100%)
- Yellow reference line: 80% target
- Teal line with dots: actual PPC history

**Empty state**: "No PPC data yet" displays if no weeks have been closed.

**Interpretation**: Consistent high PPC (above 80%) indicates good planning accuracy. Trending upward shows improving reliability.

---

### Lookahead Table

The Lookahead view displays tasks due in the next 3–6 weeks organized by week.

#### How to View the Lookahead

1. Open a project
2. Click **Lookahead** in the project navigation
3. The table shows weeks grouped by due date
4. Each week displays a header (e.g., "Week 1: Mar 31 – Apr 6") with task count

#### Table Columns

- **Task** — task title
- **Due** — due date (red if overdue)
- **Assignee** — person responsible (or "Unassigned")
- **Status** — colored badge (To Do, In Progress, In Review, Done, Blocked)
- **Priority** — colored badge (Critical, High, Normal, Low)

#### Using the Lookahead

Click a task row to open its full detail panel. Use the lookahead to:
- Identify tasks coming due in the next weeks
- Spot unassigned or high-priority work early
- Plan resource allocation and sequencing

**Empty state**: If no tasks are due in the next weeks, "No tasks in lookahead" is displayed.

---

## Account Settings

### Changing Your Password

1. Click your name or avatar in the top-right corner of the screen
2. Select **Account Settings** from the dropdown menu
3. Enter your current password
4. Enter your new password (minimum 8 characters)
5. Confirm your new password in the "Confirm password" field
6. Click **Save Changes**

**What to expect**: If the save is successful, you'll see a "Password updated" message. You remain logged in — your next login will require the new password.

#### Common Issues

**"Current password is incorrect"**
Double-check that you entered the correct current password. Passwords are case-sensitive.

**"Passwords don't match"**
The "New password" and "Confirm password" fields must be identical. Check for typos and try again.

**"Password must be at least 8 characters"**
Your new password is too short. Choose a password with at least 8 characters (letters, numbers, symbols).

---

## Troubleshooting

### Common Error Messages

| Message | Meaning | What to Do |
|---------|---------|------------|
| Invalid username or password | Credentials are incorrect | Double-check your username and password; contact admin if locked out |
| You don't have permission | Your role doesn't allow this action | Contact your admin to request access or role change |
| Session expired | Your session timed out after inactivity | Log in again |
| Failed to load tasks | Network or server issue | Wait a moment, then press Ctrl+R to refresh; contact admin if the error persists |
| Failed to update task status | Server error during drag-drop | Wait 30 seconds for auto-refresh; if unchanged, click the task to edit manually |
| Week already exists for this project | You tried to create a WWP for a week that already has one | Navigate to a different week, or edit the existing plan |
| Required variance reasons | You tried to close a week with incomplete tasks that have no variance reason | Add a variance reason to each incomplete task, then close again |

### Getting Help

Contact the system administrator directly. There is no external support channel for this internal tool.

---

## FAQ

**Q: Can I register myself?**
A: No — accounts are created by admins only. You'll receive your credentials directly.

**Q: Does this work on my phone?**
A: Yes — the app is fully responsive and works on mobile browsers. On very small screens, the Kanban board scrolls horizontally, and the Gantt chart is scrollable in both directions.

**Q: How does the 30-second auto-refresh work?**
A: The dashboard, Kanban board, and task lists automatically fetch fresh data from the server every 30 seconds. This ensures you see updates from other team members without needing to manually refresh. You can still press Ctrl+R anytime to refresh immediately.

**Q: Can I delete a task?**
A: Yes, but only if no other tasks depend on it. If a task is blocking other tasks, you must remove those dependencies first. Click the task to open the detail panel and check the Dependencies section.

**Q: What happens if I drag a task to a new date but lose my internet connection?**
A: The drag completes optimistically (the bar moves on screen immediately), but if the server update fails, the bar reverts to its original date after a few seconds. An error message will appear telling you the update failed.

**Q: How is PPC calculated?**
A: PPC = (number of completed tasks / total planned tasks) × 100%. If a week has no tasks, PPC = 0%. The calculation is performed when you click "Close week & calculate PPC" and is stored so that the number never changes once the week is closed (unless you recalculate it).

**Q: What's the difference between "Done" status and marking a task complete in the weekly work plan?**
A: "Done" status means the task record is finished in the project system. Marking a task "complete" in the weekly work plan is a weekly planning tool — you're confirming the team did the work they committed to that week. Both are independent.

**Q: Can I undo closing a week?**
A: No — once a week is closed, it's permanent. The PPC calculation is stored. However, you can click "Recalculate PPC" anytime to recompute the percentage if you change task completion states.

**Q: If I'm offline, can I still use the app?**
A: No — Raphael requires an active connection to the server to load and save data. Your browser will show an error when trying to fetch data if you're offline.

**Q: Why do I see tasks in the Unscheduled section on the Gantt chart?**
A: Tasks without a start date or due date don't appear as bars on the timeline. To schedule them, open each task's detail panel and set both the start date and due date. Once both dates are set, the task will appear on the chart.

**Q: Can I see all team members' workload or only my own?**
A: The Dashboard workload widget shows all team members across your assigned projects. It's ordered by who has the most open tasks. You cannot filter it to show only yourself.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Escape | Close the task detail panel; cancel inline edits |
| Ctrl+R | Manually refresh the page |
| Ctrl+Enter | Submit a comment or save an inline field |
| Space | Pick up a task card on Kanban (keyboard drag mode) |
| Arrow keys | Move a task left/right/up/down in Kanban (keyboard drag mode) |
| Space or Enter | Drop a task in Kanban (keyboard drag mode) |
| Click outside | Close the task detail panel or exit inline edit mode |

