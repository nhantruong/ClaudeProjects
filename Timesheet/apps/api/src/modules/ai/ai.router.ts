import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, requireAdmin, type AuthRequest } from '../../middleware/auth.js';
import * as svc from './ai.service.js';

const router = Router();
router.use(authenticate);

// GET /ai/insights
router.get('/insights', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { insightType, targetType, limit } = z.object({
      insightType: z.string().optional(),
      targetType: z.string().optional(),
      limit: z.coerce.number().max(100).default(20),
    }).parse(req.query);

    const data = await svc.getInsights(insightType as any, targetType, limit);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// POST /ai/insights/generate
router.post('/insights/generate', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const input = z.object({
      insightType: z.enum(['OVERTIME_RISK', 'BUDGET_BURN', 'WEEKLY_DIGEST', 'ATTENDANCE_ANOMALY']),
      targetType: z.enum(['EMPLOYEE', 'PROJECT', 'TEAM', 'COMPANY']),
      targetId: z.number().int().default(0),
    }).parse(req.body);

    let insight;
    switch (input.insightType) {
      case 'OVERTIME_RISK':
        insight = await svc.generateOvertimeRiskInsight(input.targetId, input.targetType as any);
        break;
      case 'BUDGET_BURN':
        insight = await svc.generateBudgetBurnInsight(input.targetId);
        break;
      case 'WEEKLY_DIGEST':
        insight = await svc.generateWeeklyDigest();
        break;
      default:
        insight = await svc.generateWeeklyDigest();
    }

    res.status(201).json({ success: true, data: insight });
  } catch (err) { next(err); }
});

// PATCH /ai/insights/:id/read
router.patch('/insights/:id/read', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await svc.markInsightRead(Number(req.params['id']), req.user!.employeeId);
    res.json({ success: true, data: { message: 'Marked as read' } });
  } catch (err) { next(err); }
});

// POST /ai/chat (Admin assistant)
router.post('/chat', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { messages } = z.object({
      messages: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(2000),
        timestamp: z.string(),
      })).min(1).max(20),
    }).parse(req.body);

    const reply = await svc.chatWithAssistant(messages, req.user!.employeeId);
    res.json({ success: true, data: { content: reply, timestamp: new Date().toISOString() } });
  } catch (err) { next(err); }
});

export default router;
