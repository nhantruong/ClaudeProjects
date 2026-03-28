import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Brain, AlertTriangle, Info, XCircle, ChevronDown, ChevronUp, Loader2, Zap } from 'lucide-react';
import { aiApi } from '../../lib/api/analytics.api';
import type { AIInsight } from '@bim/shared-types';

const SEVERITY_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  INFO:     { icon: Info,          color: 'text-blue-400',   bg: 'border-blue-500/30 bg-blue-500/5'   },
  WARNING:  { icon: AlertTriangle, color: 'text-yellow-400', bg: 'border-yellow-500/30 bg-yellow-500/5'},
  CRITICAL: { icon: XCircle,       color: 'text-red-400',    bg: 'border-red-500/30 bg-red-500/5'     },
};

const TYPE_LABELS: Record<string, string> = {
  OVERTIME_RISK:       'Rủi ro OT',
  PRODUCTIVITY_DROP:   'Năng suất giảm',
  BUDGET_BURN:         'Ngân sách dự án',
  ATTENDANCE_ANOMALY:  'Chuyên cần bất thường',
  RECOMMENDATION:      'Khuyến nghị',
  WEEKLY_DIGEST:       'Tóm tắt tuần',
};

export function AIInsightsFeed() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: insights = [], isLoading } = useQuery({
    queryKey: ['ai', 'insights'],
    queryFn: () => aiApi.getInsights(undefined, 10),
  });

  const generateMutation = useMutation({
    mutationFn: () => aiApi.generateInsight({
      insightType: 'WEEKLY_DIGEST',
      targetType: 'COMPANY',
      targetId: 0,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai', 'insights'] }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => aiApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai', 'insights'] }),
  });

  return (
    <div className="bg-surface-card rounded-xl border border-surface-border p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-brand-400" />
          <h3 className="font-semibold text-white">AI Insights</h3>
          {insights.filter((i: AIInsight) => !i.isRead).length > 0 && (
            <span className="text-xs bg-brand-600 text-white px-2 py-0.5 rounded-full">
              {insights.filter((i: AIInsight) => !i.isRead).length} mới
            </span>
          )}
        </div>
        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 rounded-lg border border-brand-600/30 transition-colors disabled:opacity-50"
        >
          {generateMutation.isPending
            ? <Loader2 size={12} className="animate-spin" />
            : <Zap size={12} />
          }
          Tạo báo cáo AI
        </button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="animate-pulse h-16 bg-surface-hover rounded-lg" />)}
        </div>
      )}

      <div className="space-y-2">
        {insights.map((insight: AIInsight) => {
          const cfg = SEVERITY_CONFIG[insight.severity];
          const Icon = cfg.icon;
          const isOpen = expanded === insight.insightId;

          let body: Record<string, unknown> = {};
          try { body = JSON.parse(insight.body); } catch {}

          return (
            <div
              key={insight.insightId}
              className={`rounded-lg border p-3 transition-all ${cfg.bg} ${!insight.isRead ? 'ring-1 ring-brand-500/30' : ''}`}
            >
              <div
                className="flex items-start gap-3 cursor-pointer"
                onClick={() => {
                  setExpanded(isOpen ? null : insight.insightId);
                  if (!insight.isRead) markReadMutation.mutate(insight.insightId);
                }}
              >
                <Icon size={16} className={`mt-0.5 flex-shrink-0 ${cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-medium ${cfg.color}`}>
                      {TYPE_LABELS[insight.insightType] ?? insight.insightType}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(insight.generatedAt).toLocaleDateString('vi-VN')}
                    </span>
                    {!insight.isRead && (
                      <span className="text-xs bg-brand-600 text-white px-1.5 rounded">Mới</span>
                    )}
                  </div>
                  <div className="text-sm text-white font-medium mt-0.5">{insight.title}</div>

                  {/* Quick summary */}
                  {!isOpen && (body['summary'] || body['executiveSummary']) && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {(body['summary'] ?? body['executiveSummary']) as string}
                    </p>
                  )}
                </div>
                {isOpen ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />}
              </div>

              {/* Expanded content */}
              {isOpen && (
                <div className="mt-3 pt-3 border-t border-white/10 animate-slide-up">
                  {body['summary'] && (
                    <p className="text-sm text-gray-300 mb-3">{body['summary'] as string}</p>
                  )}
                  {body['executiveSummary'] && (
                    <p className="text-sm text-gray-300 mb-3">{body['executiveSummary'] as string}</p>
                  )}

                  {/* Risks */}
                  {Array.isArray(body['risks']) && body['risks'].length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-semibold text-gray-400 uppercase mb-1">Rủi ro</div>
                      <ul className="space-y-1">
                        {(body['risks'] as string[]).map((r, i) => (
                          <li key={i} className="text-xs text-gray-300 flex gap-2">
                            <span className="text-red-400">•</span>{r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {Array.isArray(body['recommendations']) && (
                    <div>
                      <div className="text-xs font-semibold text-gray-400 uppercase mb-1">Khuyến nghị</div>
                      <div className="space-y-2">
                        {(body['recommendations'] as Array<{ action: string; priority: string; rationale: string }>).map((r, i) => (
                          <div key={i} className="flex gap-2 text-xs">
                            <span className={`px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                              r.priority === 'HIGH' ? 'bg-red-500/20 text-red-300' :
                              r.priority === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300' :
                              'bg-gray-500/20 text-gray-300'
                            }`}>
                              {r.priority}
                            </span>
                            <div>
                              <div className="text-white">{r.action}</div>
                              <div className="text-gray-400">{r.rationale}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top priorities */}
                  {Array.isArray(body['topPriorities']) && (
                    <div>
                      <div className="text-xs font-semibold text-gray-400 uppercase mb-1">Ưu tiên hành động</div>
                      {(body['topPriorities'] as Array<{ priority: number; action: string; owner: string }>).map(p => (
                        <div key={p.priority} className="flex gap-2 text-xs mb-1">
                          <span className="text-brand-400 font-bold">#{p.priority}</span>
                          <div>
                            <span className="text-white">{p.action}</span>
                            <span className="text-gray-400 ml-2">({p.owner})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-2 text-xs text-gray-500">
                    Model: {insight.modelUsed} · {insight.tokensUsed?.toLocaleString()} tokens
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {insights.length === 0 && !isLoading && (
        <div className="text-center py-8 text-gray-500">
          <Brain size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Chưa có AI insights</p>
          <p className="text-xs mt-1">Nhấn "Tạo báo cáo AI" để bắt đầu</p>
        </div>
      )}
    </div>
  );
}
