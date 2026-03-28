import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, requireAdmin, requirePM, requireTeamLead, type AuthRequest } from '../../middleware/auth.js';
import * as svc from './projects.service.js';

const router = Router();
router.use(authenticate);

// ── Lookup ────────────────────────────────────────────────────
router.get('/lookup/statuses', async (_req, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await svc.getProjectStatuses() }); }
  catch (err) { next(err); }
});
router.get('/lookup/types', async (_req, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await svc.getProjectTypes() }); }
  catch (err) { next(err); }
});
router.get('/lookup/stages', async (_req, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await svc.getProjectStages() }); }
  catch (err) { next(err); }
});
router.get('/lookup/clients', async (_req, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await svc.getClients() }); }
  catch (err) { next(err); }
});

// ── List (authenticated) ──────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const filters = z.object({
      statusId: z.coerce.number().optional(),
      typeId: z.coerce.number().optional(),
      year: z.coerce.number().optional(),
      pmEmployeeId: z.coerce.number().optional(),
      isActive: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
      search: z.string().max(100).optional(),
      page: z.coerce.number().int().min(1).optional(),
      pageSize: z.coerce.number().int().min(1).max(100).optional(),
    }).parse(req.query);

    // Non-admin users see only projects they're involved in (via PM or assignments)
    if (req.user!.hierarchyLevel < 3 && !filters.pmEmployeeId) {
      filters.pmEmployeeId = req.user!.employeeId;
    }

    const result = await svc.listProjects(filters);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const project = await svc.getProjectById(Number(req.params['id']));
    res.json({ success: true, data: project });
  } catch (err) { next(err); }
});

// GET /projects/:id/hours
router.get('/:id/hours', requireTeamLead, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const weekStart = req.query['weekStart'] as string | undefined;
    const data = await svc.getProjectHoursSummary(Number(req.params['id']), weekStart);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ── PM / Admin CRUD ───────────────────────────────────────────
const ProjectSchema = z.object({
  maDuAn: z.string().min(3).max(30),
  projectCode: z.string().max(30).optional(),
  projectName: z.string().min(2).max(200),
  projectOtherName: z.string().max(200).optional(),
  clientId: z.number().int().positive().optional(),
  typeId: z.number().int().positive().optional(),
  statusId: z.number().int().positive().optional(),
  stageId: z.number().int().positive().optional(),
  locationId: z.number().int().positive().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  plannedEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
  budgetHours: z.number().min(0).optional(),
  budgetAmount: z.number().min(0).optional(),
  currencyCode: z.string().length(3).optional(),
  dienTich: z.number().min(0).optional(),
  pmEmployeeId: z.number().int().positive().optional(),
  bimSoftware: z.string().max(100).optional(),
  bimTarget: z.string().max(500).optional(),
  isInternal: z.boolean().optional(),
  projectScope: z.string().optional(),
});

const UpdateProjectSchema = ProjectSchema.partial().extend({
  actualEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  isActive: z.boolean().optional(),
  chuTriChinh: z.number().int().positive().optional(),
  chuTriKienTruc: z.number().int().positive().optional(),
  chuTriKetCau: z.number().int().positive().optional(),
  chuTriMEP: z.number().int().positive().optional(),
  bimManager: z.number().int().positive().optional(),
  problems: z.string().optional(),
  solution: z.string().optional(),
});

router.post('/', requirePM, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const input = ProjectSchema.parse(req.body);
    const project = await svc.createProject(input);
    res.status(201).json({ success: true, data: project });
  } catch (err) { next(err); }
});

router.patch('/:id', requirePM, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const input = UpdateProjectSchema.parse(req.body);
    const project = await svc.updateProject(Number(req.params['id']), input);
    res.json({ success: true, data: project });
  } catch (err) { next(err); }
});

// Soft delete — admin only
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await svc.updateProject(Number(req.params['id']), { isActive: false });
    res.json({ success: true, data: { message: 'Dự án đã được ẩn' } });
  } catch (err) { next(err); }
});

export default router;
