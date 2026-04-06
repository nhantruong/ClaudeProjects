/**
 * advisor.routes.ts — Raphael AI Advisor routes.
 *
 *   GET  /api/v1/advisor/briefing — AI-generated daily briefing (FR-081, FR-082, FR-084)
 *   POST /api/v1/advisor/ask     — natural language question about project status (FR-083)
 *
 * AI calls are server-side only (ADR-003).
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as advisorController from '../controllers/advisor.controller.js';

const AskSchema = z.object({
  question: z.string().min(1, 'Question is required').max(500),
});

const router = Router();

router.get('/briefing', authenticate, advisorController.getBriefing);
router.post('/ask', authenticate, validate(AskSchema), advisorController.askAdvisor);

export default router;
