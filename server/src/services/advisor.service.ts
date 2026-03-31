/**
 * advisor.service.ts — Business logic for the Raphael AI advisor.
 *
 * Two public operations:
 *   getBriefing(userId)         — assembles project context, calls AI, returns
 *                                  structured daily briefing. Cached for 1 hour
 *                                  per user to avoid hammering the AI API on
 *                                  every dashboard load.
 *   askAdvisor(userId, question) — answers a natural language question using
 *                                  the same context assembled for the briefing.
 *
 * Graceful degradation: if the AI provider is unavailable (network error,
 * missing API key, model error), a structured fallback briefing is returned
 * instead of propagating a 500 to the client. This is logged at WARN level.
 *
 * No HTTP or Express types appear here — this layer is testable without a
 * web framework.
 */

import { assembleAdvisorContext, type AdvisorContext } from '../models/advisor.model.js';
import { callAi } from '../lib/ai.js';
import logger from '../lib/logger.js';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface PriorityItem {
  rank: number;
  level: 'critical' | 'high' | 'normal';
  summary: string;
  detail: string;
  taskTitle?: string;
  projectName?: string;
}

export interface AlertItem {
  type: 'overdue' | 'blocked' | 'due_today';
  message: string;
}

export interface BriefingResponse {
  generatedAt: string;
  priorities: PriorityItem[];
  alerts: AlertItem[];
  recommendations: string[];
}

// ---------------------------------------------------------------------------
// In-memory briefing cache (per user, 1-hour TTL)
// ---------------------------------------------------------------------------

interface CacheEntry {
  briefing: BriefingResponse;
  cachedAt: number;
}

const briefingCache = new Map<number, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Exported for test access to allow cache invalidation between test cases
export function clearBriefingCache(): void {
  briefingCache.clear();
}

// ---------------------------------------------------------------------------
// Public service functions
// ---------------------------------------------------------------------------

/**
 * getBriefing — returns the daily AI briefing for a user.
 *
 * Returns the cached version if it was generated within the last hour.
 * Falls back to a rule-based briefing if the AI provider is unavailable.
 */
export async function getBriefing(userId: number): Promise<BriefingResponse> {
  const cached = briefingCache.get(userId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    logger.debug('Returning cached briefing', { userId });
    return cached.briefing;
  }

  const context = await assembleAdvisorContext(userId);

  let briefing: BriefingResponse;
  try {
    const aiResponse = await callAi(buildSystemPrompt(), [
      { role: 'user', content: buildContextMessage(context) },
    ]);
    briefing = parseAiResponse(aiResponse, context);
  } catch (err) {
    logger.warn('AI provider unavailable — returning fallback briefing', { err });
    briefing = buildFallbackBriefing(context);
  }

  briefingCache.set(userId, { briefing, cachedAt: Date.now() });
  return briefing;
}

/**
 * askAdvisor — answers a natural language question using current project data.
 *
 * Does not use the briefing cache — each question gets fresh context.
 * Falls back to a static unavailability message if the AI provider errors.
 */
