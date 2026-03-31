/**
 * lean.service.test.ts — Unit tests for the Lean construction service.
 *
 * All external dependencies (lean model, project model) are mocked so these
 * tests run without a database or network connection.
 *
 * Test cases:
 *
 *  isMonday (pure function — no mocks needed):
 *    - returns true for a known Monday
 *    - returns false for non-Monday dates
 *
 *  createWwp:
 *    - rejects non-Monday dates with 422
 *    - rejects duplicate project + week with 409
 *    - succeeds and creates the WWP on a valid Monday
 *
 *  closeWwp:
 *    - rejects when any incomplete task has no variance reason (422)
 *    - calculates PPC correctly: 3/5 complete = 60.00
 *    - handles 0 tasks: PPC = 0
 *
 *  getPpcHistory:
 *    - returns only closed weeks (ppc IS NOT NULL — enforced by model query)
 *
 *  getLookahead:
 *    - rejects weeks < 1 with 422
 *    - clamps weeks > 6 to 6
 *    - returns tasks from the model
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// Mocks — set up before importing module under test
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
  isProjectMember: vi.fn(),
}));

vi.mock('../models/lean.model.js', () => ({
  listWwps: vi.fn(),
  createWwp: vi.fn(),
  getWwpById: vi.fn(),
  getWwpByProjectAndWeek: vi.fn(),
  addWwpTask: vi.fn(),
  updateWwpTask: vi.fn(),
  getWwpTasksForClose: vi.fn(),
  closeWwp: vi.fn(),
  getPpcHistory: vi.fn(),
  getLookahead: vi.fn(),
}));

import * as projectModel from '../models/project.model.js';
import * as leanModel from '../models/lean.model.js';
import * as leanService from './lean.service.js';

// ---------------------------------------------------------------------------
// Typed mock helpers
// ---------------------------------------------------------------------------

const mockIsProjectMember = vi.mocked(projectModel.isProjectMember);
const mockCreateWwp = vi.mocked(leanModel.createWwp);
const mockGetWwpById = vi.mocked(leanModel.getWwpById);
const mockGetWwpByProjectAndWeek = vi.mocked(leanModel.getWwpByProjectAndWeek);
const mockGetWwpTasksForClose = vi.mocked(leanModel.getWwpTasksForClose);
const mockCloseWwp = vi.mocked(leanModel.closeWwp);
const mockGetPpcHistory = vi.mocked(leanModel.getPpcHistory);
const mockGetLookahead = vi.mocked(leanModel.getLookahead);

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const baseWwp = {
  id: 1,
  projectId: 10,
  weekStartDate: '2026-03-30', // Monday
  ppc: null,
  createdBy: 5,
  createdAt: '2026-03-30T00:00:00.000Z',
};

const closedWwp = { ...baseWwp, ppc: 60.0 };

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// isMonday (pure function)
// ---------------------------------------------------------------------------

describe('leanService.isMonday', () => {
  it('returns true for a known Monday (2026-03-30)', () => {
    expect(leanService.isMonday('2026-03-30')).toBe(true);
  });

  it('returns false for Tuesday (2026-03-31)', () => {
    expect(leanService.isMonday('2026-03-31')).toBe(false);
  });

  it('returns false for Sunday (2026-03-29)', () => {
    expect(leanService.isMonday('2026-03-29')).toBe(false);
  });

  it('returns false for Saturday (2026-04-04)', () => {
    expect(leanService.isMonday('2026-04-04')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createWwp
// ---------------------------------------------------------------------------

describe('leanService.createWwp', () => {
  it('throws 422 when weekStartDate is not a Monday', async () => {
    mockIsProjectMember.mockResolvedValue(true);

    await expect(
      leanService.createWwp(5, 10, '2026-03-31'), // Tuesday
    ).rejects.toMatchObject({
      statusCode: 422,
      code: 'VALIDATION_ERROR',
    });

    expect(mockCreateWwp).not.toHaveBeenCalled();
  });

  it('throws 409 when a WWP already exists for that project + week', async () => {
    mockIsProjectMember.mockResolvedValue(true);
    mockGetWwpByProjectAndWeek.mockResolvedValue(baseWwp);

    await expect(
      leanService.createWwp(5, 10, '2026-03-30'), // valid Monday but duplicate
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
    });

    expect(mockCreateWwp).not.toHaveBeenCalled();
  });

  it('creates the WWP when all conditions are met', async () => {
    mockIsProjectMember.mockResolvedValue(true);
    mockGetWwpByProjectAndWeek.mockResolvedValue(null);
    mockCreateWwp.mockResolvedValue(baseWwp);

    const result = await leanService.createWwp(5, 10, '2026-03-30');

    expect(result).toEqual(baseWwp);
    expect(mockCreateWwp).toHaveBeenCalledWith(10, '2026-03-30', 5);
  });

  it('throws 403 when user is not a project member', async () => {
    mockIsProjectMember.mockResolvedValue(false);

    await expect(
      leanService.createWwp(99, 10, '2026-03-30'),
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(mockCreateWwp).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// closeWwp
// ---------------------------------------------------------------------------

describe('leanService.closeWwp', () => {
  it('throws 422 when any incomplete task has no variance reason', async () => {
    mockIsProjectMember.mockResolvedValue(true);
    mockGetWwpById.mockResolvedValue({ ...baseWwp, tasks: [] });
    mockGetWwpTasksForClose.mockResolvedValue({
      total: 5,
      completed: 3,
      incompleteWithoutReason: 1, // one task still needs a reason
    });

    await expect(
      leanService.closeWwp(5, 10, 1),
    ).rejects.toMatchObject({
      statusCode: 422,
      code: 'VALIDATION_ERROR',
    });

    expect(mockCloseWwp).not.toHaveBeenCalled();
  });

  it('calculates PPC as 60.00 when 3 of 5 tasks are complete', async () => {
    mockIsProjectMember.mockResolvedValue(true);
    mockGetWwpById.mockResolvedValue({ ...baseWwp, tasks: [] });
    mockGetWwpTasksForClose.mockResolvedValue({
      total: 5,
      completed: 3,
      incompleteWithoutReason: 0,
    });
    mockCloseWwp.mockResolvedValue(closedWwp);

    const result = await leanService.closeWwp(5, 10, 1);

    expect(result.wwp.ppc).toBe(60.0);
    // The model closeWwp should have been called with ppc = 60
    expect(mockCloseWwp).toHaveBeenCalledWith(1, 60);
  });

  it('sets PPC to 0 when there are no tasks', async () => {
    mockIsProjectMember.mockResolvedValue(true);
    mockGetWwpById.mockResolvedValue({ ...baseWwp, tasks: [] });
    mockGetWwpTasksForClose.mockResolvedValue({
      total: 0,
      completed: 0,
      incompleteWithoutReason: 0,
    });
    mockCloseWwp.mockResolvedValue({ ...baseWwp, ppc: 0 });

    const result = await leanService.closeWwp(5, 10, 1);

    expect(result.wwp.ppc).toBe(0);
    expect(mockCloseWwp).toHaveBeenCalledWith(1, 0);
  });

  it('recalculates PPC on an already-closed week (idempotent)', async () => {
    mockIsProjectMember.mockResolvedValue(true);
    // Already closed (ppc = 80), but we re-close — allowed
    mockGetWwpById.mockResolvedValue({ ...baseWwp, ppc: 80, tasks: [] });
    mockGetWwpTasksForClose.mockResolvedValue({
      total: 5,
      completed: 5,
      incompleteWithoutReason: 0,
    });
    mockCloseWwp.mockResolvedValue({ ...baseWwp, ppc: 100 });

    const result = await leanService.closeWwp(5, 10, 1);

    expect(result.wwp.ppc).toBe(100);
    expect(mockCloseWwp).toHaveBeenCalledWith(1, 100);
  });

  it('throws 404 when the WWP does not exist', async () => {
    mockIsProjectMember.mockResolvedValue(true);
    mockGetWwpById.mockResolvedValue(null);

    await expect(
      leanService.closeWwp(5, 10, 999),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });

    expect(mockCloseWwp).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getPpcHistory
// ---------------------------------------------------------------------------

describe('leanService.getPpcHistory', () => {
  it('returns only closed weeks (ppc IS NOT NULL)', async () => {
    mockIsProjectMember.mockResolvedValue(true);
    // The model query already filters for ppc IS NOT NULL — service just passes through
    mockGetPpcHistory.mockResolvedValue([
      { id: 1, weekStartDate: '2026-03-02', ppc: 80 },
      { id: 2, weekStartDate: '2026-03-09', ppc: 60 },
    ]);

    const result = await leanService.getPpcHistory(5, 10);

    expect(result).toHaveLength(2);
    expect(result.every((r) => r.ppc !== null)).toBe(true);
    expect(mockGetPpcHistory).toHaveBeenCalledWith(10);
  });

  it('throws 403 when user is not a project member', async () => {
    mockIsProjectMember.mockResolvedValue(false);

    await expect(
      leanService.getPpcHistory(99, 10),
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(mockGetPpcHistory).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getLookahead
// ---------------------------------------------------------------------------

describe('leanService.getLookahead', () => {
  it('throws 422 when weeks < 1', async () => {
    mockIsProjectMember.mockResolvedValue(true);

    await expect(
      leanService.getLookahead(5, 10, 0),
    ).rejects.toMatchObject({
      statusCode: 422,
      code: 'VALIDATION_ERROR',
    });

    expect(mockGetLookahead).not.toHaveBeenCalled();
  });

  it('clamps weeks > 6 to 6', async () => {
    mockIsProjectMember.mockResolvedValue(true);
    mockGetLookahead.mockResolvedValue([]);

    await leanService.getLookahead(5, 10, 10);

    expect(mockGetLookahead).toHaveBeenCalledWith(10, 6);
  });

  it('passes through weeks within range unchanged', async () => {
    mockIsProjectMember.mockResolvedValue(true);
    mockGetLookahead.mockResolvedValue([]);

    await leanService.getLookahead(5, 10, 4);

    expect(mockGetLookahead).toHaveBeenCalledWith(10, 4);
  });

  it('returns tasks from the model', async () => {
    mockIsProjectMember.mockResolvedValue(true);
    const tasks = [
      {
        id: 1,
        projectId: 10,
        title: 'Panel installation',
        description: null,
        assigneeId: 5,
        assigneeName: 'Alice',
        status: 'in_progress',
        priority: 'high',
        startDate: '2026-03-30',
        dueDate: '2026-04-06',
        completedAt: null,
        createdBy: 5,
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
      },
    ];
    mockGetLookahead.mockResolvedValue(tasks);

    const result = await leanService.getLookahead(5, 10, 2);

    expect(result).toEqual(tasks);
  });

  it('throws 403 when user is not a project member', async () => {
    mockIsProjectMember.mockResolvedValue(false);

    await expect(
      leanService.getLookahead(99, 10, 4),
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(mockGetLookahead).not.toHaveBeenCalled();
  });
});
