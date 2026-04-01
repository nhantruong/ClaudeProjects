/**
 * advisor.controller.ts — Thin Express handlers for the Raphael AI advisor.
 *
 * Two endpoints:
 *   GET  /api/v1/advisor/briefing — daily structured briefing (cached 1h)
 *   POST /api/v1/advisor/ask     — natural language Q&A
 *
 * No business logic lives here. This layer's only job is to translate between
 * HTTP (req/res) and the advisor service layer.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import * as advisorService from '../services/advisor.service.js';

/**
 * getBriefing — GET /api/v1/advisor/briefing
 *
 * Returns a structured daily briefing for the authenticated user.
 * Cached for 1 hour per user to avoid repeated AI API calls.
 *
 * Response shape: BriefingResponse (generatedAt, priorities, alerts, recommendations)
 */
export async function getBriefing(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const briefing = await advisorService.getBriefing(req.user!.userId);
    res.status(200).json(briefing);
  } catch (err) {
    next(err);
  }
}

/**
 * askAdvisor — POST /api/v1/advisor/ask
 *
 * Accepts { question: string }, assembles current project context, and
 * returns an AI-generated answer.
 *
 * Response shape: { answer: string }
 */
export async function askAdvisor(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { question } = req.body as { question: string };
    const answer = await advisorService.askAdvisor(req.user!.userId, question);
    res.status(200).json({ answer });
  } catch (err) {
    next(err);
  }
}
