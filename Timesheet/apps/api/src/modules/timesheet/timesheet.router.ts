import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, requireTeamLead, type AuthRequest } from '../../middleware/auth.js';
import * as svc from './timesheet.service.js';

const router = Router();
router.use(authenticate);

// GET /timesheet/me/today
router.get('/me/today', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    let entry;
    try {
      entry = await svc.getEntryByDate(req.user!.employeeId, today);
    } catch {
      // No entry yet — return null
      entry = null;
    }
    res.json({ success: true, data: entry });
  } catch (err) { next(err); }
});

// GET /timesheet/me?week=2026-W12 (ISO week) or ?weekStart=2026-03-23
router.get('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const weekStart = getWeekStart(req.query['weekStart'] as string | undefined);
    const summary = await svc.getWeekSummary(req.user!.employeeId, weekStart);
    res.json({ success: true, data: summary });
  } catch (err) { next(err); }
});

// POST /timesheet/clock-in
router.post('/clock-in', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const input = z.object({
      locationLat: z.number().optional(),
      locationLng: z.number().optional(),
      source: z.enum(['WEB', 'MOBILE', 'KIOSK', 'MANUAL']).optional(),
      notes: z.string().max(500).optional(),
    }).parse(req.body);
    const entry = await svc.clockIn(req.user!.employeeId, input);
    res.status(201).json({ success: true, data: entry });
  } catch (err) { next(err); }
});

// PATCH /timesheet/clock-out
router.patch('/clock-out', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const input = z.object({
      breakMinutes: z.number().int().min(0).max(240).optional(),
      notes: z.string().max(500).optional(),
    }).parse(req.body);
    const entry = await svc.clockOut(req.user!.employeeId, input);
    res.json({ success: true, data: entry });
  } catch (err) { next(err); }
});

// POST /timesheet/submit-week
router.post('/submit-week', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { weekStart } = z.object({ weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(req.body);
    const result = await svc.submitWeek(req.user!.employeeId, weekStart);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// GET /timesheet/pending (manager view)
router.get('/pending', requireTeamLead, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const entries = await svc.getPendingApprovals(
      req.user!.employeeId,
      req.user!.hierarchyLevel,
      req.user!.departmentId
    );
    res.json({ success: true, data: entries });
  } catch (err) { next(err); }
});

// PATCH /timesheet/:id/approve
router.patch('/:id/approve', requireTeamLead, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await svc.approveEntry(req.user!.employeeId, Number(req.params['id']));
    res.json({ success: true, data: { message: 'Approved' } });
  } catch (err) { next(err); }
});

// PATCH /timesheet/:id/reject
router.patch('/:id/reject', requireTeamLead, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { note } = z.object({ note: z.string().min(1).max(500) }).parse(req.body);
    await svc.rejectEntry(req.user!.employeeId, Number(req.params['id']), note);
    res.json({ success: true, data: { message: 'Rejected' } });
  } catch (err) { next(err); }
});

// ── Task Logs ─────────────────────────────────────────────────
const TaskLogCreateSchema = z.object({
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  projectId: z.number().int().positive().optional(),
  workGroupId: z.number().int().positive(),
  workTypeId: z.number().int().positive(),
  detailActionId: z.number().int().positive().optional(),
  hours: z.number().min(0.25).max(24),
  overtimeHours: z.number().min(0).max(12).optional(),
  description: z.string().max(500).optional(),
  isConfirmed: z.boolean().optional(),
});

// GET /timesheet/tasks?date=2026-03-24
router.get('/tasks', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const date = (req.query['date'] as string) ?? new Date().toISOString().slice(0, 10);
    const logs = await svc.getTaskLogs(req.user!.employeeId, date);
    res.json({ success: true, data: logs });
  } catch (err) { next(err); }
});

// POST /timesheet/tasks
router.post('/tasks', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const input = TaskLogCreateSchema.parse(req.body);
    const log = await svc.createTaskLog(req.user!.employeeId, input);
    res.status(201).json({ success: true, data: log });
  } catch (err) { next(err); }
});

// PATCH /timesheet/tasks/:id
router.patch('/tasks/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const input = TaskLogCreateSchema.partial().parse(req.body);
    const log = await svc.updateTaskLog(req.user!.employeeId, Number(req.params['id']), input);
    res.json({ success: true, data: log });
  } catch (err) { next(err); }
});

// DELETE /timesheet/tasks/:id
router.delete('/tasks/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await svc.deleteTaskLog(req.user!.employeeId, Number(req.params['id']));
    res.json({ success: true, data: { message: 'Deleted' } });
  } catch (err) { next(err); }
});

function getWeekStart(param?: string): string {
  if (param) return param;
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;  // Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

export default router;
