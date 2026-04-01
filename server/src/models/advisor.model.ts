/**
 * advisor.model.ts — Raw SQL query functions for AI advisor context assembly.
 *
 * Assembles context data for the Raphael AI advisor. All queries are scoped
 * to the authenticated user's projects via a JOIN to project_members.
 *
 * Five targeted queries run in parallel via Promise.all to keep total
 * latency under 100ms on typical data sizes.
 *
 * SECURITY: All inputs are passed via named parameters — never string-concatenated.
 */

import { query, sql } from '../lib/db.js';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface OverdueTaskSample {
  title: string;
  projectName: string;
  daysOverdue: number;
  assigneeName: string | null;
}

export interface BlockedTaskSample {
  title: string;
  projectName: string;
  blockerTitle: string;
}

export interface DueTodaySample {
  title: string;
  projectName: string;
  priority: string;
}

export interface CriticalTask {
  title: string;
  projectName: string;
  dueDate: string | null;
}

export interface ActiveProjectSummary {
  name: string;
  domain: string;
  openTaskCount: number;
  overdueCount: number;
}

export interface RecentPpcEntry {
  projectName: string;
  weekStartDate: string;
  ppc: number;
}

export interface AdvisorContext {
  overdueTaskCount: number;
  dueTodayTaskCount: number;
  blockedTaskCount: number;
  overdueTaskSamples: OverdueTaskSample[];
  blockedTaskSamples: BlockedTaskSample[];
  dueTodaySamples: DueTodaySample[];
  criticalTasks: CriticalTask[];
  activeProjectSummaries: ActiveProjectSummary[];
  recentPpc: RecentPpcEntry[];
}

// ---------------------------------------------------------------------------
// DB row shapes (snake_case from SQL Server)
// ---------------------------------------------------------------------------

interface OverdueRow {
  title: string;
  project_name: string;
  days_overdue: number;
  assignee_name: string | null;
}

interface DueTodayRow {
  title: string;
  project_name: string;
  priority: string;
}

interface BlockedRow {
  title: string;
  project_name: string;
  blocker_title: string | null;
}

interface CriticalRow {
  title: string;
  project_name: string;
  due_date: string | null;
}

interface ActiveProjectRow {
  name: string;
  domain: string;
  open_task_count: number;
  overdue_count: number;
}

interface PpcRow {
  project_name: string;
  week_start_date: string;
  ppc: number;
}

interface CountRow {
  total: number;
}

// ---------------------------------------------------------------------------
// Individual query functions
// ---------------------------------------------------------------------------

async function getOverdueTasks(
  userId: number,
): Promise<{ samples: OverdueTaskSample[]; total: number }> {
  // Fetch top 5 samples plus a total count in one query using subquery
  const rows = await query<OverdueRow>(
    `SELECT TOP 5
       t.title,
       p.name AS project_name,
       DATEDIFF(day, t.due_date, CAST(GETUTCDATE() AS date)) AS days_overdue,
       u.display_name AS assignee_name
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = @userId
     LEFT JOIN users u ON u.id = t.assignee_id
     WHERE t.due_date < CAST(GETUTCDATE() AS date)
       AND t.status NOT IN (N'done')
     ORDER BY t.due_date ASC`,
    { userId: { type: sql.Int, value: userId } },
  );

  const countRows = await query<CountRow>(
    `SELECT COUNT(*) AS total
     FROM tasks t
     JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = @userId
     WHERE t.due_date < CAST(GETUTCDATE() AS date)
       AND t.status NOT IN (N'done')`,
    { userId: { type: sql.Int, value: userId } },
  );

  return {
    samples: rows.map((r) => ({
      title: r.title,
      projectName: r.project_name,
      daysOverdue: r.days_overdue,
      assigneeName: r.assignee_name,
    })),
    total: countRows[0]?.total ?? 0,
  };
}

async function getDueTodayTasks(
  userId: number,
): Promise<{ samples: DueTodaySample[]; total: number }> {
  const rows = await query<DueTodayRow>(
    `SELECT TOP 5
       t.title,
       p.name AS project_name,
       t.priority
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = @userId
     WHERE t.due_date = CAST(GETUTCDATE() AS date)
       AND t.status NOT IN (N'done')
     ORDER BY
       CASE t.priority
         WHEN N'critical' THEN 1
         WHEN N'high'     THEN 2
         WHEN N'normal'   THEN 3
         ELSE 4
       END`,
    { userId: { type: sql.Int, value: userId } },
  );

  const countRows = await query<CountRow>(
    `SELECT COUNT(*) AS total
     FROM tasks t
     JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = @userId
     WHERE t.due_date = CAST(GETUTCDATE() AS date)
       AND t.status NOT IN (N'done')`,
    { userId: { type: sql.Int, value: userId } },
  );

  return {
    samples: rows.map((r) => ({
      title: r.title,
      projectName: r.project_name,
      priority: r.priority,
    })),
    total: countRows[0]?.total ?? 0,
  };
}

