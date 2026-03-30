/**
 * dashboard.service.test.ts — Unit tests for the dashboard service.
 *
 * All external dependencies (dashboard model) are mocked so these tests run
 * without a database or network connection.
 *
 * Test cases:
 *
 *  getDashboardSummary:
 *    - returns correct shape with all four top-level keys
 *    - stats: dueToday / overdue / completedThisWeek values are passed through
 *    - workload: results are ordered by taskCount descending (model contract)
 *    - ppcTrend: limited to last 8 weeks and ordered by date (model contract)
 *    - returns empty arrays and zero stats when user has no projects
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — set up before importing the module under test
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

vi.mock('../models/dashboard.model.js', () => ({
  getProjectSummaries: vi.fn(),
  getTaskStats: vi.fn(),
  getWorkload: vi.fn(),
  getPpcTrend: vi.fn(),
}));

import * as dashboardModel from '../models/dashboard.model.js';
import * as dashboardService from './dashboard.service.js';
import type { DashboardProject, WorkloadEntry, PpcTrendEntry } from './dashboard.service.js';

// ---------------------------------------------------------------------------
// Typed mock helpers
// ---------------------------------------------------------------------------

const mockGetProjectSummaries = vi.mocked(dashboardModel.getProjectSummaries);
const mockGetTaskStats = vi.mocked(dashboardModel.getTaskStats);
const mockGetWorkload = vi.mocked(dashboardModel.getWorkload);
const mockGetPpcTrend = vi.mocked(dashboardModel.getPpcTrend);

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const sampleProjects: DashboardProject[] = [
  {
    id: 1,
    name: 'MEP Design',
    domain: 'electromechanical',
    status: 'active',
    taskCount: 12,
    memberCount: 3,
  },
  {
    id: 2,
    name: 'BIM Coordination',
    domain: 'bim',
    status: 'planning',
    taskCount: 5,
    memberCount: 2,
  },
];

const sampleStats = {
  dueToday: 3,
  overdue: 7,
  completedThisWeek: 4,
};

const sampleWorkload: WorkloadEntry[] = [
  { userId: 1, displayName: 'Alice', taskCount: 8, overdueCount: 2 },
  { userId: 2, displayName: 'Bob', taskCount: 4, overdueCount: 1 },
  { userId: 3, displayName: 'Carol', taskCount: 1, overdueCount: 0 },
];

const samplePpcTrend: PpcTrendEntry[] = [
  { weekStartDate: '2026-03-02', ppc: 85.0 },
  { weekStartDate: '2026-03-09', ppc: 90.0 },
  { weekStartDate: '2026-03-16', ppc: 75.0 },
  { weekStartDate: '2026-03-23', ppc: null },
];

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getDashboardSummary
// ---------------------------------------------------------------------------

describe('dashboardService.getDashboardSummary', () => {
  it('returns an object with all four top-level keys', async () => {
    mockGetProjectSummaries.mockResolvedValue(sampleProjects);
    mockGetTaskStats.mockResolvedValue(sampleStats);
    mockGetWorkload.mockResolvedValue(sampleWorkload);
    mockGetPpcTrend.mockResolvedValue(samplePpcTrend);

    const result = await dashboardService.getDashboardSummary(5);

    expect(result).toHaveProperty('projects');
    expect(result).toHaveProperty('stats');
    expect(result).toHaveProperty('workload');
    expect(result).toHaveProperty('ppcTrend');
  });

  it('passes userId to each model function', async () => {
    mockGetProjectSummaries.mockResolvedValue([]);
    mockGetTaskStats.mockResolvedValue({ dueToday: 0, overdue: 0, completedThisWeek: 0 });
    mockGetWorkload.mockResolvedValue([]);
    mockGetPpcTrend.mockResolvedValue([]);

    await dashboardService.getDashboardSummary(42);

    expect(mockGetProjectSummaries).toHaveBeenCalledWith(42);
    expect(mockGetTaskStats).toHaveBeenCalledWith(42);
    expect(mockGetWorkload).toHaveBeenCalledWith(42);
    expect(mockGetPpcTrend).toHaveBeenCalledWith(42);
  });

  it('returns the correct stats values from the model', async () => {
    mockGetProjectSummaries.mockResolvedValue([]);
    mockGetTaskStats.mockResolvedValue({ dueToday: 3, overdue: 7, completedThisWeek: 4 });
    mockGetWorkload.mockResolvedValue([]);
    mockGetPpcTrend.mockResolvedValue([]);

    const result = await dashboardService.getDashboardSummary(5);

    expect(result.stats.dueToday).toBe(3);
    expect(result.stats.overdue).toBe(7);
    expect(result.stats.completedThisWeek).toBe(4);
  });

  it('returns workload ordered by taskCount descending (model contract)', async () => {
    // The model is responsible for ordering — service passes through as-is.
    // This test verifies the service does not re-sort or mutate the model output.
    mockGetProjectSummaries.mockResolvedValue([]);
    mockGetTaskStats.mockResolvedValue({ dueToday: 0, overdue: 0, completedThisWeek: 0 });
    mockGetWorkload.mockResolvedValue(sampleWorkload);
    mockGetPpcTrend.mockResolvedValue([]);

    const result = await dashboardService.getDashboardSummary(5);

    expect(result.workload).toEqual(sampleWorkload);
    // Verify order is preserved: Alice (8) > Bob (4) > Carol (1)
    expect(result.workload[0]!.taskCount).toBeGreaterThanOrEqual(result.workload[1]!.taskCount);
    expect(result.workload[1]!.taskCount).toBeGreaterThanOrEqual(result.workload[2]!.taskCount);
  });

  it('returns ppcTrend in the order supplied by the model (ascending by date)', async () => {
    // The model returns entries in ascending week_start_date order.
    // Service passes through without mutation.
    mockGetProjectSummaries.mockResolvedValue([]);
    mockGetTaskStats.mockResolvedValue({ dueToday: 0, overdue: 0, completedThisWeek: 0 });
    mockGetWorkload.mockResolvedValue([]);
    mockGetPpcTrend.mockResolvedValue(samplePpcTrend);

    const result = await dashboardService.getDashboardSummary(5);

    expect(result.ppcTrend).toEqual(samplePpcTrend);
    // Should be no more than 8 entries (model enforces this with TOP 8)
    expect(result.ppcTrend.length).toBeLessThanOrEqual(8);
  });

  it('returns empty arrays and zero stats when user has no projects', async () => {
    mockGetProjectSummaries.mockResolvedValue([]);
    mockGetTaskStats.mockResolvedValue({ dueToday: 0, overdue: 0, completedThisWeek: 0 });
    mockGetWorkload.mockResolvedValue([]);
    mockGetPpcTrend.mockResolvedValue([]);

    const result = await dashboardService.getDashboardSummary(99);

    expect(result.projects).toEqual([]);
    expect(result.stats).toEqual({ dueToday: 0, overdue: 0, completedThisWeek: 0 });
    expect(result.workload).toEqual([]);
    expect(result.ppcTrend).toEqual([]);
  });

  it('calls all four model functions concurrently (all called exactly once)', async () => {
    mockGetProjectSummaries.mockResolvedValue(sampleProjects);
    mockGetTaskStats.mockResolvedValue(sampleStats);
    mockGetWorkload.mockResolvedValue(sampleWorkload);
    mockGetPpcTrend.mockResolvedValue(samplePpcTrend);

    await dashboardService.getDashboardSummary(5);

    expect(mockGetProjectSummaries).toHaveBeenCalledTimes(1);
    expect(mockGetTaskStats).toHaveBeenCalledTimes(1);
    expect(mockGetWorkload).toHaveBeenCalledTimes(1);
    expect(mockGetPpcTrend).toHaveBeenCalledTimes(1);
  });
});
