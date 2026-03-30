/**
 * project.controller.ts — Thin Express handlers for project endpoints.
 *
 * Each handler: reads typed input (already validated by validate middleware
 * or parsed from URL params), delegates to the project service, and formats
 * the HTTP response.
 *
 * No business logic lives here. This layer's only job is to translate between
 * HTTP (req/res) and the service layer.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import * as projectService from '../services/project.service.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse a numeric route param — returns NaN if the value is not a valid int. */
function parseId(value: string | undefined): number {
  return parseInt(value ?? '', 10);
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/**
 * listProjects — GET /api/v1/projects
 *
 * Returns all non-cancelled projects the authenticated user is a member of.
 * Each item includes memberCount and taskCount.
 */
export async function listProjects(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projects = await projectService.listProjects(req.user!.userId);
    res.status(200).json({ projects });
  } catch (err) {
    next(err);
  }
}

/**
 * createProject — POST /api/v1/projects
 *
 * Creates a new project. The authenticated user is automatically added as
 * a manager-level member. Body validated by CreateProjectSchema upstream.
 */
export async function createProject(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { name, description, domain, status, startDate, endDate } = req.body as {
      name: string;
      description?: string;
      domain: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    };

    const project = await projectService.createProject(
      {
        name,
        description,
        domain: domain as projectService.ProjectDomain,
        status: status as projectService.ProjectStatus | undefined,
        startDate,
        endDate,
      },
      req.user!.userId,
    );

    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
}

/**
 * getProject — GET /api/v1/projects/:id
 *
 * Returns a single project with its member list. Only accessible if the
 * authenticated user is a member.
 */
export async function getProject(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = parseId(req.params['id']);
    const project = await projectService.getProject(projectId, req.user!.userId);
    res.status(200).json({ project });
  } catch (err) {
    next(err);
  }
}

/**
 * updateProject — PATCH /api/v1/projects/:id
 *
 * Applies partial updates to a project. Body validated by UpdateProjectSchema
 * upstream.
 */
export async function updateProject(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = parseId(req.params['id']);
    const { name, description, domain, status, startDate, endDate } = req.body as {
      name?: string;
      description?: string | null;
      domain?: string;
      status?: string;
      startDate?: string | null;
      endDate?: string | null;
    };

    const project = await projectService.updateProject(
      projectId,
      {
        name,
        description,
        domain: domain as projectService.ProjectDomain | undefined,
        status: status as projectService.ProjectStatus | undefined,
        startDate,
        endDate,
      },
      req.user!.userId,
    );

    res.status(200).json({ project });
  } catch (err) {
    next(err);
  }
}

/**
 * deleteProject — DELETE /api/v1/projects/:id
 *
 * Permanently deletes a project. Admin only (enforced upstream by requireAdmin).
 */
export async function deleteProject(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = parseId(req.params['id']);
    await projectService.deleteProject(projectId, req.user!.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/**
 * addMember — POST /api/v1/projects/:id/members
 *
 * Assigns a user to the project. Body validated by AddMemberSchema upstream.
 */
export async function addMember(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = parseId(req.params['id']);
    const { userId: targetUserId, role } = req.body as {
      userId: number;
      role: projectService.ProjectMemberRole;
    };

    const member = await projectService.addMember(
      projectId,
      targetUserId,
      role,
      req.user!.userId,
    );

    res.status(201).json({ member });
  } catch (err) {
    next(err);
  }
}

/**
 * removeMember — DELETE /api/v1/projects/:id/members/:userId
 *
 * Removes a user from the project. Manager/Admin only.
 */
export async function removeMember(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = parseId(req.params['id']);
    const targetUserId = parseId(req.params['userId']);

    await projectService.removeMember(projectId, targetUserId, req.user!.userId);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/**
 * listMembers — GET /api/v1/projects/:id/members
 *
 * Returns all members of a project. Authenticated members only.
 */
export async function listMembers(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = parseId(req.params['id']);
    const members = await projectService.listMembers(projectId, req.user!.userId);
    res.status(200).json({ members });
  } catch (err) {
    next(err);
  }
}
