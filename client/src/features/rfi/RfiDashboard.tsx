import React from 'react';
import { FileText, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { rfiApi, type RfiRow } from '@/lib/api/rfi.api';
import { STATUS_BADGE, PRIORITY_DOT, DISCIPLINE_COLORS, slaLabel } from './rfi.utils';
import { cn } from '@/lib/utils';
import type { RfiDiscipline, RfiPriority } from '@/lib/api/rfi.api';

interface Props {
  projectId: number;
  onGoToRfi: (id: number) => void;
}

export function RfiDashboard({ projectId, onGoToRfi }: Props) {
  const statsQ = useQuery({
    queryKey: ['rfi-stats', projectId],
    queryFn: () => rfiApi.stats(projectId),
    staleTime: 30_000,
  });
  const listQ = useQuery({
    queryKey: ['rfis', projectId, 'all'],
    queryFn: () => rfiApi.list(projectId),
    staleTime: 30_000,
  });

  const stats = statsQ.data?.stats;
  const rfis  = listQ.data?.rfis ?? [];

  const slaPct = stats && stats.slaTotal > 0
    ? Math.round((stats.slaCompliant / stats.slaTotal) * 100)
    : null;

  const disciplineCounts: Record<string, number> = {};
  rfis.forEach(r => {
    disciplineCounts[r.discipline] = (disciplineCounts[r.discipline] ?? 0) + 1;
  });

  const flagged = rfis
    .filter(r => {
      if (r.status === 'Closed' || r.status === 'Responded') return false;
      const days = r.requiredDate
        ? Math.ceil((new Date(r.requiredDate).getTime() - Date.now()) / 86_400_000)
        : null;
      return days !== null && days < 3 || r.priority === 'Urgent' || r.priority === 'High';
    })
    .sort((a, b) => {
      const da = a.requiredDate ? new Date(a.requiredDate).getTime() : Infinity;
      const db = b.requiredDate ? new Date(b.requiredDate).getTime() : Infinity;
      return da - db;
    })
    .slice(0, 10);

  if (statsQ.isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-surface-card border border-border rounded-lg p-4 animate-pulse h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* KPI row */}
      <div className="grid grid-cols-5 gap-3">
        <StatCard
          label="Total RFIs"
          value={stats?.total ?? 0}
          sub="All disciplines"
          icon={<FileText size={16} />}
          color="text-accent-teal-400"
        />
        <StatCard
          label="Open / Review"
          value={(stats?.open ?? 0) + (stats?.underReview ?? 0)}
          sub="Awaiting response"
          icon={<Clock size={16} />}
          color="text-warning-400"
        />
        <StatCard
          label="Overdue"
          value={stats?.overdue ?? 0}
          sub="Past SLA date"
          icon={<AlertTriangle size={16} />}
          color="text-error-400"
        />
        <StatCard
          label="SLA Compliance"
          value={slaPct !== null ? `${slaPct}%` : '—'}
          sub="Responded on time"
          icon={<CheckCircle size={16} />}
          color="text-success-400"
        />
        <StatCard
          label="Avg Response"
          value={stats?.avgResponseDays != null ? `${Math.round(stats.avgResponseDays)}d` : '—'}
          sub="Days to respond"
          icon={<TrendingUp size={16} />}
          color="text-text-muted"
        />
      </div>

      {/* Discipline breakdown + SLA bars */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <h3 className="text-label font-semibold text-text-muted uppercase tracking-wider mb-4">By Discipline</h3>
          <div className="space-y-2">
            {Object.entries(disciplineCounts).sort((a, b) => b[1] - a[1]).map(([disc, count]) => {
              const dc = DISCIPLINE_COLORS[disc as RfiDiscipline] ?? DISCIPLINE_COLORS['General']!;
              const pct = stats?.total ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={disc} className="flex items-center gap-2 text-body-small">
                  <span className={cn('w-2 h-2 rounded-full flex-shrink-0', dc.bg.replace('/20',''), dc.text.replace('text-','bg-'))} />
                  <span className="flex-1 text-text-default truncate">{disc}</span>
                  <span className="text-text-muted font-mono">{count}</span>
                  <div className="w-16 bg-surface-elevated rounded-full h-1.5 overflow-hidden">
                    <div className={cn('h-full rounded-full', dc.bg.replace('/20', ''), dc.text.replace('text-', 'bg-'))} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(disciplineCounts).length === 0 && (
              <p className="text-body-small text-text-subtle">No RFIs yet</p>
            )}
          </div>
        </div>

        <div className="bg-surface-card border border-border rounded-lg p-4">
          <h3 className="text-label font-semibold text-text-muted uppercase tracking-wider mb-4">Status Overview</h3>
          {stats ? (
            <div className="space-y-2">
              {[
                { label: 'Open',         value: stats.open,        total: stats.total, color: 'bg-info-500' },
                { label: 'Under Review', value: stats.underReview, total: stats.total, color: 'bg-warning-400' },
                { label: 'Responded',    value: stats.responded,   total: stats.total, color: 'bg-success-500' },
                { label: 'Closed',       value: stats.closed,      total: stats.total, color: 'bg-neutral-600' },
              ].map(({ label, value, total, color }) => {
                const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                return (
                  <div key={label} className="flex items-center gap-3 text-body-small">
                    <span className="w-24 text-text-default flex-shrink-0">{label}</span>
                    <div className="flex-1 bg-surface-elevated rounded-full h-2 overflow-hidden">
                      <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-right text-text-muted font-mono">{pct}%</span>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-body-small text-text-subtle">No data</p>}
        </div>
      </div>

      {/* Flagged RFIs table */}
      <div className="bg-surface-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-label font-semibold text-text-muted uppercase tracking-wider">
            Overdue &amp; High-Priority RFIs
          </h3>
        </div>
        {flagged.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-body-small text-text-subtle">
            No overdue or high-priority items
          </div>
        ) : (
          <table className="w-full text-body-small">
            <thead>
              <tr className="border-b border-border bg-surface-elevated">
                {['RFI No.', 'Title', 'Discipline', 'Priority', 'Due Date', 'Days', 'Status'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-caption text-text-muted font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flagged.map(r => {
                const days = r.requiredDate
                  ? Math.ceil((new Date(r.requiredDate).getTime() - Date.now()) / 86_400_000)
                  : null;
                const dc = DISCIPLINE_COLORS[r.discipline as RfiDiscipline] ?? DISCIPLINE_COLORS['General']!;
                return (
                  <tr
                    key={r.id}
                    onClick={() => onGoToRfi(r.id)}
                    className="border-b border-border last:border-0 hover:bg-surface-elevated cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2.5 font-mono text-accent-teal-400 font-medium">{r.rfiNumber}</td>
                    <td className="px-4 py-2.5 text-text-default max-w-[180px] truncate">{r.title}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn('px-2 py-0.5 rounded-full text-caption font-medium', dc.bg, dc.text)}>
                        {r.discipline}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-1">
                        <span className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_DOT[r.priority as RfiPriority])} />
                        {r.priority}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-text-muted">{r.requiredDate ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      {days === null ? '—'
                        : days < 0
                          ? <span className="text-error-400 font-medium">{Math.abs(days)}d over</span>
                          : <span className="text-warning-400 font-medium">{days}d left</span>
                      }
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn('px-2 py-0.5 rounded-full text-caption font-medium', STATUS_BADGE[r.status])}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label, value, sub, icon, color,
}: { label: string; value: number | string; sub: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-surface-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-caption font-semibold text-text-subtle uppercase tracking-wider">{label}</span>
        <span className={cn(color, 'opacity-70')}>{icon}</span>
      </div>
      <div className={cn('text-heading-2 font-mono font-semibold', color)}>{value}</div>
      <div className="text-caption text-text-subtle mt-1">{sub}</div>
    </div>
  );
}
