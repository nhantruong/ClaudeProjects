import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, requireTeamLead, type AuthRequest } from '../../middleware/auth.js';
import * as svc from './leave.service.js';

const router = Router();
router.use(authenticate);

// GET /leave/types
router.get('/types', async (_req, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await svc.getLeaveTypes() }); }
  catch (err) { next(err); }
});

// GET /leave/balance?year=2026
router.get('/balance', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const year = req.query['year'] ? Number(req.query['year']) : undefined;
    const data = await svc.getLeaveBalances(req.user!.employeeId, year);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// GET /leave/balance/:employeeId (team lead+)
router.get('/balance/:employeeId', requireTeamLead, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const year = req.query['year'] ? Number(req.query['year']) : undefined;
    const data = await svc.getLeaveBalances(Number(req.params['employeeId']), year);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// GET /leave/requests — own requests
router.get('/requests', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const filters = z.object({
      status: z.string().optional(),
      year: z.coerce.number().optional(),
      page: z.coerce.number().optional(),
      pageSize: z.coerce.number().optional(),
    }).parse(req.query);
    const result = await svc.listLeaveRequests({ ...filters, employeeId: req.user!.employeeId });
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

// GET /leave/pending — team approval queue (team lead+)
router.get('/pending', requireTeamLead, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await svc.listLeaveRequests({ status: 'PENDING' });
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

// POST /leave/requests
router.post('/requests', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const input = z.object({
      leaveTypeId: z.number().int().positive(),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      reason: z.string().max(500).optional(),
    }).parse(req.body);
    const request = await svc.createLeaveRequest(req.user!.employeeId, input);
    res.status(201).json({ success: true, data: request });
  } catch (err) { next(err); }
});

// PATCH /leave/requests/:id/cancel
router.patch('/requests/:id/cancel', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await svc.cancelLeaveRequest(req.user!.employeeId, Number(req.params['id']));
    res.json({ success: true, data: { message: 'Đã hủy yêu cầu nghỉ phép' } });
  } catch (err) { next(err); }
});

// PATCH /leave/requests/:id/approve (team lead+)
router.patch('/requests/:id/approve', requireTeamLead, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const request = await svc.approveLeaveRequest(req.user!.employeeId, Number(req.params['id']));
    res.json({ success: true, data: request });
  } catch (err) { next(err); }
});

// PATCH /leave/requests/:id/reject (team lead+)
router.patch('/requests/:id/reject', requireTeamLead, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { note } = z.object({ note: z.string().min(1).max(500) }).parse(req.body);
    const request = await svc.rejectLeaveRequest(req.user!.employeeId, Number(req.params['id']), note);
    res.json({ success: true, data: request });
  } catch (err) { next(err); }
});

export default router;
