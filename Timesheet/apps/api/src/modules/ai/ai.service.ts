import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env.js';
import { getBimDb, sql } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { getOvertimeAnalysis, getBudgetBurnRates, getAttendanceData } from '../analytics/analytics.service.js';
import type { AIInsight, AIInsightGenerateRequest, AIChatMessage, InsightType } from '@bim/shared-types';

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

// ============================================================
// SYSTEM PROMPT
// ============================================================
const SYSTEM_PROMPT = `Bạn là trợ lý phân tích HR/dự án thông minh cho công ty C&BIM Technology - một công ty chuyên về BIM (Building Information Modeling) và kỹ thuật xây dựng tại Việt Nam.

Bạn có quyền truy cập dữ liệu timesheet, dự án và nhân sự. Hãy:
1. Phân tích chính xác dựa trên dữ liệu thực tế
2. Đưa ra khuyến nghị cụ thể, có thể hành động ngay
3. Ưu tiên phòng ngừa rủi ro hơn phản ứng sau sự cố
4. Trả lời bằng tiếng Việt trừ khi được yêu cầu khác
5. Luôn trả về JSON theo format yêu cầu

Khi phân tích rủi ro, phân loại theo mức: INFO / WARNING / CRITICAL`;

// ============================================================
// GENERATE OVERTIME RISK INSIGHT
// ============================================================
export async function generateOvertimeRiskInsight(targetId: number, targetType: 'EMPLOYEE' | 'TEAM' | 'COMPANY'): Promise<AIInsight> {
  const data = await getOvertimeAnalysis(6, targetType === 'TEAM' ? targetId : undefined);
  const relevantData = targetType === 'EMPLOYEE'
    ? data.filter(d => d.employeeId === targetId)
    : data.filter(d => d.riskLevel !== 'LOW');

  const prompt = `Phân tích dữ liệu làm thêm giờ (overtime) sau đây và đưa ra đánh giá rủi ro:

${JSON.stringify(relevantData, null, 2)}

Trả về JSON với cấu trúc:
{
  "severity": "INFO|WARNING|CRITICAL",
  "title": "tiêu đề ngắn gọn",
  "summary": "tóm tắt tình hình (2-3 câu)",
  "risks": ["rủi ro 1", "rủi ro 2"],
  "recommendations": [
    { "action": "hành động cụ thể", "priority": "HIGH|MEDIUM|LOW", "rationale": "lý do" }
  ]
}`;

  return callClaudeAndSave({
    prompt,
    insightType: 'OVERTIME_RISK',
    targetType,
    targetId,
  });
}

// ============================================================
// GENERATE BUDGET BURN INSIGHT
// ============================================================
export async function generateBudgetBurnInsight(projectId: number): Promise<AIInsight> {
  const allBurn = await getBudgetBurnRates([projectId]);
  const data = allBurn.find(b => b.projectId === projectId) ?? allBurn[0];

  const prompt = `Phân tích tình trạng ngân sách giờ của dự án sau:

${JSON.stringify(data, null, 2)}

Trả về JSON:
{
  "severity": "INFO|WARNING|CRITICAL",
  "title": "tiêu đề",
  "summary": "đánh giá tình trạng dự án (2-3 câu)",
  "forecast": "dự báo kết quả nếu tiếp tục xu hướng hiện tại",
  "recommendations": [
    { "action": "hành động", "priority": "HIGH|MEDIUM|LOW", "rationale": "lý do" }
  ]
}`;

  return callClaudeAndSave({
    prompt,
    insightType: 'BUDGET_BURN',
    targetType: 'PROJECT',
    targetId: projectId,
  });
}

