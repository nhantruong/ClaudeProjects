import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth.js';
import * as svc from './worktype.service.js';

const router = Router();
router.use(authenticate);

// GET /worktypes/hierarchy — full nested structure for form dropdowns
router.get('/hierarchy', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.getFullHierarchy();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// GET /worktypes/groups
router.get('/groups', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activeOnly = req.query['active'] !== 'false';
    const data = await svc.getWorkGroups(activeOnly);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// GET /worktypes/groups/:id
router.get('/groups/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.getWorkGroupById(Number(req.params['id']));
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// GET /worktypes/types?groupId=1
router.get('/types', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const groupId = req.query['groupId'] ? Number(req.query['groupId']) : undefined;
    const activeOnly = req.query['active'] !== 'false';
    const data = await svc.getWorkTypes(groupId, activeOnly);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// GET /worktypes/actions?typeId=1
router.get('/actions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const typeId = req.query['typeId'] ? Number(req.query['typeId']) : undefined;
    const activeOnly = req.query['active'] !== 'false';
    const data = await svc.getDetailActions(typeId, activeOnly);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

export default router;
