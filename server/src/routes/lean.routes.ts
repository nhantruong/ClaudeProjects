/**
 * lean.routes.ts — Last Planner System / Lean construction route stubs.
 *
 * Endpoints (to be implemented in task #016):
 *   GET   /api/v1/projects/:projectId/wwp             — get the weekly work plan (FR-060)
 *   POST  /api/v1/projects/:projectId/wwp             — create a weekly work plan (FR-060)
 *   PATCH /api/v1/projects/:projectId/wwp/:weekId     — update WWP completion + variance (FR-061, FR-063)
 *   GET   /api/v1/projects/:projectId/ppc             — get PPC history (FR-062, FR-064)
 *   GET   /api/v1/projects/:projectId/lookahead       — get 3–6 week lookahead plan (FR-065)
 */

import { Router } from 'express';

const router = Router({ mergeParams: true });

// TODO (task #016): implement WWP endpoints
// TODO (task #016): implement PPC endpoint
// TODO (task #016): implement lookahead endpoint

export default router;
