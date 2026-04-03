import React from 'react';
import { FileTextIcon, AlertTriangleIcon, ClockIcon, CheckCircle2Icon } from 'lucide-react';

interface RfiStats {
  openCount: number;
  pendingResponse: number;
  overdueCount: number;
}

interface Props {
  stats: RfiStats;
}

export function RfiSummaryWidget({ stats }: Props) {
  return (
    <div className="bg-surface-card border border-border rounded-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <FileTextIcon size={14} className="text-text-muted" aria-hidden="true" />
        <h3 className="text-heading-4 font-sans text-text-default">RFIs</h3>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileTextIcon size={13} className="text-info-400" aria-hidden="true" />
            <span className="text-body-small text-text-muted">Open RFIs</span>
          </div>
          <span className="text-body font-mono font-semibold text-info-400">{stats.openCount}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClockIcon size={13} className="text-warning-400" aria-hidden="true" />
            <span className="text-body-small text-text-muted">Pending Response</span>
          </div>
          <span className="text-body font-mono font-semibold text-warning-400">{stats.pendingResponse}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangleIcon size={13} className="text-error-400" aria-hidden="true" />
            <span className="text-body-small text-text-muted">Overdue</span>
          </div>
          <span className="text-body font-mono font-semibold text-error-400">{stats.overdueCount}</span>
        </div>

        {stats.openCount === 0 && stats.overdueCount === 0 && (
          <div className="flex items-center gap-2 pt-1">
            <CheckCircle2Icon size={13} className="text-success-400" aria-hidden="true" />
            <span className="text-caption text-text-muted">All RFIs resolved</span>
          </div>
        )}
      </div>
    </div>
  );
}
