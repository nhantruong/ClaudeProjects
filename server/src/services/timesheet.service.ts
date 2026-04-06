/**
 * timesheet.service.ts — Business logic for timesheet entries.
 */

import { AppError } from '../middleware/errorHandler.js';
import * as timesheetModel from '../models/timesheet.model.js';
import type { TimesheetEntry, WeeklySummaryRow, MonthlySummaryRow, YearlySummaryRow } from '../models/timesheet.model.js';

export type { TimesheetEntry, WeeklySummaryRow, MonthlySummaryRow, YearlySummaryRow };

export async function getMyEntries(
  userId: number,
  filters: { projectId?: number; from?: string; to?: string },
): Promise<TimesheetEntry[]> {
  return timesheetModel.listEntries(userId, filters);
}

export async function createEntry(
  userId: number,
  data: { projectId: number; workTypeId?: number; entryDate: string; hours: number; description?: string },
): Promise<TimesheetEntry> {
  return timesheetModel.upsertEntry({ ...data, userId });
}

export async function updateEntry(
  userId: number,
  entryId: number,
  data: Partial<{ hours: number; description: string | null; workTypeId: number | null; entryDate: string }>,
): Promise<TimesheetEntry> {
  const entry = await timesheetModel.updateEntry(entryId, userId, data);
  if (!entry) {
    throw new AppError(404, 'NOT_FOUND', 'Timesheet entry not found or you do not own it');
  }
  return entry;
}

export async function deleteEntry(userId: number, entryId: number): Promise<void> {
  const deleted = await timesheetModel.deleteEntry(entryId, userId);
  if (!deleted) {
    throw new AppError(404, 'NOT_FOUND', 'Timesheet entry not found or you do not own it');
  }
}

export async function getWeeklySummary(userId: number, year: number): Promise<WeeklySummaryRow[]> {
  return timesheetModel.getSummaryByWeek(userId, year);
}

export async function getMonthlySummary(userId: number, year: number): Promise<MonthlySummaryRow[]> {
  return timesheetModel.getSummaryByMonth(userId, year);
}

export async function getYearlySummary(userId: number): Promise<YearlySummaryRow[]> {
  return timesheetModel.getSummaryByYear(userId);
}

export async function getAdminEntries(
  requestingUser: { role: string; userId: number },
  filters: { userId?: number; projectId?: number; from?: string; to?: string },
): Promise<TimesheetEntry[]> {
  if (requestingUser.role !== 'admin' && requestingUser.role !== 'manager') {
    // Scope to own entries only
    return timesheetModel.listEntries(requestingUser.userId, filters);
  }
  return timesheetModel.listAdminEntries(filters);
}