// ============================================================
// WEEKLY ADMIN DIGEST
// ============================================================
export async function generateWeeklyDigest(): Promise<AIInsight> {
  const monday = getLastMonday();
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const [overtime, burn, attendance] = await Promise.all([
    getOvertimeAnalysis(2),
    getBudgetBurnRates(),
    getAttendanceData(monday.toISOString().slice(0, 10), friday.toISOString().slice(0, 10)),
  ]);

  const digest = {
    period: `${monday.toISOString().slice(0, 10)} đến ${friday.toISOString().slice(0, 10)}`,
    overtime: {
      criticalCount: overtime.filter(e => e.riskLevel === 'CRITICAL').length,
      highCount: overtime.filter(e => e.riskLevel === 'HIGH').length,
      topRiskEmployees: overtime.slice(0, 5).map(e => ({
        name: e.employeeName,
        dept: e.department,
        risk: e.riskLevel,
        consecutiveWeeks: e.consecutiveOvertimeWeeks,
      })),
    },
    budgetBurn: {
      overBudgetCount: burn.filter(b => b.riskLevel === 'OVER_BUDGET').length,
      atRiskCount: burn.filter(b => b.riskLevel === 'AT_RISK').length,
      topAtRisk: burn.filter(b => b.riskLevel !== 'ON_TRACK').slice(0, 3).map(b => ({
        project: b.projectCode,
        burnRate: b.burnRate,
        overrun: b.projectedOverrun,
      })),
    },
    attendance: {
      avgRate: attendance.length > 0
        ? Math.round(attendance.reduce((s, a) => s + a.attendanceRate, 0) / attendance.length)
        : 0,
    },
  };

  const prompt = `Tạo báo cáo tổng kết tuần làm việc cho Ban Giám đốc C&BIM Technology:

${JSON.stringify(digest, null, 2)}

Trả về JSON:
{
  "severity": "INFO|WARNING|CRITICAL",
  "title": "Báo cáo tổng kết tuần [tuần cụ thể]",
  "executiveSummary": "tóm tắt 3-4 câu cho ban lãnh đạo",
  "highlights": [
    { "type": "POSITIVE|CONCERN", "item": "điểm nổi bật", "detail": "chi tiết" }
  ],
  "topPriorities": [
    { "priority": 1, "action": "việc cần làm ngay", "owner": "bộ phận/người phụ trách" }
  ],
  "nextWeekFocus": "trọng tâm tuần tới"
}`;

  return callClaudeAndSave({
    prompt,
    insightType: 'WEEKLY_DIGEST',
    targetType: 'COMPANY',
    targetId: 0,
    expiryDays: 7,
  });
}

// ============================================================
// AI ASSISTANT CHAT
// ============================================================
export async function chatWithAssistant(
  messages: AIChatMessage[],
  employeeId: number
): Promise<string> {
  if (!env.AI_ENABLED) return 'AI Assistant chưa được kích hoạt. Vui lòng liên hệ Admin.';

  const anthropicMessages = messages.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  const response = await client.messages.create({
    model: env.CLAUDE_MODEL,
    max_tokens: env.AI_MAX_TOKENS,
    system: SYSTEM_PROMPT + '\n\nHãy trả lời tự nhiên như một chuyên gia tư vấn HR. Khi cần dữ liệu cụ thể mà bạn không có, hãy giải thích cách người dùng có thể tìm thấy thông tin đó trong hệ thống.',
    messages: anthropicMessages,
  });

  const textBlock = response.content.find(b => b.type === 'text');
  return textBlock?.text ?? 'Không thể tạo phản hồi.';
}

// ============================================================
// GET STORED INSIGHTS
// ============================================================
export async function getInsights(
  insightType?: InsightType,
  targetType?: string,
  limit: number = 20
): Promise<AIInsight[]> {
  const pool = getBimDb();
  const typeFilter = insightType ? `AND InsightType = @InsightType` : '';
  const targetFilter = targetType ? `AND TargetType = @TargetType` : '';

  const result = await pool.request()
    .input('InsightType', sql.NVarChar(50), insightType ?? null)
    .input('TargetType', sql.NVarChar(20), targetType ?? null)
    .input('Limit', sql.Int, limit)
    .query(`
      SELECT TOP (@Limit) *
      FROM BIMdb_Schema.AIInsights
      WHERE (ExpiresAt IS NULL OR ExpiresAt > GETUTCDATE())
        ${typeFilter} ${targetFilter}
      ORDER BY GeneratedAt DESC
    `);

  return result.recordset.map(mapInsight);
}

