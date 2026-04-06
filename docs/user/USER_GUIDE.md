<!--
DOCUMENT METADATA
Owner: @documentation-writer
Update trigger: Any user-facing feature is added, changed, or removed
Update scope: Full document
Read by: @qa-engineer (to understand expected user behavior and flows)
-->

# Raphael — User Guide

> Last updated: 2026-04-06
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
- **Timesheets** — log and track work hours by project
- **RFIs** — manage Requests for Information on your projects (design queries)
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

#### Raphael's Briefing Panel (AI Advisor)

The Raphael briefing panel displays AI-generated insights about your projects. See the dedicated **Raphael AI Advisor** section below for full documentation.

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

### Timesheets

Log and track your work hours across projects. The Timesheets feature lets you record how many hours you spent on each project each day, with optional work-type classification (e.g., Modelling, Coordination) and free-text notes.

#### How to Navigate to Timesheets

1. From the main sidebar or navigation menu, click **Timesheets**
2. The Entries tab opens by default — this is your daily timesheet

#### Four Views: Entries, Weekly, Monthly, Yearly

The timesheet has four tabs:

**Entries** — All individual time log records you've created. Add, edit, or delete entries here. An "Export PDF" button lets you download a report of the current view.

**Weekly** — A summary of hours logged each week, grouped by project. Navigate years with the arrow buttons.

**Monthly** — A summary of hours logged each month, grouped by project. Navigate years with the arrow buttons.

**Yearly** — All-time hours totals by year and project. Shows your career total hours logged in the system.

#### Logging a Timesheet Entry

1. Stay on the **Entries** tab
2. Click **Add Entry** in the top-right corner
3. A form appears with fields:
   - **Project** (required) — select which project you worked on
   - **Date** (required) — select the date you worked
   - **Hours** (required) — enter how many hours (0.25 to 24 in quarter-hour increments, e.g., 4.5)
   - **Work Type** (optional) — select a category like "Modelling", "Meeting & Preparation", or "QA Checking" from a grouped dropdown
   - **Description** (optional) — free text, e.g. "Coordination meeting with BIM team"
4. Click **Add entry**

**What to expect**: The entry saves and the form closes. The new entry appears in the table below. The total hours for the current view updates.

#### Updating or Deleting an Entry

1. Find the entry in the Entries table
2. Click the **pencil icon** to edit, or the **trash icon** to delete
3. For edits: the form opens with the existing values. Change what you need and click **Save changes**. You cannot change the project — if you logged time to the wrong project, delete the entry and create a new one.
4. For deletes: a confirmation happens, then the entry is permanently removed

**Upsert behaviour**: If you log time for the same project and date twice, the second entry overwrites the first. You can have only one entry per project per day.

#### Exporting a PDF Report

1. Go to the **Entries** tab
2. Optionally filter by project using the dropdown
3. Click **Export PDF** in the top-right corner
4. Your browser downloads a PDF report of the visible entries and total hours

The PDF includes your own timesheet entries and the date range of the filtered results. Admin and manager users can export all team members' timesheets when they view the report settings.

#### Common Issues

**"Entry won't save" — Hours error**
Hours must be greater than 0 and no more than 24 per day. Use 0.25 increments (e.g., 0.5, 1.25, 4.5). Check the validation message and correct the hours value.

**"No projects shown in the dropdown"**
You must be a member of at least one project. Ask your project manager or admin to add you to a project. Once added, the project list will refresh.

---

### RFI Manager (Request for Information)

RFIs (Requests for Information) are formal queries raised during design or construction when information is missing or unclear. Raphael's RFI Manager lets you create, track, respond to, and manage RFI lifecycle within a project.

#### How to Access RFIs

1. Open a project from the Projects page
2. Click the **RFI** tab in the project navigation

RFIs are project-specific — each project has its own RFI list.

#### The RFI Dashboard and List Views

The RFI section has two tabs:

**Dashboard** — A high-level summary: total RFI count, open/overdue counts, average response time, and an SLA compliance percentage. Offers a quick status snapshot and "Export Summary PDF" button for reporting.

**RFI List** — All RFIs for the project in a filterable sidebar with an optional detail panel. Click an RFI to view or edit it.

#### Filtering RFIs

