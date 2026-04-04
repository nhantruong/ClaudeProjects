import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  BrainCircuit,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { advisorApi } from '@/lib/api/advisor.api';
import type { PriorityItem, AlertItem, PriorityLevel, AlertType } from '@/lib/api/advisor.api';

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

// Priority level badge
const priorityBadgeClasses: Record<PriorityLevel, string> = {
  critical:
    'bg-error-500/20 text-error-400 border border-error-500/30',
  high:
    'bg-warning-500/20 text-warning-400 border border-warning-500/30',
  normal:
    'bg-accent-teal-500/20 text-accent-teal-400 border border-accent-teal-500/30',
};

const priorityLabels: Record<PriorityLevel, string> = {
  critical: 'Critical',
  high: 'High',
  normal: 'Normal',
};

interface PriorityBadgeProps {
  level: PriorityLevel;
}

function PriorityBadge({ level }: PriorityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium shrink-0',
        priorityBadgeClasses[level]
      )}
    >
      {priorityLabels[level]}
    </span>
  );
}

// Alert chip
const alertChipClasses: Record<AlertType, string> = {
  overdue: 'bg-error-500/15 text-error-400 border border-error-500/25',
  blocked: 'bg-warning-500/15 text-warning-400 border border-warning-500/25',
  due_today: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25',
};

interface AlertChipProps {
  alert: AlertItem;
}

function AlertChip({ alert }: AlertChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
        alertChipClasses[alert.type]
      )}
    >
      <AlertTriangle size={10} aria-hidden="true" />
      {alert.message}
    </span>
  );
}

// Priority item row
interface PriorityRowProps {
  item: PriorityItem;
}

