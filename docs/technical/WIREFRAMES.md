# Raphael — UI/UX Wireframes and Interaction Specifications

> Owner: @ui-ux-designer
> Last updated: 2026-03-28
> Version: 1.0
> Covers: Dashboard, Kanban Board, Gantt Chart, Task Detail Panel
> Breakpoints: 375px (mobile) / 768px (tablet) / 1280px (desktop)

---

## Aesthetic Foundation

**Theme**: Command center — dark, dense, calm. Not flashy. Built for engineers who live in this tool eight hours a day. Every pixel earns its place.

**Visual language**: Deep slate backgrounds with sharp teal/cyan accents. Minimal chrome. Information-forward. Borders are used purposefully as structural dividers, not decoration. Slight geometric texture on the background surface to prevent the pure-black flatness of generic dark themes.

**Font pairing**:
- Display / headings: "DM Mono" (monospaced, engineered feel — numbers align precisely in data tables, which matters for this audience)
- Body / UI copy: "DM Sans" (clean, legible at small sizes, pairs with DM Mono without feeling mismatched)
- Both available via Google Fonts (self-hosted recommended for performance on internal network)

**Layout philosophy**: Sidebar-anchored shell. Primary navigation is always visible on desktop. Content area fills remaining space. Data density is the default — users want to see as many tasks as possible, not whitespace.

---

## App Shell

### Desktop Layout (1280px+)

```
+------------------------------------------------------------------+
|  SIDEBAR (240px fixed)  |  TOP BAR (full width, 56px)           |
|                         +---------------------------------------+|
|  [Raphael logo + mark]  |  [Breadcrumb]    [Search] [Avatar]   ||
|                         |                                       ||
|  --- Navigation ---     +---------------------------------------+|
|                         |                                       ||
|  [Dashboard]            |  MAIN CONTENT AREA                    ||
|  [Projects]             |  (scrollable, flex-1)                 ||
|    > Kanban             |                                       ||
|    > Gantt              |                                       ||
|    > Lean               |                                       ||
|  [Team]     (admin)     |                                       ||
|                         |                                       ||
|  --- Bottom ---         |                                       ||
|  [Settings]             |                                       ||
|  [User avatar + name]   |                                       ||
+-------------------------+---------------------------------------++
```

