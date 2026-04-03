/**
 * dashboard.model.ts — Raw SQL query functions for the dashboard summary.
 *
 * All queries are scoped to the authenticated user's projects via a JOIN to
 * project_members. This is the only place that executes dashboard SQL.
 * No business logic lives here.
 *
 * SECURITY: All inputs are passed via named parameters — never string-concatenated.
 */

import { query, sql } from '../lib/db.js';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface DashboardProject {
  id: number;
  name: string;
  domain: string;
  status: string;
  taskCount: number;
  memberCount: number;
}

export interface DashboardStats {
  dueToday: number;
  overdue: number;
  completedThisWeek: number;
}

export interface WorkloadEntry {
  userId: number;
  displayName: string;
  taskCount: number;
  overdueCount: number;
}

export interface PpcTrendEntry {
  weekStartDate: string;
  ppc: number | null;
}

export interface DashboardRfiStats {
  openCount: number;
  pendingResponse: number;
  overdueCount: number;
}

// ---------------------------------------------------------------------------
// DB row shapes (snake_case from SQL Server)
// ---------------------------------------------------------------------------

interface DashboardProjectRow {
  id: number;
  name: string;
  domain: string;
  status: string;
  task_count: number;
  member_count: number;
}

interface StatsRow {
  due_today: number;
  overdue: number;
  completed_this_week: number;
}

interface WorkloadRow {
  user_id: number;
  display_name: string;
  task_count: number;
  overdue_count: number;
}

interface PpcTrendRow {
  week_start_date: string;
  ppc: number | null;
}

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

/**
 * getProjectSummaries — returns active and planning project summary cards
 * for the authenticated user. Each row includes task_count and member_count.
 *
 * Scoped to user's projects via project_members JOIN.
 * Excludes cancelled projects.
 */
export async function getProjectSummaries(userId: number): Promise<DashboardProject[]> {
  const rows = await query<DashboardProjectRow>(
    `SELECT
       p.id,
       p.name,
       p.domain,
       p.status,
       (
         SELECT COUNT(*)
         FROM tasks t
         WHERE t.project_id = p.id
       ) AS task_count,
       (
         SELECT COUNT(*)
         FROM project_members pm2
         WHERE pm2.project_id = p.id
       ) AS member_count
     FROM projects p
     INNER JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = @userId
     WHERE p.status NOT IN (N'cancelled')
     ORDER BY p.updated_at DESC`,
    { userId: { type: sql.Int, value: userId } },
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    domain: row.domain,
    status: row.status,
    taskCount: row.task_count,
    memberCount: row.member_count,
  }));
}

/**
 * getTaskStats — returns three counts scoped to the user's projects:
 *   - dueToday: tasks due today that are not done
 *   - overdue: tasks with a past due_date that are not done
 *   - completedThisWeek: tasks completed since the start of the current ISO week (Monday)
 *
 * A single query computes all three using conditional aggregation.
 * DATEADD/DATEDIFF pattern derives the Monday of the current week in UTC.
 */
export async function getTaskStats(userId: number): Promise<DashboardStats> {
  const rows = await query<StatsRow>(
    `SELECT
       SUM(CASE
         WHEN t.due_date = CAST(GETUTCDATE() AS date)
          AND t.status NOT IN (N'done')
         THEN 1 ELSE 0
       END) AS due_today,
       SUM(CASE
         WHEN t.due_date < CAST(GETUTCDATE() AS date)
          AND t.status NOT IN (N'done')
         THEN 1 ELSE 0
       END) AS overdue,
       SUM(CASE
         WHEN t.completed_at >= DATEADD(
               day,
               -(DATEPART(weekday, GETUTCDATE()) + 5) % 7,
               CAST(GETUTCDATE() AS date)
             )
          AND t.status = N'done'
         THEN 1 ELSE 0
       END) AS completed_this_week
     FROM tasks t
     INNER JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = @userId`,
    { userId: { type: sql.Int, value: userId } },
  );

  const row = rows[0];
  return {
    dueToday: row?.due_today ?? 0,
    overdue: row?.overdue ?? 0,
    completedThisWeek: row?.completed_this_week ?? 0,
  };
}

/**
 * getWorkload — returns task count and overdue count per assignee,
 * across all active projects the requesting user belongs to.
 *
 * Only includes users who have at least one open task.
 * Results are ordered by taskCount descending (most loaded first).
 */
export async function getWorkload(userId: number): Promise<WorkloadEntry[]> {
  const rows = await query<WorkloadRow>(
    `SELECT
       u.id AS user_id,
       u.display_name,
       COUNT(*) AS task_count,
       SUM(CASE
         WHEN t.due_date < CAST(GETUTCDATE() AS date)
          AND t.status NOT IN (N'done')
         THEN 1 ELSE 0
       END) AS overdue_count
     FROM tasks t
     INNER JOIN users u ON u.id = t.assignee_id
     INNER JOIN projects p ON p.id = t.project_id
     INNER JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = @userId
     WHERE t.status NOT IN (N'done')
       AND p.status NOT IN (N'cancelled')
     GROUP BY u.id, u.display_name
     ORDER BY task_count DESC`,
    { userId: { type: sql.Int, value: userId } },
  );

  return rows.map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    taskCount: row.task_count,
    overdueCount: row.overdue_count,
  }));
}

export async function getRfiStats(userId: number): Promise<DashboardRfiStats> {
  const rows = await query<{ open_count: number; pending_response: number; overdue_count: number }>(
    `SELECT
       SUM(CASE WHEN r.status IN (N'open', N'in_review', N'pending_response') THEN 1 ELSE 0 END) AS open_count,
       SUM(CASE WHEN r.status = N'pending_response' THEN 1 ELSE 0 END) AS pending_response,
       SUM(CASE
         WHEN r.sla_due_date < CAST(GETUTCDATE() AS date)
          AND r.status NOT IN (N'closed', N'cancelled')
         THEN 1 ELSE 0
       END) AS overdue_count
     FROM rfis r
     INNER JOIN project_members pm ON pm.project_id = r.project_id AND pm.user_id = @userId`,
    { userId: { type: sql.Int, value: userId } },
  );

  const row = rows[0];
  return {
    openCount: row?.open_count ?? 0,
    pendingResponse: row?.pending_response ?? 0,
    overdueCount: row?.overdue_count ?? 0,
  };
}

/**
 * getPpcTrend — returns PPC (Percent Plan Complete) records for the last 8
 * weeks across all the user's projects, ordered by week_start_date ascending.
 *
 * Rows without a PPC value (week not yet closed) are included with ppc: null.
 */
export async function getPpcTrend(userId: number): Promise<PpcTrendEntry[]> {
  const rows = await query<PpcTrendRow>(
    `SELECT TOP 8
       CONVERT(varchar(10), w.week_start_date, 120) AS week_start_date,
       w.ppc
     FROM weekly_work_plans w
     INNER JOIN project_members pm ON pm.project_id = w.project_id AND pm.user_id = @userId
     WHERE w.week_start_date <= CAST(GETUTCDATE() AS date)
     ORDER BY w.week_start_date DESC`,
    { userId: { type: sql.Int, value: userId } },
  );

  // Return in ascending order for chart rendering
  return rows
    .map((row) => ({
      weekStartDate: row.week_start_date,
      ppc: row.ppc,
    }))
    .reverse();
}