function PriorityRow({ item }: PriorityRowProps) {
  return (
    <li className="flex items-start gap-3 py-3" data-testid={`priority-item-${item.rank}`}>
      {/* Rank number */}
      <span
        className="flex items-center justify-center w-5 h-5 rounded-full bg-surface-elevated text-xs font-mono font-semibold text-text-muted shrink-0 mt-0.5"
        aria-label={`Priority ${item.rank}`}
      >
        {item.rank}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <PriorityBadge level={item.level} />
          <p className="text-sm font-medium text-text-default leading-snug">{item.summary}</p>
        </div>

        {item.detail && (
          <p className="text-xs text-text-muted mt-1 leading-relaxed">{item.detail}</p>
        )}

        {/* Task / project chips */}
        {(item.taskTitle ?? item.projectName) && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {item.taskTitle && (
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-surface-elevated border border-border text-xs text-text-muted font-mono truncate max-w-[200px]">
                {item.taskTitle}
              </span>
            )}
            {item.projectName && (
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-surface-elevated border border-border text-xs text-text-muted truncate max-w-[200px]">
                {item.projectName}
              </span>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

// Skeleton rows
function BriefingSkeleton() {
  return (
    <div className="space-y-4 py-2" aria-busy="true" aria-label="Loading briefing">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="skeleton w-5 h-5 rounded-full shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <div className="skeleton h-4 w-14 rounded" />
              <div className="skeleton h-4 w-40 rounded" />
            </div>
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-3/4 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Answer block (collapsible)
interface AnswerBlockProps {
  answer: string;
  onDismiss: () => void;
}

function AnswerBlock({ answer, onDismiss }: AnswerBlockProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="bg-surface-elevated border border-border rounded-lg mt-3 overflow-hidden"
      role="region"
      aria-label="Raphael's answer"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-medium text-accent-teal-400">Raphael's answer</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="p-1 rounded text-text-muted hover:text-text-default transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-teal-500"
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand answer' : 'Collapse answer'}
          >
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded text-text-muted hover:text-text-default transition-colors text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-teal-500"
            aria-label="Dismiss answer"
          >
            ✕
          </button>
        </div>
      </div>
      {!collapsed && (
        <p className="p-3 text-sm text-text-default leading-relaxed whitespace-pre-wrap">
          {answer}
        </p>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function RaphaelBriefingPanel() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['advisor-briefing'],
    queryFn: advisorApi.getBriefing,
    staleTime: 60 * 60 * 1000, // 1 hour — matches server cache
    retry: false,               // graceful fallback handled server-side
  });

  const askMut = useMutation({
    mutationFn: (q: string) => advisorApi.ask(q),
    onSuccess: (res) => {
      setAnswer(res.answer);
      setQuestion('');
    },
  });

  const handleAsk = () => {
    const trimmed = question.trim();
    if (!trimmed || askMut.isPending) return;
    askMut.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAsk();
    }
  };

  const hasData = Boolean(data);
  const isEmpty =
    hasData &&
    (data?.priorities ?? []).length === 0 &&
    (data?.alerts ?? []).length === 0;

  return (
    <div className="bg-surface-card border border-border rounded-lg p-5 flex flex-col gap-0">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BrainCircuit size={16} className="text-accent-teal-400" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-text-default">Raphael's Briefing</h2>

          {/* Live indicator */}
          {hasData && (
            <span className="flex items-center gap-1 ml-1" aria-label="Live data">
              <span
                className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse"
                aria-hidden="true"
              />
              <span className="text-xs text-text-muted">Live</span>
            </span>
          )}
        </div>

        {/* Last updated timestamp */}
        {data?.generatedAt && (
          <div className="flex items-center gap-1 text-xs text-text-muted">
            <Clock size={11} aria-hidden="true" />
            <span>Updated {timeSince(data.generatedAt)}</span>
          </div>
        )}
      </div>

      {/* ── Loading state ── */}
      {isLoading && <BriefingSkeleton />}

      {/* ── Error state ── */}
      {isError && !isLoading && (
        <div
          className="flex flex-col items-center gap-3 py-6 text-center"
          role="alert"
          data-testid="briefing-error"
        >
          <AlertTriangle size={28} className="text-warning-400" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-text-default">Advisor unavailable</p>
            <p className="text-xs text-text-muted mt-1">
              Raphael could not fetch a briefing right now. The AI service may be offline.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-elevated border border-border text-xs text-text-default hover:border-border-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500"
            data-testid="briefing-retry"
          >
            <RefreshCw size={12} aria-hidden="true" />
            Retry
          </button>
        </div>
      )}

      {/* ── Data: empty state ── */}
      {isEmpty && (
        <div
          className="flex flex-col items-center gap-2 py-6 text-center"
          data-testid="briefing-empty"
        >
          <CheckCircle2 size={28} className="text-success-400" aria-hidden="true" />
          <p className="text-sm font-medium text-text-default">
            No active issues — projects are on track
          </p>
        </div>
      )}

      {/* ── Data: alerts ── */}
      {!isLoading && !isError && (data?.alerts ?? []).length > 0 && (
        <div className="mb-3" data-testid="briefing-alerts">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            Alerts
          </p>
          <div className="flex flex-wrap gap-1.5">
            {data!.alerts.map((alert: AlertItem, idx: number) => (
              <AlertChip key={idx} alert={alert} />
            ))}
          </div>
        </div>
      )}

      {/* ── Data: priorities ── */}
      {!isLoading && !isError && (data?.priorities ?? []).length > 0 && (
        <div data-testid="briefing-priorities">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
            Priorities
          </p>
          <ul
            className="divide-y divide-border"
            aria-label="Priority items"
            role="list"
          >
            {data!.priorities.slice(0, 5).map((item: PriorityItem) => (
              <PriorityRow key={item.rank} item={item} />
            ))}
          </ul>
        </div>
      )}

      {/* ── Data: recommendations ── */}
      {!isLoading && !isError && (data?.recommendations ?? []).length > 0 && (
        <div className="border-t border-border pt-3 mt-1" data-testid="briefing-recommendations">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            Recommendations
          </p>
          <ol className="space-y-2" aria-label="Recommendations" role="list">
            {data!.recommendations.slice(0, 3).map((rec: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span
                  className="flex items-center justify-center w-5 h-5 rounded-full bg-accent-teal-500/20 text-accent-teal-400 text-xs font-mono font-semibold shrink-0 mt-0.5"
                  aria-hidden="true"
                >
                  {idx + 1}
                </span>
                <p className="text-sm text-text-default leading-snug">{rec}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ── Ask Raphael input ── */}
      <div className="border-t border-border pt-4 mt-4">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
          Ask Raphael
        </p>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your projects..."
            disabled={askMut.isPending}
            className="flex-1 bg-surface-primary border border-border rounded-full px-4 py-2 text-sm text-text-default placeholder:text-text-muted focus:outline-none focus:border-accent-teal-500 focus:ring-1 focus:ring-accent-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Ask Raphael a question"
            data-testid="ask-input"
          />

          <button
            type="button"
            onClick={handleAsk}
            disabled={!question.trim() || askMut.isPending}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-accent-teal-500 hover:bg-accent-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card"
            aria-label="Send question"
            data-testid="ask-send"
          >
            {askMut.isPending ? (
              <Loader2 size={15} className="text-white animate-spin" aria-hidden="true" />
            ) : (
              <Send size={15} className="text-white" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Ask error */}
        {askMut.isError && (
          <p className="text-xs text-error-400 mt-2" role="alert" data-testid="ask-error">
            Failed to get a response. Please try again.
          </p>
        )}

        {/* Answer block */}
        {answer !== null && (
          <AnswerBlock
            answer={answer}
            onDismiss={() => {
              setAnswer(null);
              askMut.reset();
            }}
          />
        )}
      </div>
    </div>
  );
}