On the RFI List tab, use the filter bar at the top:

1. **Status** dropdown — show only RFIs with a specific status: Open, Under Review, Responded, or Closed
2. **Discipline** dropdown — filter by engineering discipline (e.g., Electrical, Plumbing, Structural)
3. **Priority** dropdown — show only Low, Medium, High, or Urgent RFIs

Multiple filters can be applied together. Click **Clear** to reset all filters.

#### Creating a New RFI

1. On the RFI List tab, click **+ New RFI** at the top
2. A form appears with required and optional fields:
   - **Title** (required) — brief subject of the query
   - **Discipline** (required) — select from Mechanical, Electrical, Plumbing, Fire Protection, Civil / Structural, Architectural, or General
   - **Submitted By** (required) — name of the person or firm submitting the RFI
   - **Description** (required) — detailed question or scope of the inquiry
   - **Priority** (optional) — Low, Medium (default), High, or Urgent
   - **Assigned To** (optional) — person responsible for responding
   - **Drawing Ref** (optional) — drawing number or document reference
   - **Spec Section** (optional) — specification section reference
   - **Required Date** (optional) — by when you need the response
3. Click **Create RFI**

**What to expect**: The RFI is created and assigned an auto-generated number like "RFI-2026-001". The number format is `RFI-{year}-{NNN}` and resets each calendar year. The RFI appears in the list and opens in the detail panel.

#### Viewing and Editing an RFI

1. Click an RFI in the list to open its detail panel
2. The panel shows:
   - RFI number, title, status badge (Open / Under Review / Responded / Closed)
   - Discipline and priority badges with due date and SLA status
   - Meta information: submitted by, assigned to, drawing/spec references, dates
   - The original question/description
   - An "Official Response" text area for the answer
   - Comments section for team discussion
   - Attachments (images) for the RFI
   - Activity log showing all status changes and updates

#### Changing RFI Status

The status workflow is **Open → Under Review → Responded → Closed**.

1. In the detail panel header, find the **Status** dropdown
2. Select a new status
3. Click to confirm — the status updates immediately

**Auto-setting response date**: When you transition to "Responded", the response date is automatically set to today (if not already set). You can edit it manually before saving.

#### Adding an Official Response

1. Scroll to the "Official Response" section in the detail panel
2. Type or paste the response text in the textarea
3. Add any attachments (see below)
4. Click the **Save** button (green button in the header)

#### Attaching Images to an RFI

You can attach up to 6 images per RFI. Images can be:
- Attached to the RFI itself (always visible in the Attachments section)
- Attached to individual comments (associated with that comment only)

**To attach images to the RFI:**
1. In the "Attachments" section, click **Add / Paste** button (dashed box)
2. Either click to select files from your computer, or **paste a screenshot** directly (Ctrl+V)
3. Images appear as thumbnails below — you can remove them by clicking the X on hover
4. When you have pending images, a yellow warning says "N images pending — click Save to upload"
5. Click the **Save** button at the top to upload all pending images

**To attach images to a comment:**
1. Scroll to the Comments section
2. Type your comment text (or leave blank if attaching images only)
3. Click the **Attach image** link below the comment box
4. Select one or more image files
5. Images appear as thumbnails — click the X to remove any
6. Click **Post** to submit the comment with images

**Viewing images**: Click an image thumbnail to zoom in and view full-size in a lightbox. Click the X or outside the image to close.

#### Adding Comments

1. Scroll to the "Comments" section in the detail panel
2. Type your message in the "Add a comment" field
3. Optionally attach images (see above)
4. Click **Post** or press Ctrl+Enter to submit

**What to expect**: Your comment appears immediately in the comment list with your initials, a timestamp (e.g., "2 hours ago"), and any attached images. Comments are ordered oldest first.

#### Exporting RFI Reports

Two export options are available:

**Export Summary PDF** (on the RFI List tab header) — generates a PDF report of all RFIs and SLA statistics for the entire project. Click the button and your browser downloads the file.

**Export PDF** (in the RFI detail header) — exports the single RFI being viewed as a detailed PDF, including all metadata, description, response, comments, and images.

#### Understanding RFI Status and SLA

