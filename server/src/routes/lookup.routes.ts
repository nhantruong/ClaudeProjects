/**
 * lookup.routes.ts — Read-only reference data endpoints.
 *
 * Route table:
 *   GET /api/v1/lookups/work-types — active work types joined with group info
 */

import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import * as lookupModel from '../models/lookup.model.js';

const router = Router();

/**
 * GET /api/v1/lookups/work-types
 *
 * Returns all active work types with their group name and id, ordered by
 * group sort_order then work type name. Auth required — no role restriction.
 */
router.get(
  '/work-types',
  authenticate,
  async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workTypes = await lookupModel.getWorkTypes();
      res.status(200).json({ workTypes });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