export async function askAdvisor(userId: number, question: string): Promise<string> {
  const context = await assembleAdvisorContext(userId);

  const userMessage = buildContextMessage(context) + '\n\nQuestion: ' + question;

  try {
    const answer = await callAi(buildSystemPrompt(), [{ role: 'user', content: userMessage }]);
    return answer;
  } catch (err) {
    logger.warn('AI provider unavailable for advisor ask', { err });
    return 'Raphael is currently unavailable. Please check your AI provider configuration or try again later.';
  }
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

function buildSystemPrompt(): string {
  return `You are Raphael, a decisive and insightful AI project advisor for an engineering team.
You have deep knowledge of electromechanical engineering, BIM, and software development workflows.
Your role is to analyse project data and surface the most important priorities and risks.

When giving a briefing:
- Be direct and concise. No filler phrases.
- Prioritise by urgency and impact, not alphabetically.
- Use engineering domain language when relevant.
- For each priority, give a one-line summary and a one-sentence detail explaining the action needed.
- Alerts should be factual statements, not recommendations.
- Recommendations should be actionable, specific, and achievable today.

Respond in valid JSON matching the requested format exactly.`;
}

function buildContextMessage(ctx: AdvisorContext): string {
  const overdueLines =
    ctx.overdueTaskSamples.length > 0
      ? ctx.overdueTaskSamples
          .map(
            (t) =>
              `  • "${t.title}" (${t.projectName}) — ${t.daysOverdue} day${t.daysOverdue !== 1 ? 's' : ''} overdue${t.assigneeName ? `, assigned to ${t.assigneeName}` : ''}`,
          )
          .join('\n')
      : '  (none)';

  const dueTodayLines =
    ctx.dueTodaySamples.length > 0
      ? ctx.dueTodaySamples
          .map((t) => `  • "${t.title}" (${t.projectName}) — ${t.priority} priority`)
          .join('\n')
      : '  (none)';

  const blockedLines =
    ctx.blockedTaskSamples.length > 0
      ? ctx.blockedTaskSamples
          .map((t) => `  • "${t.title}" (${t.projectName}) blocked by "${t.blockerTitle}"`)
          .join('\n')
      : '  (none)';

  const criticalLines =
    ctx.criticalTasks.length > 0
      ? ctx.criticalTasks
          .map((t) => `  • "${t.title}" (${t.projectName})${t.dueDate ? ` due ${t.dueDate}` : ''}`)
          .join('\n')
      : '  (none)';

  const projectLines =
    ctx.activeProjectSummaries.length > 0
      ? ctx.activeProjectSummaries
          .map((p) => `${p.name} [${p.domain}] — ${p.openTaskCount} open, ${p.overdueCount} overdue`)
          .join('; ')
      : 'none';

  const ppcLines =
    ctx.recentPpc.length > 0
      ? ctx.recentPpc.map((r) => `${r.projectName} w/c ${r.weekStartDate}: ${r.ppc}%`).join('; ')
      : 'no data';

  return `Current project data:

Overdue tasks: ${ctx.overdueTaskCount} total
${overdueLines}

Due today: ${ctx.dueTodayTaskCount} tasks
${dueTodayLines}

Blocked tasks: ${ctx.blockedTaskCount}
${blockedLines}

Critical priority tasks: ${ctx.criticalTasks.length}
${criticalLines}

Active projects: ${projectLines}

Recent PPC: ${ppcLines}

Provide a briefing as JSON:
{
  "priorities": [
    { "rank": 1, "level": "critical|high|normal", "summary": "...", "detail": "...", "taskTitle": "...", "projectName": "..." }
  ],
  "alerts": [
    { "type": "overdue|blocked|due_today", "message": "..." }
  ],
  "recommendations": ["...", "...", "..."]
}`;
}

// ---------------------------------------------------------------------------
// AI response parsing
// ---------------------------------------------------------------------------

function parseAiResponse(raw: string, ctx: AdvisorContext): BriefingResponse {
  try {
    // Strip markdown code fences if present (some models wrap output in ```json)
    const json = raw
      .replace(/^```json?\s*/im, '')
      .replace(/\s*```\s*$/im, '')
      .trim();

    const parsed = JSON.parse(json) as {
      priorities?: unknown[];
      alerts?: unknown[];
      recommendations?: unknown[];
    };

    return {
      generatedAt: new Date().toISOString(),
      priorities: ((parsed.priorities ?? []) as PriorityItem[]).slice(0, 5),
      alerts: (parsed.alerts ?? []) as AlertItem[],
      recommendations: (parsed.recommendations ?? []) as string[],
    };
  } catch {
    logger.warn('Failed to parse AI response JSON — using fallback briefing');
    return buildFallbackBriefing(ctx);
  }
}

// ---------------------------------------------------------------------------
// Fallback briefing (when AI is unavailable or returns unparseable output)
// ---------------------------------------------------------------------------

export function buildFallbackBriefing(ctx: AdvisorContext): BriefingResponse {
  const priorities: PriorityItem[] = [];
  let rank = 1;

  if (ctx.overdueTaskCount > 0) {
    const count = ctx.overdueTaskCount;
    priorities.push({
      rank: rank++,
      level: 'critical',
      summary: `${count} overdue task${count > 1 ? 's' : ''} need${count === 1 ? 's' : ''} attention`,
      detail: 'Review and reschedule or complete overdue tasks immediately.',
      ...(ctx.overdueTaskSamples[0]
        ? {
            taskTitle: ctx.overdueTaskSamples[0].title,
            projectName: ctx.overdueTaskSamples[0].projectName,
          }
        : {}),
    });
  }

  if (ctx.blockedTaskCount > 0) {
    const count = ctx.blockedTaskCount;
    priorities.push({
      rank: rank++,
      level: 'high',
      summary: `${count} task${count > 1 ? 's' : ''} blocked`,
      detail: 'Unblock tasks by resolving upstream dependencies.',
      ...(ctx.blockedTaskSamples[0]
        ? {
            taskTitle: ctx.blockedTaskSamples[0].title,
            projectName: ctx.blockedTaskSamples[0].projectName,
          }
        : {}),
    });
  }

  if (ctx.dueTodayTaskCount > 0) {
    const count = ctx.dueTodayTaskCount;
    priorities.push({
      rank: rank++,
      level: 'high',
      summary: `${count} task${count > 1 ? 's' : ''} due today`,
      detail: 'Focus on completing tasks due today before end of day.',
      ...(ctx.dueTodaySamples[0]
        ? {
            taskTitle: ctx.dueTodaySamples[0].title,
            projectName: ctx.dueTodaySamples[0].projectName,
          }
        : {}),
    });
  }

  if (ctx.criticalTasks.length > 0 && priorities.length < 5) {
    priorities.push({
      rank: rank++,
      level: 'critical',
      summary: `${ctx.criticalTasks.length} critical-priority task${ctx.criticalTasks.length > 1 ? 's' : ''} in progress`,
      detail: 'Review critical tasks and ensure they are unblocked and on track.',
      taskTitle: ctx.criticalTasks[0].title,
      projectName: ctx.criticalTasks[0].projectName,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    priorities,
    alerts: [],
    recommendations: [
      'Check overdue tasks and update their status or due dates.',
      'Review blocked tasks and resolve their upstream dependencies.',
      'Confirm today\'s tasks are assigned and have clear owners.',
    ],
  };
}
