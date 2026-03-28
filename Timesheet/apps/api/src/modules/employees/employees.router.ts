import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, requireAdmin, requireTeamLead, type AuthRequest } from '../../middleware/auth.js';
import * as svc from './employees.service.js';

const router = Router();
router.use(authenticate);

// ── Lookup data (any authenticated user) ─────────────────────
router.get('/lookup/departments', async (_req, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await svc.getDepartments() }); }
  catch (err) { next(err); }
});

router.get('/lookup/disciplines', async (_req, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await svc.getDisciplines() }); }
  catch (err) { next(err); }
});

router.get('/lookup/positions', async (_req, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await svc.getPositions() }); }
  catch (err) { next(err); }
});

// ── Self ──────────────────────────────────────────────────────
router.get('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const emp = await svc.getEmployeeById(req.user!.employeeId);
    res.json({ success: true, data: emp });
  } catch (err) { next(err); }
});

router.patch('/me/password', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8).max(128),
    }).parse(req.body);
    await svc.changePassword(req.user!.employeeId, currentPassword, newPassword);
    res.json({ success: true, data: { message: 'Đổi mật khẩu thành công' } });
  } catch (err) { next(err); }
});

// ── List (team lead+) ─────────────────────────────────────────
router.get('/', requireTeamLead, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const filters = z.object({
      departmentId: z.coerce.number().optional(),
      disciplineId: z.coerce.number().optional(),
      isActive: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
      search: z.string().max(100).optional(),
      page: z.coerce.number().int().min(1).optional(),
      pageSize: z.coerce.number().int().min(1).max(100).optional(),
    }).parse(req.query);
    const result = await svc.listEmployees(filters);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

router.get('/:id', requireTeamLead, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const emp = await svc.getEmployeeById(Number(req.params['id']));
    res.json({ success: true, data: emp });
  } catch (err) { next(err); }
});

// ── Admin CRUD ────────────────────────────────────────────────
const CreateSchema = z.object({
  employeeCode: z.string().min(2).max(20),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  shortName: z.string().max(30).optional(),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  departmentId: z.number().int().positive().optional(),
  disciplineId: z.number().int().positive().optional(),
  positionId: z.number().int().positive().optional(),
  managerId: z.number().int().positive().optional(),
  joinDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  overtimeThresholdDaily: z.number().min(4).max(16).optional(),
  password: z.string().min(8).max(128),
});

const UpdateSchema = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  shortName: z.string().max(30).optional(),
  phone: z.string().max(20).optional(),
  departmentId: z.number().int().positive().optional(),
  disciplineId: z.number().int().positive().optional(),
  positionId: z.number().int().positive().optional(),
  managerId: z.number().int().positive().optional(),
  joinDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  leaveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  overtimeThresholdDaily: z.number().min(4).max(16).optional(),
  isActive: z.boolean().optional(),
  avatarUrl: z.string().url().max(500).optional(),
});

router.post('/', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const input = CreateSchema.parse(req.body);
    const emp = await svc.createEmployeeV2(input);
    res.status(201).json({ success: true, data: emp });
  } catch (err) { next(err); }
});

router.patch('/:id', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const input = UpdateSchema.parse(req.body);
    const emp = await svc.updateEmployee(Number(req.params['id']), input);
    res.json({ success: true, data: emp });
  } catch (err) { next(err); }
});

router.post('/:id/reset-password', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { newPassword } = z.object({ newPassword: z.string().min(8).max(128) }).parse(req.body);
    await svc.adminResetPassword(Number(req.params['id']), newPassword);
    res.json({ success: true, data: { message: 'Đặt lại mật khẩu thành công' } });
  } catch (err) { next(err); }
});

export default router;
