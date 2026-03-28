import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, requirePM, type AuthRequest } from '../../middleware/auth.js';
import * as svc from './analytics.service.js';

const router = Router();
router.use(authenticate);

// GET /analytics/dashboard
router.get('/dashboard', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await svc.getDashboardSummary(
      req.user!.employeeId,
      req.user!.hierarchyLevel,
      req.user!.departmentId
    );
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// GET /analytics/overtime?weeks=4
router.get('/overtime', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { weeks, departmentId } = z.object({
      weeks: z.coerce.number().int().min(1).max(52).default(4),
      departmentId: z.coerce.number().optional(),
    }).parse(req.query);

    const data = await svc.getOvertimeAnalysis(
      weeks,
      departmentId,
      req.user!.hierarchyLevel,
      req.user!.departmentId
    );
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// GET /analytics/budget-burn
router.get('/budget-burn', requirePM, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await svc.getBudgetBurnRates();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// GET /analytics/attendance?startDate=&endDate=&departmentId=
router.get('/attendance', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, departmentId } = z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      departmentId: z.coerce.number().optional(),
    }).parse(req.query);

    // Non-admins can only see their own dept
    const deptId = req.user!.hierarchyLevel >= 4 ? departmentId : req.user!.departmentId;
    const data = await svc.getAttendanceData(startDate, endDate, deptId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// GET /analytics/productivity?startDate=&endDate=&employeeId=
router.get('/productivity', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, employeeId } = z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      employeeId: z.coerce.number().optional(),
    }).parse(req.query);

    // Can only see others' data if team lead or higher
    const targetId = (req.user!.hierarchyLevel >= 2 && employeeId)
      ? employeeId
      : req.user!.employeeId;

    const data = await svc.getProductivityBreakdown(targetId, startDate, endDate);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

export default router;
