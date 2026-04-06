/**
 * timesheet.routes.ts — Timesheet endpoint routes.
 *
 * Route table:
 *   GET    /api/v1/timesheets                   — my entries (filters: projectId, from, to)
 *   POST   /api/v1/timesheets                   — create/upsert entry
 *   PATCH  /api/v1/timesheets/:id               — update entry
 *   DELETE /api/v1/timesheets/:id               — delete entry
 *   GET    /api/v1/timesheets/summary/weekly    — weekly summary (?year=)
 *   GET    /api/v1/timesheets/summary/monthly   — monthly summary (?year=)
 *   GET    /api/v1/timesheets/summary/yearly    — all-time yearly summary
 *   GET    /api/v1/timesheets/admin             — admin/manager view of all entries
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as timesheetController from '../controllers/timesheet.controller.js';

const CreateTimesheetSchema = z.object({
  projectId: z.number({ required_error: 'projectId is required' }).int().positive(),
  workTypeId: z.number().int().positive().optional(),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'entryDate must be YYYY-MM-DD'),
  hours: z.number().min(0.25, 'Minimum 0.25 hours').max(24, 'Maximum 24 hours'),
  description: z.string().max(500).optional(),
});

const UpdateTimesheetSchema = z
  .object({
    hours: z.number().min(0.25).max(24).optional(),
    description: z.string().max(500).nullable().optional(),
    workTypeId: z.number().int().positive().nullable().optional(),
    entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field required' });

const router = Router();

// Summary routes registered before /:id to avoid "summary" being treated as an id
router.get('/summary/weekly', authenticate, timesheetController.getWeeklySummary);
router.get('/summary/monthly', authenticate, timesheetController.getMonthlySummary);
router.get('/summary/yearly', authenticate, timesheetController.getYearlySummary);
router.get('/admin', authenticate, timesheetController.getAdminEntries);

router.get('/', authenticate, timesheetController.listEntries);
router.post('/', authenticate, validate(CreateTimesheetSchema), timesheetController.createEntry);
router.patch('/:id', authenticate, validate(UpdateTimesheetSchema), timesheetController.updateEntry);
router.delete('/:id', authenticate, timesheetController.deleteEntry);

export default router;
