/**
 * advisor.routes.ts — Raphael AI Advisor route stubs.
 *
 * Endpoints (to be implemented in task #018):
 *   GET  /api/v1/advisor/briefing — AI-generated daily briefing:
 *                                   top priorities, conflicts, recommendations (FR-081, FR-082, FR-084)
 *   POST /api/v1/advisor/ask      — natural language question about project status (FR-083)
 *
 * AI calls are server-side only (ADR-003).
 * AI_PROVIDER env var controls whether Anthropic or Ollama is used.
 */

import { Router } from 'express';

const router = Router();

// TODO (task #018): implement GET /advisor/briefing
// TODO (task #018): implement POST /advisor/ask

export default router;
