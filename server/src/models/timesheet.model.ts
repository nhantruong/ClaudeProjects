/**
 * timesheet.model.ts — Raw SQL query functions for timesheet_entries.
 */

import { query, sql } from '../lib/db.js';

export interface TimesheetEntry {
  id: number;
  userId: number;
  projectId: number;
  projectName: string;
  workTypeId: number | null;
  workTypeName: string | null;
  entryDate: string;
  hours: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TimesheetRow {
  id: number;
  user_id: number;
  project_id: number;
  project_name: string;
  work_type_id: number | null;
  work_type_name: string | null;
  entry_date: string;
  hours: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

function rowToEntry(row: TimesheetRow): TimesheetEntry {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    projectName: row.project_name,
    workTypeId: row.work_type_id,
    workTypeName: row.work_type_name,
    entryDate: row.entry_date,
    hours: row.hours,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listEntries(
  userId: number,
  filters: { projectId?: number; from?: string; to?: string },
): Promise<TimesheetEntry[]> {
  const conditions: string[] = ['t.user_id = @userId'];
  const inputs: Record<string, { type: sql.ISqlTypeFactory; value: unknown }> = {
    userId: { type: sql.Int, value: userId },
  };

  if (filters.projectId !== undefined) {
    conditions.push('t.project_id = @projectId');
    inputs['projectId'] = { type: sql.Int, value: filters.projectId };
  }
  if (filters.from !== undefined) {
    conditions.push('t.entry_date >= @fromDate');
    inputs['fromDate'] = { type: sql.Date, value: filters.from };
  }
  if (filters.to !== undefined) {
    conditions.push('t.entry_date <= @toDate');
    inputs['toDate'] = { type: sql.Date, value: filters.to };
  }

  const rows = await query<TimesheetRow>(
    `SELECT t.id, t.user_id, t.project_id, p.name AS project_name,
            t.work_type_id, wt.name AS work_type_name,
            CONVERT(varchar(10), t.entry_date, 120) AS entry_date,
            t.hours, t.description, t.created_at, t.updated_at
     FROM timesheet_entries t
     INNER JOIN projects p ON p.id = t.project_id
     LEFT JOIN ref_work_types wt ON wt.id = t.work_type_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY t.entry_date DESC, t.id DESC`,
    inputs,
  );

  return rows.map(rowToEntry);
}

export async function listAdminEntries(
  filters: { userId?: number; projectId?: number; from?: string; to?: string },
): Promise<TimesheetEntry[]> {
  const conditions: string[] = ['1=1'];
  const inputs: Record<string, { type: sql.ISqlTypeFactory; value: unknown }> = {};

  if (filters.userId !== undefined) {
    conditions.push('t.user_id = @userId');
    inputs['userId'] = { type: sql.Int, value: filters.userId };
  }
  if (filters.projectId !== undefined) {
    conditions.push('t.project_id = @projectId');
    inputs['projectId'] = { type: sql.Int, value: filters.projectId };
  }
  if (filters.from !== undefined) {
    conditions.push('t.entry_date >= @fromDate');
    inputs['fromDate'] = { type: sql.Date, value: filters.from };
  }
  if (filters.to !== undefined) {
    conditions.push('t.entry_date <= @toDate');
    inputs['toDate'] = { type: sql.Date, value: filters.to };
  }

  const rows = await query<TimesheetRow>(
    `SELECT t.id, t.user_id, t.project_id, p.name AS project_name,
            t.work_type_id, wt.name AS work_type_name,
            CONVERT(varchar(10), t.entry_date, 120) AS entry_date,
            t.hours, t.description, t.created_at, t.updated_at
     FROM timesheet_entries t
     INNER JOIN projects p ON p.id = t.project_id
     LEFT JOIN ref_work_types wt ON wt.id = t.work_type_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY t.entry_date DESC, t.id DESC`,
    inputs,
  );

  return rows.map(rowToEntry);
}

export async function upsertEntry(data: {
  userId: number;
  projectId: number;
  workTypeId?: number;
  entryDate: string;
  hours: number;
  description?: string;
}): Promise<TimesheetEntry> {
  // Try UPDATE first (UNIQUE constraint: user_id + project_id + entry_date)
  const updated = await query<TimesheetRow>(
    `UPDATE timesheet_entries
     SET hours = @hours,
         description = @description,
         work_type_id = @workTypeId,
         updated_at = GETUTCDATE()
     OUTPUT
       INSERTED.id, INSERTED.user_id, INSERTED.project_id,
       (SELECT name FROM projects WHERE id = INSERTED.project_id) AS project_name,
       INSERTED.work_type_id,
       (SELECT name FROM ref_work_types WHERE id = INSERTED.work_type_id) AS work_type_name,
       CONVERT(varchar(10), INSERTED.entry_date, 120) AS entry_date,
       INSERTED.hours, INSERTED.description, INSERTED.created_at, INSERTED.updated_at
     WHERE user_id = @userId AND project_id = @projectId AND entry_date = @entryDate`,
    {
      userId: { type: sql.Int, value: data.userId },
      projectId: { type: sql.Int, value: data.projectId },
      workTypeId: { type: sql.Int, value: data.workTypeId ?? null },
      entryDate: { type: sql.Date, value: data.entryDate },
      hours: { type: sql.Decimal(4, 2), value: data.hours },
      description: { type: sql.NVarChar(500), value: data.description ?? null },
    },
  );

  if (updated.length > 0 && updated[0]) return rowToEntry(updated[0]);

  // INSERT if no existing row
  const inserted = await query<TimesheetRow>(
    `INSERT INTO timesheet_entries (user_id, project_id, work_type_id, entry_date, hours, description)
     OUTPUT
       INSERTED.id, INSERTED.user_id, INSERTED.project_id,
       (SELECT name FROM projects WHERE id = INSERTED.project_id) AS project_name,
       INSERTED.work_type_id,
       (SELECT name FROM ref_work_types WHERE id = INSERTED.work_type_id) AS work_type_name,
       CONVERT(varchar(10), INSERTED.entry_date, 120) AS entry_date,
       INSERTED.hours, INSERTED.description, INSERTED.created_at, INSERTED.updated_at
     VALUES (@userId, @projectId, @workTypeId, @entryDate, @hours, @description)`,
    {
      userId: { type: sql.Int, value: data.userId },
      projectId: { type: sql.Int, value: data.projectId },
      workTypeId: { type: sql.Int, value: data.workTypeId ?? null },
      entryDate: { type: sql.Date, value: data.entryDate },
      hours: { type: sql.Decimal(4, 2), value: data.hours },
      description: { type: sql.NVarChar(500), value: data.description ?? null },
    },
  );

  if (!inserted[0]) throw new Error('upsertEntry: INSERT did not return a row');
  return rowToEntry(inserted[0]);
}

export async function updateEntry(
  id: number,
  userId: number,
  data: Partial<{ hours: number; description: string | null; workTypeId: number | null; entryDate: string }>,
): Promise<TimesheetEntry | null> {
  const setClauses: string[] = ['updated_at = GETUTCDATE()'];
  const inputs: Record<string, { type: sql.ISqlTypeFactory; value: unknown }> = {
    id: { type: sql.Int, value: id },
    userId: { type: sql.Int, value: userId },
  };

  if (data.hours !== undefined) {
    setClauses.push('hours = @hours');
    inputs['hours'] = { type: sql.Decimal(4, 2), value: data.hours };
  }
  if ('description' in data) {
    setClauses.push('description = @description');
    inputs['description'] = { type: sql.NVarChar(500), value: data.description };
  }
  if ('workTypeId' in data) {
    setClauses.push('work_type_id = @workTypeId');
    inputs['workTypeId'] = { type: sql.Int, value: data.workTypeId };
  }
  if (data.entryDate !== undefined) {
    setClauses.push('entry_date = @entryDate');
    inputs['entryDate'] = { type: sql.Date, value: data.entryDate };
  }

  const rows = await query<TimesheetRow>(
    `UPDATE timesheet_entries
     SET ${setClauses.join(', ')}
     OUTPUT
       INSERTED.id, INSERTED.user_id, INSERTED.project_id,
       (SELECT name FROM projects WHERE id = INSERTED.project_id) AS project_name,
       INSERTED.work_type_id,
       (SELECT name FROM ref_work_types WHERE id = INSERTED.work_type_id) AS work_type_name,
       CONVERT(varchar(10), INSERTED.entry_date, 120) AS entry_date,
       INSERTED.hours, INSERTED.description, INSERTED.created_at, INSERTED.updated_at
     WHERE id = @id AND user_id = @userId`,
    inputs,
  );

  return rows[0] ? rowToEntry(rows[0]) : null;
}

export async function deleteEntry(id: number, userId: number): Promise<boolean> {
  const rows = await query<{ id: number }>(
    `DELETE FROM timesheet_entries
     OUTPUT DELETED.id
     WHERE id = @id AND user_id = @userId`,
    {
      id: { type: sql.Int, value: id },
      userId: { type: sql.Int, value: userId },
    },
  );
  return rows.length > 0;
}

export interface WeeklySummaryRow {
  year: number;
  week: number;
  projectId: number;
  projectName: string;
  hours: number;
}

export async function getSummaryByWeek(userId: number, year: number): Promise<WeeklySummaryRow[]> {
  const rows = await query<{ yr: number; wk: number; project_id: number; project_name: string; hours: number }>(
    `SELECT YEAR(entry_date) AS yr, DATEPART(iso_week, entry_date) AS wk,
            project_id, p.name AS project_name, SUM(hours) AS hours
     FROM timesheet_entries t
     INNER JOIN projects p ON p.id = t.project_id
     WHERE user_id = @userId AND YEAR(entry_date) = @year
     GROUP BY YEAR(entry_date), DATEPART(iso_week, entry_date), project_id, p.name
     ORDER BY yr, wk, project_id`,
    { userId: { type: sql.Int, value: userId }, year: { type: sql.Int, value: year } },
  );
  return rows.map((r) => ({ year: r.yr, week: r.wk, projectId: r.project_id, projectName: r.project_name, hours: r.hours }));
}

export interface MonthlySummaryRow {
  year: number;
  month: number;
  projectId: number;
  projectName: string;
  hours: number;
}

export async function getSummaryByMonth(userId: number, year: number): Promise<MonthlySummaryRow[]> {
  const rows = await query<{ yr: number; mo: number; project_id: number; project_name: string; hours: number }>(
    `SELECT YEAR(entry_date) AS yr, MONTH(entry_date) AS mo,
            project_id, p.name AS project_name, SUM(hours) AS hours
     FROM timesheet_entries t
     INNER JOIN projects p ON p.id = t.project_id
     WHERE user_id = @userId AND YEAR(entry_date) = @year
     GROUP BY YEAR(entry_date), MONTH(entry_date), project_id, p.name
     ORDER BY yr, mo, project_id`,
    { userId: { type: sql.Int, value: userId }, year: { type: sql.Int, value: year } },
  );
  return rows.map((r) => ({ year: r.yr, month: r.mo, projectId: r.project_id, projectName: r.project_name, hours: r.hours }));
}

export interface YearlySummaryRow {
  year: number;
  projectId: number;
  projectName: string;
  hours: number;
}

export async function getSummaryByYear(userId: number): Promise<YearlySummaryRow[]> {
  const rows = await query<{ yr: number; project_id: number; project_name: string; hours: number }>(
    `SELECT YEAR(entry_date) AS yr, project_id, p.name AS project_name, SUM(hours) AS hours
     FROM timesheet_entries t
     INNER JOIN projects p ON p.id = t.project_id
     WHERE user_id = @userId
     GROUP BY YEAR(entry_date), project_id, p.name
     ORDER BY yr DESC, project_id`,
    { userId: { type: sql.Int, value: userId } },
  );
  return rows.map((r) => ({ year: r.yr, projectId: r.project_id, projectName: r.project_name, hours: r.hours }));
}