**Sidebar details**:
- Width: 240px expanded, 64px collapsed (icon-only mode)
- Toggle: chevron button at bottom of sidebar, 44x44px touch target
- Active nav item: left border accent (3px, color-accent-teal-500) + background highlight
- Project sub-items indent 16px, appear when Projects item is expanded (accordion, aria-expanded)
- Collapsed state: icons only with tooltip on hover/focus showing the label
- Background: color-surface-sidebar (#0D1117)

**Top bar details**:
- Height: 56px
- Breadcrumb: reflects current page path (e.g., "Projects / Substation SCADA / Kanban")
- Search: global search input, opens command palette (Cmd/Ctrl+K) — icon button that expands
- Avatar: user display name initials, opens account menu (dropdown: Settings, Change Password, Log Out)
- Background: color-surface-topbar (#161B22), border-bottom: 1px solid color-border-default (#30363D)

### Tablet Layout (768px–1279px)

```
+------------------------------------------------------------------+
|  TOP BAR: [Hamburger] [Logo] [Breadcrumb]    [Search] [Avatar]   |
+------------------------------------------------------------------+
|                                                                  |
|  MAIN CONTENT AREA (full width)                                  |
|  Sidebar becomes a slide-over drawer from the left               |
|  Triggered by hamburger button                                   |
|                                                                  |
+------------------------------------------------------------------+
```

- Sidebar slides in from left as a drawer overlay (role="dialog", aria-modal="true")
- Drawer width: 280px
- Backdrop: semi-transparent overlay (#000000 at 60% opacity) — clicking closes drawer
- Focus trapped inside drawer when open; Escape key closes
- Hamburger button: 44x44px, top-left of top bar

### Mobile Layout (375px–767px)

```
+------------------------------------------+
|  TOP BAR: [Hamburger] [Logo]  [Avatar]   |
+------------------------------------------+
|                                          |
|  MAIN CONTENT AREA (full width)          |
|                                          |
+------------------------------------------+
|  BOTTOM NAV (56px, fixed)                |
|  [Home] [Projects] [Tasks] [Team]        |
+------------------------------------------+
```

- Sidebar replaced by bottom navigation bar (4 primary destinations)
- Bottom nav icons: 24x24px, touch target 44x44px each
- Active bottom nav item: teal accent dot below icon + icon color change
- Breadcrumb removed on mobile; page title shown in top bar center

**Shell accessibility**:
- Landmark regions: `<nav aria-label="Main navigation">` for sidebar, `<main>` for content area
- Skip-to-content link: visually hidden, revealed on focus, links to `#main-content`
- Keyboard: Tab moves through top bar then main content; sidebar navigation uses arrow keys within the nav list

---

## A. Dashboard

### User Goal
Understand the state of all active projects and tasks at a glance, then act on the most important item within 30 seconds of arriving.

### Task Flow
```
Step 1: User lands on dashboard → system renders stat cards + project cards (skeleton loaders)
Step 2: Data loads (< 500ms) → stats and project cards render
Step 3: Raphael briefing panel loads (may be slower, up to 3s) → skeleton → briefing content
Step 4: User reads briefing → clicks a priority item → navigates to that task or project
Edge case: No active projects → empty state in project grid with CTA to create project
Edge case: AI briefing fails → panel shows error state with retry button; other content unaffected
```

### Desktop Layout (1280px+)

```
+------------------------------------------------------------------+
|  DASHBOARD                                                       |
|  Good morning, Raphael.    [Refresh briefing]                    |
+------------------------------------------------------------------+
|                                                                  |
|  STAT CARDS ROW (4 cards, equal width, 1/4 each)                |
|  +------------+ +------------+ +------------+ +------------+    |
|  | ACTIVE     | | DUE TODAY  | | OVERDUE    | | DONE       |    |
|  | PROJECTS   | |            | |            | | THIS WEEK  |    |
|  |     6      | |    12      | |     3      | |    28      |    |
|  | [icon]     | | [icon]     | | [icon RED] | | [icon GRN] |    |
|  +------------+ +------------+ +------------+ +------------+    |
|                                                                  |
|  MAIN GRID (two-column: 2/3 content | 1/3 briefing)             |
|                                                                  |
|  +----------------------------------------------+ +----------+ |
|  | PROJECT CARDS GRID (2 columns)               | | RAPHAEL  | |
|  |                                              | | BRIEFING | |
|  |  +--------------------+ +----------------+  | | PANEL    | |
|  |  | ProjectCard        | | ProjectCard    |  | |          | |
|  |  +--------------------+ +----------------+  | |          | |
|  |  +--------------------+ +----------------+  | |          | |
|  |  | ProjectCard        | | ProjectCard    |  | |          | |
|  |  +--------------------+ +----------------+  | |          | |
|  |                                              | |          | |
|  | TEAM WORKLOAD                                | |          | |
|  | Horizontal bar chart (tasks per person)      | |          | |
|  |                                              | |          | |
|  | PPC TREND                                    | |          | |
|  | Line chart, last 8 weeks                     | |          | |
|  +----------------------------------------------+ +----------+ |
|                                                                  |
+------------------------------------------------------------------+
```

**Column proportions**: Left content column `flex: 2` (approx 66%), right briefing column `flex: 1` (approx 33%). Minimum width for left: 560px before switching to stacked layout.

### Stat Cards

```
Component: StatCard
+----------------------------------+
| [Icon - 20px]  ACTIVE PROJECTS   |  <- label, text-label, color-text-muted
|                                  |
|         6                        |  <- value, text-heading-1 (DM Mono)
|                                  |
| [trend: +2 from last week]       |  <- secondary, text-caption
+----------------------------------+
```

- Card background: color-surface-card (#1C2128)
- Border: 1px solid color-border-default (#30363D)
- Border radius: 8px
- Padding: 20px 24px
- Overdue card: border-left: 3px solid color-error-500; icon in color-error-500
- Hover: border color shifts to color-border-hover (#484F58); subtle shadow lift
- All four cards are non-interactive (no click) — they are display only

**Stat values** use DM Mono at heading-1 size so numbers always align visually.

### Project Cards

```
Component: ProjectCard
+--------------------------------------------+
| [Domain badge: BIM]    [Status: ACTIVE]    |  <- row 1
|                                            |
| Substation SCADA Project                   |  <- project name, text-heading-3
| Next due: Panel wiring diagram — 2 days    |  <- text-small, color-text-muted
|                                            |
| [Progress bar — 68%]  68% complete         |  <- progress row
|                                            |
| [Avatar][Avatar][Avatar] +2 more           |  <- member row (avatars xs)
+--------------------------------------------+
```

- Card background: color-surface-card (#1C2128)
- Border: 1px solid color-border-default (#30363D)
- Border radius: 8px
- Padding: 16px 20px
- Progress bar: background color-neutral-700, fill color based on status (active = teal, on_hold = amber)
- Progress bar height: 4px, border-radius: 2px (pill)
- Overdue tasks within project: a small red counter badge overlaid on the card top-right: "[!] 3 overdue"
- Click: navigates to project Kanban view
- Hover: border color shifts, cursor pointer
- Focus: 2px focus ring in color-accent-teal-500

### Raphael Briefing Panel

```
+----------------------------------------+
| [Raphael mark — 24px icon]             |
| RAPHAEL'S BRIEFING                     |  <- panel title
| Today, 28 March 2026                   |  <- date, text-caption
|                                        |
| [Skeleton shimmer while loading]       |
|                                        |
| --- When loaded: ---                   |
|                                        |
| PRIORITY 1  [Critical badge]           |
| Substation panel wiring is overdue     |
| by 3 days and blocks 4 downstream      |
| tasks. Assign or escalate today.       |
| [View task ->]                         |
|                                        |
| PRIORITY 2  [High badge]               |
| BIM coordination clash in Level 3      |
| must be resolved before Wednesday.     |
| [View task ->]                         |
|                                        |
| PRIORITY 3  [Normal badge]             |
| Sprint retrospective for software      |
| team is overdue by 1 week.             |
| [View task ->]                         |
|                                        |
| [Ask Raphael a question...]            |  <- input at bottom
| [Send button]                          |
+----------------------------------------+
```

- Panel background: color-surface-elevated (#1C2128) with a very subtle left border accent (3px, color-accent-teal-500)
- Each priority item: separated by a 1px divider, padding 12px 0
- Priority number: DM Mono, text-caption, color-text-muted
- Priority badge: colored Badge component (critical/high/normal)
- "View task" link: text-small, color-accent-teal-400, arrow icon, keyboard-focusable
- Ask Raphael input: full-width text input at panel bottom, placeholder "Ask about your projects...", Submit on Enter or button click
- Loading: entire panel body shows skeleton shimmer (3 rows of gray bars, animated)
- Error state: centered error icon + "Could not load briefing" + "Try again" button
- Panel scrolls internally if briefing content exceeds panel height

### Team Workload Section

- Horizontal bar chart (Recharts BarChart, horizontal layout)
- X-axis: task count (0 to max+20% headroom)
- Y-axis: team member display names
- Each bar: single color (color-accent-teal-500), label shows count at end of bar
- Section heading: "Team Workload — This Week", text-heading-3

### PPC Trend Section

- Line chart (Recharts LineChart)
- X-axis: week labels (abbreviated: "W1", "W2", etc.)
- Y-axis: percentage (0–100%)
- Target line: dashed horizontal line at 80% (color-warning-500) labelled "Target"
- Actual line: color-accent-teal-500, dots on each data point
- Section heading: "PPC Trend — Last 8 Weeks", text-heading-3

### Tablet Layout (768px–1279px)

```
+------------------------------------------------------------------+
|  STAT CARDS ROW (2 cards per row, 2 rows)                        |
|  +-------------------------+ +-------------------------+         |
|  | ACTIVE PROJECTS         | | DUE TODAY               |         |
|  +-------------------------+ +-------------------------+         |
|  | OVERDUE                 | | DONE THIS WEEK          |         |
|  +-------------------------+ +-------------------------+         |
|                                                                  |
|  PROJECT CARDS (2 columns)                                       |
|  [ProjectCard] [ProjectCard]                                     |
|  [ProjectCard] [ProjectCard]                                     |
|                                                                  |
|  RAPHAEL BRIEFING PANEL (full width)                             |
|  [Priority items stacked, horizontal on wide tablet]             |
|                                                                  |
|  TEAM WORKLOAD + PPC TREND (side by side if >= 960px, else stacked)|
+------------------------------------------------------------------+
```

### Mobile Layout (375px–767px)

```
+------------------------------------------+
|  STAT CARDS (2x2 grid, each card 50%)    |
|  [ACTIVE] [DUE TODAY]                    |
|  [OVERDUE] [DONE]                        |
|                                          |
|  RAPHAEL BRIEFING (full width, collapsed)|
|  [Raphael icon] TODAY'S PRIORITIES  [v]  |
|  (expandable accordion — collapsed by default to save space)
|                                          |
|  PROJECT CARDS (1 column, full width)    |
|  [ProjectCard]                           |
|  [ProjectCard]                           |
|                                          |
|  TEAM WORKLOAD (full width chart)        |
|  PPC TREND (full width chart)            |
+------------------------------------------+
```

On mobile, the Raphael briefing panel collapses to an accordion. Tap the header to expand/collapse. `aria-expanded` updated on toggle. Default: collapsed so project cards are immediately visible.

---

## B. Kanban Board

### User Goal
See all tasks in a project grouped by status, move tasks between statuses by dragging, and identify what needs immediate attention (overdue, blocked, high priority).

### Task Flow
```
Step 1: User navigates to a project Kanban view → board loads with skeleton columns
Step 2: Tasks render in their status columns
Step 3: User optionally applies filters (assignee, priority, due date)
Step 4a: User drags a task card to a new column → task status updates optimistically → PATCH API call in background
Step 4b: User clicks a task card → Task Detail drawer opens from the right
Step 5: User clicks "Add task" at column bottom → inline quick-create form appears
Edge case: Drag fails (API error) → task snaps back to original column; toast error shown
Edge case: All tasks filtered out → each column shows empty state
Edge case: Board has 0 tasks → "No tasks yet" empty state in each column with Add Task CTA
```

### Desktop Layout (1280px+)

```
+------------------------------------------------------------------+
|  PROJECT NAME / Kanban     [Gantt] [Lean] [Settings]             |
|  [Filter bar]                                                    |
+------------------------------------------------------------------+
|                                                                  |
|  KANBAN BOARD (horizontal scroll container)                      |
|                                                                  |
|  +----------+ +----------+ +----------+ +----------+ +--------+ |
|  | TODO     | |IN PROGRESS| |IN REVIEW | |  DONE    | |BLOCKED | |
|  | (12)     | | (5)       | | (3)      | |  (28)    | | (2)    | |
|  |          | |           | |          | |          | |        | |
|  | [Card]   | | [Card]    | | [Card]   | | [Card]   | | [Card] | |
|  | [Card]   | | [Card]    | | [Card]   | | [Card]   | | [Card] | |
|  | [Card]   | | [Card]    | |          | | [Card]   | |        | |
|  |          | |           | |          | |          | |        | |
|  | [+ Add]  | | [+ Add]   | | [+ Add]  | | [+ Add]  | |[+ Add] | |
|  +----------+ +----------+ +----------+ +----------+ +--------+ |
|                                                                  |
+------------------------------------------------------------------+
```

- Column widths: 280px each, fixed. Board scrolls horizontally when columns overflow viewport
- Column gap: 12px
- Board container: `overflow-x: auto`, scrollbar visible (custom styled)
- Column header: uppercase label, task count in parentheses, DM Mono font
- Column header background: color-surface-sidebar (#0D1117)
- Column body: color-surface-column (#131920, subtly lighter than sidebar)
- Column body: `overflow-y: auto`, max-height fills viewport below filter bar

**Filter Bar**:

```
+------------------------------------------------------------------+
| Assignee: [Avatar][Avatar][Avatar] (+)     Priority: [All v]     |
|                                            Due: [Date range v]   |
|                                     [Clear filters]              |
+------------------------------------------------------------------+
```

- Assignee filter: horizontally scrollable row of Avatar chips (each toggleable, 44px touch target)
- Selected assignees: teal border ring on avatar; unselected: muted
- Priority dropdown: options = All / Critical / High / Normal / Low (Badge-styled pills inside dropdown)
- Due date range: two date inputs or a date range picker (start - end)
- Clear filters button: text-small, ghost style, only visible when at least one filter is active
- Filter bar height: 48px; background: color-surface-sidebar (#0D1117); border-bottom: 1px solid color-border-default

### Task Card

```
Component: TaskCard (used on Kanban board)

+----------------------------------+
| [::] [Priority badge]  [Avatar]  |  <- header row
|                                  |
| Task title goes here and can     |  <- title, text-body, max 2 lines then ellipsis
| wrap to two lines if needed      |
|                                  |
| [Project name - if cross-board]  |  <- only shown in cross-project views
|                                  |
| [Calendar icon] Mar 31  [!OVR]   |  <- due date row; overdue shows red text + alert icon
| [3/5 subtasks] [Link icon if dep]|  <- subtask progress + dependency warning
+----------------------------------+
```

- Card background: color-surface-card (#1C2128)
- Card border: 1px solid color-border-default (#30363D)
- Card border-radius: 6px
- Card padding: 12px 14px
- Card width: fills column width minus 2*8px padding = 264px
- Card gap (between cards in column): 8px
- Drag handle `[::]`: 12px wide, left-aligned, visible only on hover (CSS opacity transition). Uses `data-dnd-kit-drag-handle` attribute. On mobile: always visible (no hover). Aria-label="Drag to reorder".
- Priority badge: `Badge` component (see component spec below)
- Assignee avatar: right-aligned, size xs (24x24px), tooltip with name on hover/focus
- Title: text-body weight-medium, color-text-default. Max 2 lines, `-webkit-line-clamp: 2`
- Due date: text-small with calendar icon (16px Lucide CalendarIcon). Normal = color-text-muted. Overdue = color-error-400 text, `[!]` alert icon prepended (TriangleAlertIcon)
- Subtask progress: "[3/5]" text-small, color-text-muted, with CheckSquareIcon 14px
- Dependency warning: LinkIcon 14px in color-warning-500 if task has unresolved blocking dependencies
- Overdue card: left border accent 3px color-error-500 (in addition to normal border)
- Blocked column cards: card border color-error-500 (full border, not just left)
- Drag ghost: card at 80% opacity, 3px color-accent-teal-500 border, slight scale(1.02) transform
- Drag ghost motion: 150ms ease-out
- Card hover: border color shifts to color-border-hover (#484F58), subtle box-shadow
- Card click: opens Task Detail drawer (unless user is dragging)
- Focus: 2px focus ring in color-accent-teal-500

**Keyboard drag with dnd-kit**: Space to pick up, arrow keys to move between columns, Space/Enter to drop, Escape to cancel. Live region announces column changes: "Task moved to In Progress".

### Add Task Button

```
+----------------------------------+
| +  Add a task                    |  <- ghost style, full column width
+----------------------------------+
```

- Position: fixed at bottom of each column body
- Height: 36px, padding 8px 12px
- Style: dashed border 1px color-border-default, background transparent
- Hover: border solid color-accent-teal-500, background color-surface-card
- On click: inline quick-create form expands at bottom of column (above the button)

**Quick-create form** (inline, within column):
```
+----------------------------------+
| [Task title input - full width]  |
| [Assignee v] [Priority v]        |
| [Cancel]          [Add task >]   |
+----------------------------------+
```
- Title input: autofocused when form opens; Enter submits; Escape cancels
- Assignee and Priority: compact selects (text-small)
- Cancel: ghost button; Add task: primary button size sm
- Form collapses on submit or cancel

### Column Empty State

```
+----------------------------------+
|                                  |
|   [inbox icon 32px, muted]       |
|   No tasks here                  |
|   [+ Add a task]                 |
|                                  |
+----------------------------------+
```

Centered vertically within column body. Icon: InboxIcon (Lucide), color-neutral-600.

### Tablet Layout (768px–1279px)

- All 5 columns visible, each narrowing to ~220px; board still scrolls horizontally
- Filter bar collapses: assignee avatars hidden, replaced by "Filters (n active)" button that opens a filter drawer

### Mobile Layout (375px–767px)

```
+------------------------------------------+
|  [< Todo | In Progress | In Review >]    |  <- column tab switcher (swipeable)
|  Currently showing: IN PROGRESS (5)      |
+------------------------------------------+
|  [Task Card]                             |
|  [Task Card]                             |
|  [Task Card]                             |
|  [+ Add a task]                          |
+------------------------------------------+
```

- Single column shown at a time
- Column switcher: horizontal scrollable tab bar at top (role="tablist")
- Swipe left/right to change column (touch gesture)
- Active column indicator: underline + color-accent-teal-500
- Drag-drop disabled on mobile; drag handle replaced by a "Move to..." menu accessible from a `[...]` menu on the card
- "Move to..." opens a bottom sheet with column options (Todo, In Progress, etc.)

---

## C. Gantt Chart

### User Goal
Understand the timeline of all tasks in a project, see which tasks are overdue or at risk, understand dependency chains, and reschedule tasks by dragging bars.

### Task Flow
```
Step 1: User navigates to project Gantt view → chart loads with current date in view
Step 2: Task list renders on left; timeline bars render on right
Step 3: User scans for overdue tasks (highlighted red) or conflicts
Step 4: User drags right edge of a bar to change end date → PATCH API call
Step 5: User changes zoom level (Day/Week/Month) using controls
Step 6: User clicks a task row → Task Detail drawer opens
Edge case: Task has no dates — bar not rendered; row shows "No dates set" placeholder
Edge case: Circular dependency — not possible by design; prevent at form level
```

### Layout (All Breakpoints)

```
+------------------------------------------------------------------+
|  PROJECT / Gantt     [Kanban] [Lean] [Settings]                  |
|  [Zoom: Day | WEEK | Month]    [Today button]    [Collapse all]  |
+------------------------------------------------------------------+
|                      |                                           |
|  TASK LIST PANEL     |  TIMELINE PANEL                           |
|  (280px fixed)       |  (flex-1, horizontally scrollable)        |
|                      |                                           |
|  [v] Project Group   |  [Month header: March 2026]               |
|    Task A            |  [Week headers: W13 W14 W15 W16...]       |
|    Task B            |  [Today line: vertical red]               |
|    Task C            |  ...                                      |
|  [v] Another Group   |       [====== Bar A ======]              |
|    Task D            |            [== Bar B ==]                  |
|    Task E            |       [===== Bar C (OVERDUE) =====]       |
|                      |            --> depends on Bar A           |
|                      |       [======== Bar D ========]           |
|                      |                                           |
+----------------------+-------------------------------------------+
```

**Task list panel**:
- Width: 280px on desktop, 200px on tablet, hidden on mobile (see mobile section)
- Column: task title, truncated with ellipsis at 260px. Title is a clickable link (opens Task Detail drawer)
- Group rows: project or phase grouping with collapse toggle (ChevronDown icon, rotates 180 when collapsed)
- Row height: 40px (matches Gantt library default row height for alignment)
- Background: color-surface-sidebar (#0D1117)
- Divider between list and timeline: 1px solid color-border-default, with a drag handle for resize

**Timeline panel**:
- Uses frappe-gantt or dhtmlx-gantt library for bar rendering
- Timeline columns: day/week/month depending on zoom
- Row height: 40px
- Horizontal scroll: `overflow-x: auto`
- Background: color-surface-primary (#0E1117)

**Timeline header**:
- Row 1: month labels (March 2026, April 2026)
- Row 2: week or day labels (abbreviated)
- Header height: 48px total (two 24px rows)
- Header background: color-surface-sidebar (#0D1117)
- Header border-bottom: 1px solid color-border-default

**Today marker**:
- Vertical line spanning full timeline height
- Color: color-error-400 (#F85149) at 80% opacity
- Width: 1px
- Label: "Today" text above the line, text-caption, color-error-400

**Task bars**:
- Color by status:
  - todo: color-neutral-600 (#484F58)
  - in_progress: color-status-inprogress (#1F6FEB)
  - in_review: color-status-inreview (#D29922)
  - done: color-status-done (#2EA043)
  - blocked: color-status-blocked (#DA3633)
- Overdue bars (past due_date, status not done): border 2px solid color-error-500, slightly desaturated fill
- Bar height: 20px (within 40px row, vertically centered)
- Bar border-radius: 3px
- Bar label: task title in white text inside bar if bar wide enough (> 80px); otherwise outside to the right

**Dependency arrows**:
- SVG arrows connecting bars (library-rendered)
- Arrow color: color-neutral-500 (#6E7681)
- Arrow style: right-angle path (finish-to-start)
- Arrowhead: 6px solid triangle

**Drag interaction**:
- Resize right edge of bar: cursor `col-resize`, resize handle appears on hover (12px wide invisible hit area)
- Drag bar body: moves entire task (changes start and end date, maintaining duration)
- While dragging: bar at 80% opacity, date tooltip shows new dates
- On drop: optimistic update, PATCH API call; revert on error with toast

**Zoom controls**:
- Segmented control (button group): Day | Week | Month
- Default: Week zoom
- Keyboard: each option is a radio button (role="radio", role="radiogroup")

**Collapse all toggle**: text button with ListCollapseIcon, collapses all group rows

### Mobile Layout (375px–767px)

```
+------------------------------------------+
|  [Zoom: Day | WEEK | Month] [Today]       |
+------------------------------------------+
|  TASK LIST (full width, no timeline)     |
|  Each row: task name, status badge,      |
|  due date, bar color indicator           |
|                                          |
|  [v] Group                               |
|    [=] Task A — In Progress — Mar 31     |
|    [=] Task B — Done — Mar 28            |
|                                          |
|  [Switch to Timeline view]               |
+------------------------------------------+
```

On mobile, the Gantt is presented as a structured task list (task name, status badge, due date colored by overdue status). A "Switch to Timeline" button opens a full-screen horizontal-scroll-only timeline view (no left panel). Users pinch-zoom to adjust timeline density. This is a pragmatic degradation — full Gantt on a 375px screen is not usable.

---

## D. Task Detail Panel

### User Goal
Read, update, and action a specific task — changing its status, editing its description, managing subtasks, reviewing dependencies, and discussing with teammates in comments.

### Task Flow
```
Step 1: User clicks a task card (Kanban) or task title (Gantt) → drawer slides in from right
Step 2: Drawer loads task data (skeleton while fetching)
Step 3: User reads/edits as needed
Step 4: User changes status via dropdown → optimistic update, PATCH call
Step 5: User switches tabs (Details / Subtasks / Comments / Activity)
Step 6: User closes drawer via X button, Escape key, or clicking backdrop
Edge case: Unsaved changes in description editor → warn on close ("Discard changes?")
Edge case: Task deleted by another user while drawer is open → 404 → show "Task no longer exists" error state with close button
```

### Layout (Desktop — 480px wide drawer)

```
MAIN CONTENT (obscured, 50% opacity overlay on left side)
+------------------------------------------------------------------+
|  BACKDROP (click to close)              | TASK DETAIL DRAWER     |
|                                         | (480px, full height)   |
|                                         |                        |
|                                         | +--------------------+ |
|                                         | | [X close] [... menu]| |
|                                         | |                     | |
|                                         | | TASK TITLE          | |
|                                         | | (editable inline,   | |
|                                         | | text-heading-2)     | |
|                                         | |                     | |
|                                         | | [Status v] [Priority v]|
|                                         | |                     | |
|                                         | | METADATA ROW:       | |
|                                         | | [Avatar] Raphael    | |
|                                         | | [Project] SCADA     | |
|                                         | | [Cal] Mar 28 start  | |
|                                         | | [Cal] Mar 31 due    | |
|                                         | |                     | |
|                                         | | [Details|Subtasks|  | |
|                                         | |  Comments|Activity] | |
|                                         | |                     | |
|                                         | | TAB CONTENT AREA    | |
|                                         | | (scrollable)        | |
|                                         | |                     | |
|                                         | | --- FOOTER ---      | |
|                                         | | [Delete task]       | |
|                                         | +--------------------+ |
+------------------------------------------------------------------+
```

**Drawer mechanics**:
- Slides in from the right: `transform: translateX(100%)` to `translateX(0)`, 250ms ease-in-out
- Reduced motion: no slide animation; drawer appears instantly with fade (opacity 0 to 1, 150ms)
- Role: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the task title heading
- Focus management: focus moves to the close button (first focusable element) on open; returns to the triggering element on close
- Focus trap: Tab cycles within drawer only; Shift+Tab reverses
- Escape key: closes drawer (with unsaved change warning if applicable)
- Backdrop: `rgba(0,0,0,0.6)` overlay; click closes drawer; `aria-hidden="true"`

**Header area**:
- Close button: X icon, 36x36px, top-right. Aria-label="Close task detail"
- Actions menu `[...]`: Lucide EllipsisIcon, 36x36px, opens dropdown: [Duplicate task, Copy link, Delete task]
- Task title: `contenteditable` heading (text-heading-2). Shows pencil icon on hover to indicate editability. Save on blur or Enter; cancel on Escape.
- Status dropdown: Badge-styled button that opens a select menu. Options: Todo / In Progress / In Review / Done / Blocked. Current status styled with status color.
- Priority dropdown: Badge-styled button. Options: Critical / High / Normal / Low.

**Metadata row**:
```
[UserIcon] Raphael [change]     [FolderIcon] SCADA Project
[CalendarIcon] Mar 28, 2026     [CalendarIcon] Due Mar 31, 2026
```
- Each metadata item: 36px touch target; clicking assignee opens user picker popup
- Dates: clicking opens a date picker (Radix UI Popover with a calendar inside)
- Overdue due date: rendered in color-error-400 with TriangleAlertIcon

**Tab navigation**:
- `role="tablist"`, each tab `role="tab"`, panel `role="tabpanel"`
- Arrow keys switch between tabs; Tab moves focus to tab panel content
- Active tab: underline indicator in color-accent-teal-500 + text-weight-semibold
- Tab labels: Details / Subtasks / Comments / Activity

### Details Tab

```
DESCRIPTION
+-----------------------------------------+
| [Markdown editor toolbar if focused]    |
| Task description text...               |
| Supports **bold**, _italic_,           |
| and code blocks                        |
+-----------------------------------------+
| [Save] [Cancel]  (appear on edit)       |

DEPENDENCIES
+-----------------------------------------+
| BLOCKS:                                 |
| [Link] Panel wiring diagram  [x remove] |
| [+ Add dependency]                      |
|                                         |
| BLOCKED BY:                             |
| [Link] Cable routing approval [x remove]|
| [+ Add dependency]                      |
+-----------------------------------------+

FILE ATTACHMENTS
+-----------------------------------------+
| [PaperclipIcon] 3 files                 |
| schematic_v2.pdf  [download] [remove]   |
| site_photo.jpg    [download] [remove]   |
| [+ Attach file]                         |
+-----------------------------------------+
```

- Markdown editor: textarea with lightweight toolbar (bold, italic, code, link). Not a full WYSIWYG — engineers are comfortable with markdown.
- Editor focus: toolbar appears (position sticky above textarea)
- Save / Cancel buttons: appear only when content has been changed (dirty state). Save = primary sm; Cancel = ghost sm
- Dependencies: each entry is a clickable link that opens that task's drawer
- "Add dependency" opens a task search popup (combobox, role="combobox")
- Dependency search popup: type to filter tasks by title; arrow keys to navigate results; Enter to select; Escape to close

### Subtasks Tab

```
SUBTASKS (3 of 5 complete)
+-----------------------------------------+
| [x] Install cable tray                  |  <- completed: strikethrough, muted
| [x] Pull cables                         |
| [ ] Label all cables                    |  <- incomplete
| [ ] Terminate at panel                  |
| [ ] Test continuity                     |
|                                         |
| [+ Add subtask]                         |
|   [input: Subtask title]    [Add]       |
+-----------------------------------------+
```

- Each subtask: `<label>` wrapping `<input type="checkbox">` + title text
- Checkbox: custom styled to match design system. 18x18px box, border color-border-default, checked = teal fill with white checkmark
- Completed subtask title: `text-decoration: line-through`, color-text-muted
- Subtask reorder: drag handle visible on hover (same dnd-kit pattern as Kanban)
- Remove subtask: trash icon appears on hover (right side of row), 36x36px touch target
- Edit subtask title: click title to make it editable inline (contenteditable behavior)
- "Add subtask" input: single text input, full width. Enter submits; Escape cancels. New subtask appears at bottom of list.
- Progress summary: "3 of 5 complete" in text-small, color-text-muted, below tab label area

### Comments Tab

```
COMMENTS (4)
+-----------------------------------------+
| [Avatar] Raphael           Mar 27, 16:20 |
| Confirmed the cable spec with supplier.  |
| Awaiting delivery by Friday.             |
|                                          |
| [Avatar] Team Member       Mar 28, 09:04 |
| Can we check the panel dimensions again? |
| [Edit] [Delete]   (own comments only)    |
|                                          |
+-----------------------------------------+
| ADD COMMENT                              |
| [textarea: Write a comment...]           |
| Supports markdown                        |
| [Submit comment]                         |
+-----------------------------------------+
```

- Chronological order (oldest first, newest at bottom)
- Own comments: show Edit and Delete options (text-small links below comment body)
- Comment edit: textarea replaces comment body inline; Save / Cancel buttons
- Comment delete: confirm with inline confirmation (not modal): "[Delete this comment? Yes / Cancel]" appears inline below the comment
- Avatar: size sm (32x32px), tooltip with full name
- Timestamp: text-caption, color-text-muted; tooltip on hover shows full datetime
- Comment textarea: auto-grows with content (CSS `resize: none`, JS auto-height)
- Submit button: primary sm, positioned right-aligned below textarea

### Activity Tab

```
ACTIVITY
+-----------------------------------------+
| [dot] Raphael moved task to In Review   |
|       Mar 28 at 14:32                   |
|                                         |
| [dot] Team Member assigned to Raphael   |
|       Mar 28 at 09:05                   |
|                                         |
| [dot] Task created by Raphael           |
|       Mar 27 at 11:00                   |
+-----------------------------------------+
```

- Read-only chronological log (newest first)
- Each entry: small dot indicator + text description + timestamp
- Text: text-small, color-text-default
- Timestamp: text-caption, color-text-muted

### Footer

```
+-----------------------------------------+
| [TrashIcon] Delete task                 |  <- danger text button, left-aligned
+-----------------------------------------+
```

- Footer: sticky at drawer bottom, border-top: 1px solid color-border-default, padding 12px 20px
- Delete button: ghost style with color-error-400 text and icon
- On click: confirmation dialog (Modal) appears — not inline. "Delete task?" / "This cannot be undone. All subtasks and comments will be deleted." / [Cancel] [Delete] (danger button)

### Mobile Layout (375px–767px)

On mobile, the Task Detail panel occupies the full screen (not a side drawer).

- Opens as a full-screen page transition (slide up from bottom, 250ms ease-in-out)
- Close button remains top-right (X), returns to previous view
- All content stacks vertically, full width
- Tabs: horizontally scrollable tab strip (same tablist/tab/tabpanel pattern)
- Metadata row wraps to two rows (assignee + project on row 1; dates on row 2)
- Footer delete button: full width on mobile

---

## Navigation State and Routing

| Route | View | Notes |
|-------|------|-------|
| `/dashboard` | Dashboard | Default landing after login |
| `/projects` | Project list | Grid of all user's projects |
| `/projects/:id/kanban` | Kanban board | Default project view |
| `/projects/:id/gantt` | Gantt chart | |
| `/projects/:id/lean` | Lean / WWP | |
| `/projects/:id/settings` | Project settings | Manager/Admin only |
| `/team` | Team management | Admin only |
| `/settings` | Account settings | |

Task Detail is a drawer overlay on the current route — it does not change the URL route but should update a URL parameter (e.g., `?task=123`) so that task links are shareable and navigable via browser back button.

---

## Loading, Error, and Empty States

### Loading States

- **Page-level load** (navigating to a new view): Top-of-page progress bar (4px, color-accent-teal-500) slides from 0% to 100% during route transition. Not a spinner — the bar is less disruptive for power users.
- **Card/list content** (dashboard project cards, Kanban columns): Skeleton shimmer. Skeleton components are gray rectangles matching the approximate shape of the real content. Shimmer animation: `background-position` sliding from left to right, 1.5s linear infinite. Wrapped in `prefers-reduced-motion` media query — static gray rectangles (no animation) when motion is reduced.
- **Button actions** (form submit, task move): Replace button label with a spinner icon (AnimateSpinIcon, 16px) + "Saving..." text. Button disabled while in-flight.
- **Raphael briefing**: Full panel skeleton (3 priority-item-shaped rows) while loading.

### Error States

- **Toast notifications**: Appear top-right of viewport. Stack vertically (newest on top). Auto-dismiss after 4 seconds. Each toast: icon + message text + optional "Retry" or "View" action link. Manual dismiss via X button. `role="alert"` (assertive for errors, polite for success). Toasts are the exclusive channel for transient confirmations and background errors.
  - Success toast: CheckCircleIcon, color-success-500 left border
  - Error toast: XCircleIcon, color-error-500 left border
  - Warning toast: TriangleAlertIcon, color-warning-500 left border

- **Inline form errors**: Shown below the relevant input field. Red text (color-error-400), error icon prepended, text-small. `role="alert"` on the error container. Field border changes to color-error-500. Applied per-field on blur; cross-field errors shown on submit.

- **Full-page errors**: For unrecoverable states (e.g., project not found, server error on page load):
  ```
  [centered in main content area]
  [alert icon — 48px]
  Could not load this project
  The server returned an error. Try refreshing the page.
  [Refresh page] (primary button)
  ```

### Empty States

Each empty state has: icon (48px, color-neutral-600), title (text-heading-3), subtitle (text-body, color-text-muted), and a CTA button when applicable.

| Context | Icon | Title | Subtitle | CTA |
|---------|------|-------|----------|-----|
| No projects | FolderIcon | No projects yet | You have not been assigned to any projects. | — (contact admin) |
| Empty Kanban column | InboxIcon | No tasks here | Drag a task in or create a new one. | + Add a task |
| No tasks in Gantt | CalendarIcon | No tasks on the timeline | Add tasks with start and due dates to see them here. | — |
| No comments | MessageSquareIcon | No comments yet | Be the first to comment on this task. | — (textarea below) |
| No WWP tasks | ClipboardListIcon | No tasks planned | Add tasks to this week's work plan. | + Add planned task |

### Confirmation Dialogs

Used only for destructive or irreversible actions.

```
Component: ConfirmDialog (Modal)
+------------------------------------------+
| [AlertTriangleIcon]  Delete Task?        |  <- title
|                                          |
| This will permanently delete "Panel      |  <- body — name the specific item
| wiring diagram" and all its subtasks     |
| and comments. This cannot be undone.     |
|                                          |
|             [Cancel]  [Delete]           |  <- footer; destructive action right-aligned
+------------------------------------------+
```

- Role: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to title
- Focus: moves to Cancel button on open (safer default — avoids accidental deletion)
- Escape: closes dialog (same as Cancel)
- Focus trap: Tab cycles between Cancel and Delete buttons only
- Backdrop: `rgba(0,0,0,0.7)` click closes dialog
- Delete button: color-error variant of Button component
- Cancel button: ghost variant
- Motion: fade + subtle scale (0.95 to 1.0), 200ms ease-in-out. Reduced-motion: fade only.
