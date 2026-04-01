/**
 * project.service.ts — Business logic for project management.
 *
 * This service is the single source of truth for project rules. Controllers
 * call it; it calls the project model. No HTTP or Express types appear here —
 * this layer must be testable and reusable without a web framework.
 *
 * Visibility invariant (FR-013): users may only access projects they are
 * members of. Every read/write operation that accepts a projectId checks
 * membership before proceeding.
 */

import { AppError } from '../middleware/errorHandler.js';
import * as projectModel from '../models/project.model.js';
import type {
  Project,
  ProjectSummary,
  ProjectMember,
  ProjectMemberDetail,
  ProjectDomain,
  ProjectStatus,
  ProjectMemberRole,
} from '../models/project.model.js';

// Re-export types so controllers and routes do not need to import from the model
export type {
  Project,
  ProjectSummary,
  ProjectMember,
  ProjectMemberDetail,
  ProjectDomain,
  ProjectStatus,
  ProjectMemberRole,
};

// ---------------------------------------------------------------------------
// Service types
// ---------------------------------------------------------------------------

export interface ProjectWithMembers extends Project {
  members: ProjectMemberDetail[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * assertExists — throws 404 if the project is not found.
 */
async function assertExists(projectId: number): Promise<Project> {
  const project = await projectModel.getProjectById(projectId);
  if (!project) {
    throw new AppError(404, 'NOT_FOUND', 'Project not found');
  }
  return project;
}

/**
 * assertMember — throws 403 if the requesting user is not a project member.
 */
async function assertMember(projectId: number, userId: number): Promise<void> {
  const isMember = await projectModel.isProjectMember(projectId, userId);
  if (!isMember) {
    throw new AppError(403, 'UNAUTHORIZED', 'You do not have access to this project');
  }
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * listProjects — returns all non-cancelled projects the user belongs to.
 * Each item includes member count and task count (FR-013).
 */
export async function listProjects(userId: number): Promise<ProjectSummary[]> {
  return projectModel.listProjectsForUser(userId);
}

/**
 * getProject — returns a project with its member list.
 *
 * @throws AppError 404 if the project does not exist.
 * @throws AppError 403 if the requesting user is not a member.
 */
export async function getProject(
  projectId: number,
  requestingUserId: number,
): Promise<ProjectWithMembers> {
  const project = await assertExists(projectId);
  await assertMember(projectId, requestingUserId);

  const members = await projectModel.listMembers(projectId);

  return { ...project, members };
}

/**
 * createProject — creates a new project and automatically adds the creator
 * as a manager-level member.
 *
 * @throws AppError 400 if the domain or status value is invalid (Zod handles
 *   this before the service is called, but included for completeness).
 */
export async function createProject(
  data: {
    name: string;
    description?: string;
    domain: ProjectDomain;
    status?: ProjectStatus;
    startDate?: string;
    endDate?: string;
  },
  createdBy: number,
): Promise<Project> {
  const project = await projectModel.createProject({
    name: data.name,
    ...(data.description !== undefined ? { description: data.description } : {}),
    domain: data.domain,
    status: data.status ?? 'planning',
    ...(data.startDate !== undefined ? { startDate: data.startDate } : {}),
    ...(data.endDate !== undefined ? { endDate: data.endDate } : {}),
    createdBy,
  });

  // Creator is automatically added as a manager (task spec + FR-012)
  await projectModel.addMember(project.id, createdBy, 'manager');

  return project;
}

/**
 * updateProject — applies partial updates to a project.
 *
 * @throws AppError 404 if the project does not exist.
 * @throws AppError 403 if the requesting user is not a member.
 */
export async function updateProject(
  projectId: number,
  data: Partial<{
    name: string;
    description: string | null;
    domain: ProjectDomain;
    status: ProjectStatus;
    startDate: string | null;
    endDate: string | null;
  }>,
  requestingUserId: number,
): Promise<Project> {
  await assertExists(projectId);
  await assertMember(projectId, requestingUserId);

  return projectModel.updateProject(projectId, data);
}

/**
 * deleteProject — permanently deletes a project.
 *
 * @throws AppError 404 if the project does not exist.
 * @throws AppError 403 if the requesting user is not a member.
 */
export async function deleteProject(
  projectId: number,
  requestingUserId: number,
): Promise<void> {
  await assertExists(projectId);
  await assertMember(projectId, requestingUserId);

  await projectModel.deleteProject(projectId);
}

/**
 * addMember — assigns a user to a project with a given role.
 *
 * @throws AppError 404 if the project does not exist.
 * @throws AppError 403 if the requesting user is not a member.
 * @throws AppError 409 if the target user is already a member.
 */
export async function addMember(
  projectId: number,
  targetUserId: number,
  role: ProjectMemberRole,
  requestingUserId: number,
): Promise<ProjectMember> {
  await assertExists(projectId);
  await assertMember(projectId, requestingUserId);

  const alreadyMember = await projectModel.isProjectMember(projectId, targetUserId);
  if (alreadyMember) {
    throw new AppError(409, 'CONFLICT', 'User is already a member of this project');
  }

  return projectModel.addMember(projectId, targetUserId, role);
}

/**
 * removeMember — removes a user from a project.
 *
 * @throws AppError 404 if the project does not exist.
 * @throws AppError 403 if the requesting user is not a member.
 */
export async function removeMember(
  projectId: number,
  targetUserId: number,
  requestingUserId: number,
): Promise<void> {
  await assertExists(projectId);
  await assertMember(projectId, requestingUserId);

  await projectModel.removeMember(projectId, targetUserId);
}

/**
 * listMembers — returns all members of a project.
 *
 * @throws AppError 404 if the project does not exist.
 * @throws AppError 403 if the requesting user is not a member.
 */
export async function listMembers(
  projectId: number,
  requestingUserId: number,
): Promise<ProjectMemberDetail[]> {
  await assertExists(projectId);
  await assertMember(projectId, requestingUserId);

  return projectModel.listMembers(projectId);
}
