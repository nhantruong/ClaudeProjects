/**
 * project.service.test.ts — Unit tests for the project service business logic.
 *
 * All external dependencies (project model) are mocked so these tests run
 * without a database or network connection.
 *
 * Test cases cover:
 *
 *  listProjects:
 *    - returns projects from the model for the given user
 *
 *  getProject:
 *    - success: returns project with members
 *    - 404 when project does not exist
 *    - 403 when user is not a member
 *
 *  createProject:
 *    - success: creates project and auto-adds creator as manager member
 *    - defaults status to 'planning' when not provided
 *
 *  updateProject:
 *    - success: calls model.updateProject with provided data
 *    - 404 when project does not exist
 *    - 403 when user is not a member
 *
 *  deleteProject:
 *    - success: calls model.deleteProject
 *    - 404 when project does not exist
 *    - 403 when user is not a member
 *
 *  addMember:
 *    - success: returns the new ProjectMember
 *    - 404 when project does not exist
 *    - 403 when requesting user is not a member
 *    - 409 when target user is already a member
 *
 *  removeMember:
 *    - success: calls model.removeMember
 *    - 404 when project does not exist
 *
 *  listMembers:
 *    - success: returns member list
 *    - 403 when user is not a member
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// Mocks — must be set up before importing the module under test
// ---------------------------------------------------------------------------

vi.mock('../lib/env.js', () => ({
  env: {
    SESSION_SECRET: 'test-secret-that-is-at-least-32-characters-long',
    NODE_ENV: 'test',
  },
}));

vi.mock('../lib/logger.js', () => ({
  default: { info: vi.fn(), debug: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('../models/project.model.js', () => ({
  listProjectsForUser: vi.fn(),
  getProjectById: vi.fn(),
  isProjectMember: vi.fn(),
  getProjectMemberRole: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  addMember: vi.fn(),
  removeMember: vi.fn(),
  listMembers: vi.fn(),
}));

import * as projectModel from '../models/project.model.js';
import * as projectService from './project.service.js';

// ---------------------------------------------------------------------------
// Typed mock helpers
// ---------------------------------------------------------------------------

const mockListProjectsForUser = vi.mocked(projectModel.listProjectsForUser);
const mockGetProjectById = vi.mocked(projectModel.getProjectById);
const mockIsProjectMember = vi.mocked(projectModel.isProjectMember);
const mockCreateProject = vi.mocked(projectModel.createProject);
const mockUpdateProject = vi.mocked(projectModel.updateProject);
const mockDeleteProject = vi.mocked(projectModel.deleteProject);
const mockAddMember = vi.mocked(projectModel.addMember);
const mockRemoveMember = vi.mocked(projectModel.removeMember);
const mockListMembers = vi.mocked(projectModel.listMembers);

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const baseProject = {
  id: 1,
  name: 'Test Project',
  description: 'A test project',
  domain: 'software' as const,
  status: 'active' as const,
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  createdBy: 10,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const projectSummary = {
  ...baseProject,
  memberCount: 3,
  taskCount: 7,
};

const memberAlice = {
  userId: 10,
  displayName: 'Alice Smith',
  username: 'alice',
  role: 'manager' as const,
  joinedAt: '2026-01-01T00:00:00.000Z',
};

const newMemberRow = {
  id: 5,
  projectId: 1,
  userId: 20,
  role: 'member' as const,
  joinedAt: '2026-03-01T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// listProjects
// ---------------------------------------------------------------------------

describe('projectService.listProjects', () => {
  it("returns the user's projects from the model", async () => {
    mockListProjectsForUser.mockResolvedValue([projectSummary]);

    const result = await projectService.listProjects(10);

    expect(result).toEqual([projectSummary]);
    expect(mockListProjectsForUser).toHaveBeenCalledWith(10);
  });

  it('returns an empty array when the user has no projects', async () => {
    mockListProjectsForUser.mockResolvedValue([]);

    const result = await projectService.listProjects(10);

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getProject
// ---------------------------------------------------------------------------

describe('projectService.getProject', () => {
  it('returns project with members when user is a member', async () => {
    mockGetProjectById.mockResolvedValue(baseProject);
    mockIsProjectMember.mockResolvedValue(true);
    mockListMembers.mockResolvedValue([memberAlice]);

    const result = await projectService.getProject(1, 10);

    expect(result).toMatchObject({ id: 1, name: 'Test Project' });
    expect(result.members).toEqual([memberAlice]);
  });

  it('throws 404 when the project does not exist', async () => {
    mockGetProjectById.mockResolvedValue(null);

    await expect(projectService.getProject(999, 10)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    expect(mockIsProjectMember).not.toHaveBeenCalled();
  });

  it('throws 403 when the user is not a project member', async () => {
    mockGetProjectById.mockResolvedValue(baseProject);
    mockIsProjectMember.mockResolvedValue(false);

    await expect(projectService.getProject(1, 99)).rejects.toMatchObject({
      statusCode: 403,
      code: 'UNAUTHORIZED',
    });

    expect(mockListMembers).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// createProject
// ---------------------------------------------------------------------------

describe('projectService.createProject', () => {
  it('creates a project and auto-adds the creator as a manager', async () => {
    mockCreateProject.mockResolvedValue(baseProject);
    mockAddMember.mockResolvedValue(newMemberRow);

    const result = await projectService.createProject(
      {
        name: 'Test Project',
        domain: 'software',
        status: 'active',
      },
      10,
    );

    expect(result).toEqual(baseProject);
    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Test Project', domain: 'software', createdBy: 10 }),
    );
    // Creator must be added as manager
    expect(mockAddMember).toHaveBeenCalledWith(baseProject.id, 10, 'manager');
  });

  it("defaults status to 'planning' when not provided", async () => {
    mockCreateProject.mockResolvedValue({ ...baseProject, status: 'planning' });
    mockAddMember.mockResolvedValue(newMemberRow);

    await projectService.createProject({ name: 'New Project', domain: 'bim' }, 10);

    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'planning' }),
    );
  });

  it('throws an AppError instance if model.createProject rejects', async () => {
    mockCreateProject.mockRejectedValue(new AppError(500, 'INTERNAL_ERROR', 'DB error'));

    await expect(
      projectService.createProject({ name: 'X', domain: 'other' }, 1),
    ).rejects.toBeInstanceOf(AppError);
  });
});

// ---------------------------------------------------------------------------
// updateProject
// ---------------------------------------------------------------------------

describe('projectService.updateProject', () => {
  it('updates a project when user is a member', async () => {
    mockGetProjectById.mockResolvedValue(baseProject);
    mockIsProjectMember.mockResolvedValue(true);
    mockUpdateProject.mockResolvedValue({ ...baseProject, name: 'Updated Name' });

    const result = await projectService.updateProject(1, { name: 'Updated Name' }, 10);

    expect(result.name).toBe('Updated Name');
    expect(mockUpdateProject).toHaveBeenCalledWith(1, { name: 'Updated Name' });
  });

  it('throws 404 when the project does not exist', async () => {
    mockGetProjectById.mockResolvedValue(null);

    await expect(projectService.updateProject(999, { name: 'X' }, 10)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('throws 403 when the user is not a member', async () => {
    mockGetProjectById.mockResolvedValue(baseProject);
    mockIsProjectMember.mockResolvedValue(false);

    await expect(projectService.updateProject(1, { name: 'X' }, 99)).rejects.toMatchObject({
      statusCode: 403,
      code: 'UNAUTHORIZED',
    });

    expect(mockUpdateProject).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// deleteProject
// ---------------------------------------------------------------------------

describe('projectService.deleteProject', () => {
  it('deletes a project when user is a member', async () => {
    mockGetProjectById.mockResolvedValue(baseProject);
    mockIsProjectMember.mockResolvedValue(true);
    mockDeleteProject.mockResolvedValue(undefined);

    await projectService.deleteProject(1, 10);

    expect(mockDeleteProject).toHaveBeenCalledWith(1);
  });

  it('throws 404 when the project does not exist', async () => {
    mockGetProjectById.mockResolvedValue(null);

    await expect(projectService.deleteProject(999, 10)).rejects.toMatchObject({
      statusCode: 404,
    });

    expect(mockDeleteProject).not.toHaveBeenCalled();
  });

  it('throws 403 when the user is not a member', async () => {
    mockGetProjectById.mockResolvedValue(baseProject);
    mockIsProjectMember.mockResolvedValue(false);

    await expect(projectService.deleteProject(1, 99)).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});

// ---------------------------------------------------------------------------
// addMember
// ---------------------------------------------------------------------------

describe('projectService.addMember', () => {
  it('adds a member successfully when no conflict', async () => {
    mockGetProjectById.mockResolvedValue(baseProject);
    // requestingUserId=10 is a member; targetUserId=20 is not yet
    mockIsProjectMember
      .mockResolvedValueOnce(true) // assertMember check for requesting user
      .mockResolvedValueOnce(false); // already-member check for target user
    mockAddMember.mockResolvedValue(newMemberRow);

    const result = await projectService.addMember(1, 20, 'member', 10);

    expect(result).toEqual(newMemberRow);
    expect(mockAddMember).toHaveBeenCalledWith(1, 20, 'member');
  });

  it('throws 404 when the project does not exist', async () => {
    mockGetProjectById.mockResolvedValue(null);

    await expect(projectService.addMember(999, 20, 'member', 10)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('throws 403 when the requesting user is not a member', async () => {
    mockGetProjectById.mockResolvedValue(baseProject);
    mockIsProjectMember.mockResolvedValue(false);

    await expect(projectService.addMember(1, 20, 'member', 99)).rejects.toMatchObject({
      statusCode: 403,
      code: 'UNAUTHORIZED',
    });

    expect(mockAddMember).not.toHaveBeenCalled();
  });

  it('throws 409 when the target user is already a member', async () => {
    mockGetProjectById.mockResolvedValue(baseProject);
    // Both the requesting user membership check AND the target user check return true
    mockIsProjectMember.mockResolvedValue(true);

    await expect(projectService.addMember(1, 10, 'member', 10)).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
    });

    expect(mockAddMember).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// removeMember
// ---------------------------------------------------------------------------

describe('projectService.removeMember', () => {
  it('removes a member successfully', async () => {
    mockGetProjectById.mockResolvedValue(baseProject);
    mockIsProjectMember.mockResolvedValue(true);
    mockRemoveMember.mockResolvedValue(undefined);

    await projectService.removeMember(1, 20, 10);

    expect(mockRemoveMember).toHaveBeenCalledWith(1, 20);
  });

  it('throws 404 when the project does not exist', async () => {
    mockGetProjectById.mockResolvedValue(null);

    await expect(projectService.removeMember(999, 20, 10)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

// ---------------------------------------------------------------------------
// listMembers
// ---------------------------------------------------------------------------

describe('projectService.listMembers', () => {
  it('returns members when the requesting user is a member', async () => {
    mockGetProjectById.mockResolvedValue(baseProject);
    mockIsProjectMember.mockResolvedValue(true);
    mockListMembers.mockResolvedValue([memberAlice]);

    const result = await projectService.listMembers(1, 10);

    expect(result).toEqual([memberAlice]);
  });

  it('throws 403 when the user is not a member', async () => {
    mockGetProjectById.mockResolvedValue(baseProject);
    mockIsProjectMember.mockResolvedValue(false);

    await expect(projectService.listMembers(1, 99)).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});