async function getBlockedTasks(
  userId: number,
): Promise<{ samples: BlockedTaskSample[]; total: number }> {
  const rows = await query<BlockedRow>(
    `SELECT TOP 3
       t.title,
       p.name AS project_name,
       dep.title AS blocker_title
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = @userId
     LEFT JOIN task_dependencies td ON td.task_id = t.id
     LEFT JOIN tasks dep ON dep.id = td.depends_on_task_id
     WHERE t.status = N'blocked'`,
    { userId: { type: sql.Int, value: userId } },
  );

  const countRows = await query<CountRow>(
    `SELECT COUNT(*) AS total
     FROM tasks t
     JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = @userId
     WHERE t.status = N'blocked'`,
    { userId: { type: sql.Int, value: userId } },
  );

  return {
    samples: rows.map((r) => ({
      title: r.title,
      projectName: r.project_name,
      blockerTitle: r.blocker_title ?? 'Unknown',
    })),
    total: countRows[0]?.total ?? 0,
  };
}

async function getCriticalTasks(userId: number): Promise<CriticalTask[]> {
  const rows = await query<CriticalRow>(
    `SELECT TOP 5
       t.title,
       p.name AS project_name,
       CONVERT(varchar(10), t.due_date, 120) AS due_date
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = @userId
     WHERE t.priority = N'critical'
       AND t.status NOT IN (N'done')
     ORDER BY t.due_date ASC`,
    { userId: { type: sql.Int, value: userId } },
  );

  return rows.map((r) => ({
    title: r.title,
    projectName: r.project_name,
    dueDate: r.due_date,
  }));
}

async function getActiveProjectSummaries(userId: number): Promise<ActiveProjectSummary[]> {
  const rows = await query<ActiveProjectRow>(
    `SELECT
       p.name,
       p.domain,
       (
         SELECT COUNT(*)
         FROM tasks t
         WHERE t.project_id = p.id
           AND t.status NOT IN (N'done')
       ) AS open_task_count,
       (
         SELECT COUNT(*)
         FROM tasks t
         WHERE t.project_id = p.id
           AND t.due_date < CAST(GETUTCDATE() AS date)
           AND t.status NOT IN (N'done')
       ) AS overdue_count
     FROM projects p
     JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = @userId
     WHERE p.status = N'active'
     ORDER BY p.updated_at DESC`,
    { userId: { type: sql.Int, value: userId } },
  );

  return rows.map((r) => ({
    name: r.name,
    domain: r.domain,
    openTaskCount: r.open_task_count,
    overdueCount: r.overdue_count,
  }));
}

async function getRecentPpc(userId: number): Promise<RecentPpcEntry[]> {
  const rows = await query<PpcRow>(
    `SELECT TOP 8
       p.name AS project_name,
       CONVERT(varchar(10), w.week_start_date, 120) AS week_start_date,
       w.ppc
     FROM weekly_work_plans w
     JOIN projects p ON p.id = w.project_id
     JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = @userId
     WHERE w.ppc IS NOT NULL
     ORDER BY w.week_start_date DESC`,
    { userId: { type: sql.Int, value: userId } },
  );

  return rows.map((r) => ({
    projectName: r.project_name,
    weekStartDate: r.week_start_date,
    ppc: r.ppc,
  }));
}

// ---------------------------------------------------------------------------
// Public assembler — runs all queries in parallel
// ---------------------------------------------------------------------------

/**
 * assembleAdvisorContext — collects all data needed for an AI advisor briefing
 * or question answer.
 *
 * Runs six independent query groups concurrently via Promise.all to keep
 * total latency low. All queries are scoped to the given user's projects.
 */
export async function assembleAdvisorContext(userId: number): Promise<AdvisorContext> {
  const [overdue, dueToday, blocked, criticalTasks, activeProjectSummaries, recentPpc] =
    await Promise.all([
      getOverdueTasks(userId),
      getDueTodayTasks(userId),
      getBlockedTasks(userId),
      getCriticalTasks(userId),
      getActiveProjectSummaries(userId),
      getRecentPpc(userId),
    ]);

  return {
    overdueTaskCount: overdue.total,
    dueTodayTaskCount: dueToday.total,
    blockedTaskCount: blocked.total,
    overdueTaskSamples: overdue.samples,
    dueTodaySamples: dueToday.samples,
    blockedTaskSamples: blocked.samples,
    criticalTasks,
    activeProjectSummaries,
    recentPpc,
  };
}
