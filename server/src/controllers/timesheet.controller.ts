/**
 * timesheet.controller.ts — Thin Express handlers for timesheet endpoints.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import * as timesheetService from '../services/timesheet.service.js';

export async function listEntries(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, from, to } = req.query as Record<string, string | undefined>;
    const filters: { projectId?: number; from?: string; to?: string } = {};
    if (projectId !== undefined) filters.projectId = parseInt(projectId, 10);
    if (from !== undefined) filters.from = from;
    if (to !== undefined) filters.to = to;

    const entries = await timesheetService.getMyEntries(req.user!.userId, filters);
    res.status(200).json({ entries });
  } catch (err) {
    next(err);
  }
}

export async function createEntry(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, workTypeId, entryDate, hours, description } = req.body as {
      projectId: number;
      workTypeId?: number;
      entryDate: string;
      hours: number;
      description?: string;
    };
    const payload: { projectId: number; entryDate: string; hours: number; workTypeId?: number; description?: string } = {
      projectId,
      entryDate,
      hours,
    };
    if (workTypeId !== undefined) payload.workTypeId = workTypeId;
    if (description !== undefined) payload.description = description;

    const entry = await timesheetService.createEntry(req.user!.userId, payload);
    res.status(201).json({ entry });
  } catch (err) {
    next(err);
  }
}

export async function updateEntry(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawId = req.params['id'];
    const entryId = parseInt(Array.isArray(rawId) ? rawId[0] ?? '' : (rawId ?? ''), 10);
    if (isNaN(entryId)) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'id must be a valid integer' } });
      return;
    }
    const { hours, description, workTypeId, entryDate } = req.body as {
      hours?: number;
      description?: string | null;
      workTypeId?: number | null;
      entryDate?: string;
    };
    const data: Parameters<typeof timesheetService.updateEntry>[2] = {};
    if (hours !== undefined) data.hours = hours;
    if ('description' in req.body) data.description = description as string | null;
    if ('workTypeId' in req.body) data.workTypeId = workTypeId as number | null;
    if (entryDate !== undefined) data.entryDate = entryDate;

    const entry = await timesheetService.updateEntry(req.user!.userId, entryId, data);
    res.status(200).json({ entry });
  } catch (err) {
    next(err);
  }
}

export async function deleteEntry(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawId = req.params['id'];
    const entryId = parseInt(Array.isArray(rawId) ? rawId[0] ?? '' : (rawId ?? ''), 10);
    if (isNaN(entryId)) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'id must be a valid integer' } });
      return;
    }
    await timesheetService.deleteEntry(req.user!.userId, entryId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getWeeklySummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const year = parseInt((req.query['year'] as string | undefined) ?? String(new Date().getFullYear()), 10);
    const summary = await timesheetService.getWeeklySummary(req.user!.userId, year);
    res.status(200).json({ summary });
  } catch (err) {
    next(err);
  }
}

export async function getMonthlySummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const year = parseInt((req.query['year'] as string | undefined) ?? String(new Date().getFullYear()), 10);
    const summary = await timesheetService.getMonthlySummary(req.user!.userId, year);
    res.status(200).json({ summary });
  } catch (err) {
    next(err);
  }
}

export async function getYearlySummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const summary = await timesheetService.getYearlySummary(req.user!.userId);
    res.status(200).json({ summary });
  } catch (err) {
    next(err);
  }
}

export async function getAdminEntries(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId, projectId, from, to } = req.query as Record<string, string | undefined>;
    const filters: { userId?: number; projectId?: number; from?: string; to?: string } = {};
    if (userId !== undefined) filters.userId = parseInt(userId, 10);
    if (projectId !== undefined) filters.projectId = parseInt(projectId, 10);
    if (from !== undefined) filters.from = from;
    if (to !== undefined) filters.to = to;

    const entries = await timesheetService.getAdminEntries(
      { role: req.user!.role, userId: req.user!.userId },
      filters,
    );
    res.status(200).json({ entries });
  } catch (err) {
    next(err);
  }
}