Each RFI can be in one of four statuses:
- **Open** — newly created, awaiting review
- **Under Review** — someone is working on the response
- **Responded** — a response has been provided (response date is set)
- **Closed** — the RFI is complete and no further action needed

SLA (Service Level Agreement) tracking:
- If an RFI has a "Required Date", Raphael calculates whether the response was provided by that date
- The status badge shows **On Track** (responded by the due date) or **Overdue** (not yet responded, past the due date)
- The Dashboard tab shows an SLA compliance percentage: % of RFIs responded on or before the required date

#### Common Issues

**"Can't transition to Responded" or "Required date shows as missing"**
If the RFI has a required date, Raphael will auto-set the response date when you change status to "Responded". If you need to set a specific response date, edit the response and click Save before changing status.

**"Image won't upload"**
Check that the file is an image (jpg, png, gif, webp, etc.). Maximum 10 MB per file. The RFI can have at most 6 images — if you're at the limit, delete an existing image first.

---

### Raphael AI Advisor

Raphael — the Great Sage — analyzes your active projects and intelligently surfaces what matters most today. The AI Advisor appears on the Dashboard as a briefing panel and lets you ask natural language questions about project status.

#### The Raphael Briefing Panel

The briefing panel is a card on the main Dashboard. It displays:

**Live indicator** — A green pulsing dot labeled "Live" shows the briefing is fresh. A timestamp below ("Updated 5m ago") shows when the briefing was last generated.

**Alerts** — Highlighted issue chips for urgent items: overdue tasks, blocked tasks, and tasks due today. Each alert is tagged with a red, orange, or yellow badge and icon.

**Priorities** — A ranked list (1, 2, 3, ...) of the most important things to focus on today. Each item shows:
- A priority level badge (Critical, High, Normal)
- A summary sentence of what needs attention
- Optional detail text providing context
- Task title and project name (as gray chips) for quick reference

**Recommendations** — Numbered suggestions (1, 2, 3) for actions to take based on current project state. These are AI-generated and contextual to your workload.

**Empty state**: If you have no urgent issues, the panel displays "No active issues — projects are on track" with a green checkmark.

#### Loading and Error States

**Loading state** — When the briefing is being generated, skeleton rows animate in the priorities section.

**Error state** — If the AI provider is unavailable (API offline or credentials expired), an alert appears with the message "Advisor unavailable". A **Retry** button allows you to re-fetch the briefing.

#### Asking Raphael a Question

1. At the bottom of the briefing panel, find the **Ask Raphael** input field
2. Type a natural language question about your projects, e.g., "Which tasks are overdue?", "What's the status of Project X?", or "Who is overloaded this week?"
3. Press **Enter** or click the **Send** button (paper plane icon)
4. Raphael responds with an answer based on current project data

**What to expect**: A brief loading spinner appears while the AI generates a response. Once ready, the answer appears in a collapsible block below the input, labeled "Raphael's answer".

**Dismissing an answer**: Click the X button in the answer header, or the collapse arrow to hide the answer text. You can ask another question anytime.

#### How Raphael Works

Raphael has access to:
- All your active projects (status, members, task counts)
- All project tasks (title, status, due date, assignee, priority)
- Weekly work plans and PPC history (planning reliability)
- Blocked and overdue task relationships
- Team member workload (open tasks per person)

Raphael **cannot** access:
- Comments or notes on tasks
- Attachments or files
- Personal information beyond display names and roles
- Archived or cancelled projects

#### Auto-Refresh Behavior

The briefing automatically refreshes once per hour. If you want an immediate fresh analysis:
1. Click the **Retry** button (if there's an error), or
2. Manually refresh the page (Ctrl+R)

#### Common Issues

**"Briefing shows an error — 'Advisor unavailable'"**
The AI provider API may be offline, or the API key is expired. Contact your system admin to check the AI provider status. Click **Retry** to try again.

**"Answer seems outdated"**
The briefing uses a snapshot of your project data from the last refresh (up to 1 hour old). Force a refresh by reloading the page (Ctrl+R) or clicking the Retry button to get fresh data.

**"Can the AI see my private notes?"**
No. Raphael only analyzes system data: task titles, statuses, due dates, and assignments. Comments, descriptions, and attachments are not visible to the AI.

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

