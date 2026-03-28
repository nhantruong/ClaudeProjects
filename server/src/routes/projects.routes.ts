/**
 * projects.routes.ts — Project management route stubs.
 *
 * Endpoints (to be implemented in task #008):
 *   GET    /api/v1/projects                        — list projects for the authenticated user (FR-013)
 *   POST   /api/v1/projects                        — create a project (manager/admin, FR-020)
 *   GET    /api/v1/projects/:id                    — get a project by ID (FR-020)
 *   PATCH  /api/v1/projects/:id                    — update a project (manager/admin, FR-022)
 *   DELETE /api/v1/projects/:id                    — delete a project (admin)
 *   POST   /api/v1/projects/:id/members            — assign a user to a project (manager/admin, FR-012)
 *   DELETE /api/v1/projects/:id/members/:userId    — remove a user from a project (manager/admin)
 */

import { Router } from 'express';

const router = Router();

// TODO (task #008): implement project CRUD endpoints
// TODO (task #008): implement project member endpoints

export default router;
