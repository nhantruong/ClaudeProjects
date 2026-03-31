import React from 'react';
import { Users } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import type { DashboardData } from '@/lib/api/dashboard.api';

// ── Types ──────────────────────────────────────────────────────────────────────

interface WorkloadWidgetProps {
  workload: DashboardData['workload'];
}

// ── Component ──────────────────────────────────────────────────────────────────

export function WorkloadWidget({ workload }: WorkloadWidgetProps) {
  return (
    <div className="bg-surface-card border border-border rounded-lg p-5">
      {/* Heading */}
      <div className="flex items-center gap-2 mb-4">
        <Users size={14} className="text-text-muted" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-text-default">Team Workload</h2>
      </div>

      {/* Rows */}
      {workload.length === 0 ? (
        <p className="text-sm text-text-muted text-center py-4">No open tasks</p>
      ) : (
        <ul className="space-y-2" role="list">
          {workload.map((member) => (
            <li
              key={member.userId}
              className="flex items-center gap-3"
              data-testid={`workload-row-${member.userId}`}
            >
              {/* Initials avatar */}
              <div
                className="flex items-center justify-center w-7 h-7 rounded-full bg-accent-teal-600/30 text-accent-teal-400 text-xs font-bold font-mono shrink-0"
                aria-hidden="true"
              >
                {getInitials(member.displayName)}
              </div>

              {/* Name */}
              <span className="flex-1 text-sm text-text-default truncate min-w-0">
                {member.displayName}
              </span>

              {/* Overdue badge */}
              {member.overdueCount > 0 && (
                <span
                  className="bg-error-500/20 text-error-400 text-xs rounded px-1.5 py-0.5 font-mono shrink-0"
                  aria-label={`${member.overdueCount} overdue`}
                >
                  {member.overdueCount} late
                </span>
              )}

              {/* Task count */}
              <span className="font-mono font-semibold text-sm text-text-default shrink-0">
                {member.taskCount}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