export async function markInsightRead(insightId: number, readById: number): Promise<void> {
  const pool = getBimDb();
  await pool.request()
    .input('ID', sql.BigInt, insightId)
    .input('ReadBy', sql.Int, readById)
    .query(`
      UPDATE BIMdb_Schema.AIInsights
      SET IsRead = 1, ReadByID = @ReadBy, ReadAt = GETUTCDATE()
      WHERE InsightID = @ID
    `);
}

// ============================================================
// INTERNAL: call Claude + persist result
// ============================================================
async function callClaudeAndSave(opts: {
  prompt: string;
  insightType: InsightType;
  targetType: 'EMPLOYEE' | 'PROJECT' | 'TEAM' | 'COMPANY';
  targetId: number;
  expiryDays?: number;
}): Promise<AIInsight> {
  if (!env.AI_ENABLED) {
    throw new Error('AI_ENABLED is false. Set ANTHROPIC_API_KEY and AI_ENABLED=true in .env');
  }

  const startTime = Date.now();
  let responseText = '';
  let tokensUsed = 0;

  try {
    const response = await client.messages.create({
      model: env.CLAUDE_MODEL,
      max_tokens: env.AI_MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: opts.prompt }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    responseText = textBlock?.text ?? '{}';
    tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

    logger.debug(`AI call: ${opts.insightType} | ${tokensUsed} tokens | ${Date.now() - startTime}ms`);
  } catch (err) {
    logger.error('Claude API error:', err);
    throw err;
  }

  // Parse JSON from response (Claude may wrap in ```json blocks)
  let parsed: Record<string, unknown>;
  try {
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/) ??
                      responseText.match(/(\{[\s\S]*\})/);
    parsed = JSON.parse(jsonMatch?.[1] ?? responseText);
  } catch {
    parsed = { severity: 'INFO', title: 'AI Insight', summary: responseText };
  }

  const severity = (parsed['severity'] as string) ?? 'INFO';
  const title = (parsed['title'] as string) ?? `${opts.insightType} Analysis`;
  const body = JSON.stringify(parsed, null, 2);

  const pool = getBimDb();
  const expiresAt = opts.expiryDays
    ? new Date(Date.now() + opts.expiryDays * 86_400_000).toISOString()
    : null;

  const result = await pool.request()
    .input('Type', sql.NVarChar(50), opts.insightType)
    .input('TargetType', sql.NVarChar(20), opts.targetType)
    .input('TargetID', sql.Int, opts.targetId)
    .input('Severity', sql.NVarChar(10), severity)
    .input('Title', sql.NVarChar(200), title.slice(0, 200))
    .input('Body', sql.NVarChar(sql.MAX), body)
    .input('Model', sql.NVarChar(50), env.CLAUDE_MODEL)
    .input('Tokens', sql.Int, tokensUsed)
    .input('ExpiresAt', sql.DateTime2, expiresAt ? new Date(expiresAt) : null)
    .query(`
      INSERT INTO BIMdb_Schema.AIInsights
        (InsightType, TargetType, TargetID, Severity, Title, Body, ModelUsed, TokensUsed, ExpiresAt)
      OUTPUT INSERTED.*
      VALUES (@Type, @TargetType, @TargetID, @Severity, @Title, @Body, @Model, @Tokens, @ExpiresAt)
    `);

  return mapInsight(result.recordset[0]);
}

function mapInsight(row: Record<string, unknown>): AIInsight {
  return {
    insightId: row['InsightID'] as number,
    insightType: row['InsightType'] as AIInsight['insightType'],
    targetType: row['TargetType'] as AIInsight['targetType'],
    targetId: row['TargetID'] as number,
    severity: row['Severity'] as AIInsight['severity'],
    title: row['Title'] as string,
    body: row['Body'] as string,
    modelUsed: row['ModelUsed'] as string | null,
    tokensUsed: row['TokensUsed'] as number | null,
    generatedAt: (row['GeneratedAt'] as Date).toISOString(),
    expiresAt: row['ExpiresAt'] ? (row['ExpiresAt'] as Date).toISOString() : null,
    isRead: Boolean(row['IsRead']),
    readAt: row['ReadAt'] ? (row['ReadAt'] as Date).toISOString() : null,
  };
}

function getLastMonday(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}
