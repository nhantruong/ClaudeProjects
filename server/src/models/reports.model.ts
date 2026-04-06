/**
 * reports.model.ts — SQL queries for report generation.
 *
 * Separate from timesheet.model.ts because report queries JOIN to users
 * to include displayName, which the regular timesheet queries omit.
 */
import { query, sql } from '../lib/db.js';
import type { TimesheetReportEntry } from '../lib/pdf/timesheet.pdf.js';

interface TimesheetReportRow {
  id: number;
  user_id: number;
  project_id: number;
  display_name: string;
  project_name: string;
  work_type_id: number | null;
  work_type_name: string | null;
  entry_date: string;
  hours: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export async function getTimesheetReportData(filters: {
  userId?: number;
  projectId?: number;
  from?: string;
  to?: string;
}): Promise<TimesheetReportEntry[]> {
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

  const rows = await query<TimesheetReportRow>(
    `SELECT t.id, t.user_id, t.project_id,
            u.display_name, p.name AS project_name,
            t.work_type_id, wt.name AS work_type_name,
            CONVERT(varchar(10), t.entry_date, 120) AS entry_date,
            t.hours, t.description, t.created_at, t.updated_at
     FROM timesheet_entries t
     INNER JOIN users u ON u.id = t.user_id
     INNER JOIN projects p ON p.id = t.project_id
     LEFT JOIN ref_work_types wt ON wt.id = t.work_type_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY u.display_name ASC, t.entry_date ASC`,
    inputs,
  );

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    projectId: r.project_id,
    displayName: r.display_name,
    projectName: r.project_name,
    workTypeId: r.work_type_id,
    workTypeName: r.work_type_name,
    entryDate: r.entry_date,
    hours: r.hours,
    description: r.description,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}
