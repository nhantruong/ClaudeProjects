/**
 * advisor.service.test.ts — Unit tests for the Raphael AI advisor service.
 *
 * All external dependencies (advisor model, AI lib) are mocked so these
 * tests run without a database or network connection.
 *
 * Test cases:
 *
 *  getBriefing:
 *    - returns fallback briefing when AI provider throws
 *    - parses valid AI JSON response correctly
 *    - returns cached result on second call within TTL
 *    - strips markdown code fences from AI response
 *
 *  askAdvisor:
 *    - returns fallback message when AI provider throws
 *    - returns AI answer on success
 *
 *  buildFallbackBriefing:
 *    - includes overdue priority when overdueTaskCount > 0
 *    - includes blocked priority when blockedTaskCount > 0
 *    - includes due today priority when dueTodayTaskCount > 0
 *    - returns empty priorities array when no issues
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — set up before importing module under test
// ---------------------------------------------------------------------------

vi.mock('../lib/env.js', () => ({
  env: {
    SESSION_SECRET: 'test-secret-that-is-at-least-32-characters-long',
    NODE_ENV: 'test',
    AI_PROVIDER: 'anthropic',
  },
}));

vi.mock('../lib/logger.js', () => ({
  default: { info: vi.fn(), debug: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('../models/advisor.model.js', () => ({
  assembleAdvisorContext: vi.fn(),
}));

vi.mock('../lib/ai.js', () => ({
  callAi: vi.fn(),
}));

import * as advisorModel from '../models/advisor.model.js';
import * as aiLib from '../lib/ai.js';
import * as advisorService from './advisor.service.js';
import { buildFallbackBriefing } from './advisor.service.js';
import type { AdvisorContext } from '../models/advisor.model.js';

// ---------------------------------------------------------------------------
// Typed mock helpers
// ---------------------------------------------------------------------------

const mockAssembleAdvisorContext = vi.mocked(advisorModel.assembleAdvisorContext);
const mockCallAi = vi.mocked(aiLib.callAi);

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const emptyContext: AdvisorContext = {
  overdueTaskCount: 0,
  dueTodayTaskCount: 0,
  blockedTaskCount: 0,
  overdueTaskSamples: [],
  dueTodaySamples: [],
  blockedTaskSamples: [],
  criticalTasks: [],
  activeProjectSummaries: [],
  recentPpc: [],
};

const contextWithIssues: AdvisorContext = {
  overdueTaskCount: 3,
  dueTodayTaskCount: 2,
  blockedTaskCount: 1,
  overdueTaskSamples: [
    { title: 'Install conduit', projectName: 'Tower A MEP', daysOverdue: 5, assigneeName: 'Alice' },
  ],
  dueTodaySamples: [
    { title: 'Submit shop drawings', projectName: 'Tower A MEP', priority: 'high' },
  ],
  blockedTaskSamples: [
    { title: 'Route HVAC duct', projectName: 'Tower A MEP', blockerTitle: 'Ceiling clearance approval' },
  ],
  criticalTasks: [
    { title: 'Final inspection', projectName: 'Tower A MEP', dueDate: '2026-04-01' },
  ],
  activeProjectSummaries: [
    { name: 'Tower A MEP', domain: 'electromechanical', openTaskCount: 12, overdueCount: 3 },
  ],
  recentPpc: [
    { projectName: 'Tower A MEP', weekStartDate: '2026-03-23', ppc: 75 },
  ],
};

const validAiJson = JSON.stringify({
  priorities: [
    {
      rank: 1,
      level: 'critical',
      summary: '3 overdue tasks require immediate action',
      detail: 'Review and resolve overdue tasks before end of day.',
      taskTitle: 'Install conduit',
      projectName: 'Tower A MEP',
    },
  ],
  alerts: [
    { type: 'overdue', message: '3 tasks are past their due date.' },
  ],
  recommendations: [
    'Prioritise completing the conduit installation today.',
    'Escalate the HVAC duct blocker to the project manager.',
  ],
});

beforeEach(() => {
  vi.clearAllMocks();
  advisorService.clearBriefingCache();
});

// ---------------------------------------------------------------------------
// getBriefing
// ---------------------------------------------------------------------------

describe('advisorService.getBriefing', () => {
  it('returns fallback briefing when AI provider throws', async () => {
    mockAssembleAdvisorContext.mockResolvedValue(contextWithIssues);
    mockCallAi.mockRejectedValue(new Error('AI unavailable'));

    const result = await advisorService.getBriefing(1);

    expect(result.generatedAt).toBeTruthy();
    // Fallback should include the overdue priority
    expect(result.priorities.some((p) => p.level === 'critical')).toBe(true);
    expect(result.priorities[0].summary).toContain('overdue');
  });

  it('parses valid AI JSON response correctly', async () => {
    mockAssembleAdvisorContext.mockResolvedValue(contextWithIssues);
    mockCallAi.mockResolvedValue(validAiJson);

    const result = await advisorService.getBriefing(1);

    expect(result.priorities).toHaveLength(1);
    expect(result.priorities[0].rank).toBe(1);
    expect(result.priorities[0].level).toBe('critical');
    expect(result.priorities[0].summary).toBe('3 overdue tasks require immediate action');
    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0].type).toBe('overdue');
    expect(result.recommendations).toHaveLength(2);
  });

  it('returns cached result on second call within TTL', async () => {
    mockAssembleAdvisorContext.mockResolvedValue(contextWithIssues);
    mockCallAi.mockResolvedValue(validAiJson);

    const first = await advisorService.getBriefing(1);
    const second = await advisorService.getBriefing(1);

    // Same object reference means cache was used
    expect(second).toBe(first);
    // assembleAdvisorContext and callAi should only be called once
    expect(mockAssembleAdvisorContext).toHaveBeenCalledTimes(1);
    expect(mockCallAi).toHaveBeenCalledTimes(1);
  });

  it('strips markdown code fences from AI response', async () => {
    const wrappedJson = '```json\n' + validAiJson + '\n```';
    mockAssembleAdvisorContext.mockResolvedValue(contextWithIssues);
    mockCallAi.mockResolvedValue(wrappedJson);

    const result = await advisorService.getBriefing(1);

    // Should parse correctly despite the fences
    expect(result.priorities).toHaveLength(1);
    expect(result.priorities[0].summary).toBe('3 overdue tasks require immediate action');
  });

  it('falls back gracefully when AI returns invalid JSON', async () => {
    mockAssembleAdvisorContext.mockResolvedValue(contextWithIssues);
    mockCallAi.mockResolvedValue('This is not valid JSON at all');

    const result = await advisorService.getBriefing(1);

    // Should return fallback without throwing
    expect(result.generatedAt).toBeTruthy();
    expect(Array.isArray(result.priorities)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// askAdvisor
// ---------------------------------------------------------------------------

describe('advisorService.askAdvisor', () => {
  it('returns fallback message when AI provider throws', async () => {
    mockAssembleAdvisorContext.mockResolvedValue(emptyContext);
    mockCallAi.mockRejectedValue(new Error('Network error'));

    const result = await advisorService.askAdvisor(1, 'What should I focus on?');

    expect(result).toContain('unavailable');
  });

  it('returns AI answer on success', async () => {
    mockAssembleAdvisorContext.mockResolvedValue(contextWithIssues);
    mockCallAi.mockResolvedValue('Focus on resolving the overdue conduit installation first.');

    const result = await advisorService.askAdvisor(1, 'What should I focus on?');

    expect(result).toBe('Focus on resolving the overdue conduit installation first.');
    expect(mockCallAi).toHaveBeenCalledTimes(1);
    // Verify the question is included in the user message
    const callArgs = mockCallAi.mock.calls[0];
    expect(callArgs[1][0].content).toContain('What should I focus on?');
  });
});

// ---------------------------------------------------------------------------
// buildFallbackBriefing
// ---------------------------------------------------------------------------

describe('buildFallbackBriefing', () => {
  it('includes overdue priority when overdueTaskCount > 0', () => {
    const ctx: AdvisorContext = { ...emptyContext, overdueTaskCount: 5 };
    const result = buildFallbackBriefing(ctx);

    expect(result.priorities.length).toBeGreaterThan(0);
    const overduePriority = result.priorities.find((p) => p.summary.includes('overdue'));
    expect(overduePriority).toBeDefined();
    expect(overduePriority?.level).toBe('critical');
    expect(overduePriority?.summary).toContain('5');
  });

  it('includes blocked priority when blockedTaskCount > 0', () => {
    const ctx: AdvisorContext = { ...emptyContext, blockedTaskCount: 2 };
    const result = buildFallbackBriefing(ctx);

    const blockedPriority = result.priorities.find((p) => p.summary.includes('blocked'));
    expect(blockedPriority).toBeDefined();
    expect(blockedPriority?.level).toBe('high');
    expect(blockedPriority?.summary).toContain('2');
  });

  it('includes due today priority when dueTodayTaskCount > 0', () => {
    const ctx: AdvisorContext = { ...emptyContext, dueTodayTaskCount: 3 };
    const result = buildFallbackBriefing(ctx);

    const dueTodayPriority = result.priorities.find((p) => p.summary.includes('due today'));
    expect(dueTodayPriority).toBeDefined();
    expect(dueTodayPriority?.level).toBe('high');
  });

  it('returns empty priorities array when there are no issues', () => {
    const result = buildFallbackBriefing(emptyContext);

    expect(result.priorities).toHaveLength(0);
    expect(result.generatedAt).toBeTruthy();
    expect(Array.isArray(result.alerts)).toBe(true);
    expect(Array.isArray(result.recommendations)).toBe(true);
  });

  it('assigns sequential rank values', () => {
    const result = buildFallbackBriefing(contextWithIssues);

    const ranks = result.priorities.map((p) => p.rank);
    expect(ranks).toEqual(ranks.map((_, i) => i + 1));
  });
});
