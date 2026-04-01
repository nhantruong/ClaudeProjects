import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckSquareIcon, SquareIcon, AlertTriangleIcon } from 'lucide-react';
import { leanApi } from '@/lib/api/lean.api';
import { AddWwpTaskForm } from './AddWwpTaskForm';
import { cn } from '@/lib/utils';
import type { WwpTask } from '@/lib/api/lean.api';

// ── Variance reason options ────────────────────────────────────────────────────

const VARIANCE_REASONS = [
  { value: 'late_delivery', label: 'Late delivery from upstream' },
  { value: 'design_change', label: 'Design change' },
  { value: 'resource_unavailable', label: 'Resource unavailable' },
  { value: 'prerequisite_incomplete', label: 'Prerequisite not complete' },
  { value: 'other', label: 'Other' },
] as const;

type VarianceReasonValue = (typeof VARIANCE_REASONS)[number]['value'];

// ── Single task row ────────────────────────────────────────────────────────────

interface WwpTaskRowProps {
  task: WwpTask;
  projectId: number;
  weekId: number;
}

function WwpTaskRow({ task, projectId, weekId }: WwpTaskRowProps) {
  const queryClient = useQueryClient();
  const [selectedReason, setSelectedReason] = useState<VarianceReasonValue | ''>(
    (task.varianceReason as VarianceReasonValue | null) ?? ''
  );
  const [otherText, setOtherText] = useState(
    task.varianceReason && !VARIANCE_REASONS.some((r) => r.value === task.varianceReason)
      ? task.varianceReason
      : ''
  );

  const updateMutation = useMutation({
    mutationFn: (data: { isComplete?: boolean; varianceReason?: string }) =>
      leanApi.updateWwpTask(projectId, weekId, task.id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['wwp', projectId, weekId] });
    },
  });

  function handleToggleComplete() {
    const newComplete = !task.isComplete;
    updateMutation.mutate({ isComplete: newComplete });
  }

  function handleReasonChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value as VarianceReasonValue | '';
    setSelectedReason(val);
    if (val && val !== 'other') {
      updateMutation.mutate({ varianceReason: val });
    }
  }

  function handleOtherBlur() {
    if (otherText.trim()) {
      updateMutation.mutate({ varianceReason: otherText.trim() });
    }
  }

  const showVarianceSection = !task.isComplete;

  return (
    <li
      className={cn(
        'flex flex-col gap-2 p-3 rounded-lg border transition-colors',
        task.isComplete
          ? 'border-border bg-surface-card opacity-70'
          : 'border-border bg-surface-card'
      )}
      data-testid={`wwp-task-row-${task.id}`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          type="button"
          onClick={handleToggleComplete}
          disabled={updateMutation.isPending}
          className={cn(
            'mt-0.5 shrink-0 text-text-muted',
            'hover:text-accent-teal-400',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500 rounded',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors'
          )}
          aria-label={task.isComplete ? 'Mark as incomplete' : 'Mark as complete'}
          aria-pressed={task.isComplete}
        >
          {task.isComplete ? (
            <CheckSquareIcon
              size={18}
              className="text-success-400"
              aria-hidden="true"
            />
          ) : (
            <SquareIcon size={18} aria-hidden="true" />
          )}
        </button>

        {/* Description + assignee */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'text-body text-text-default leading-snug',
              task.isComplete && 'line-through text-text-muted'
            )}
          >
            {task.description}
          </p>
          {task.assigneeName && (
            <p className="text-caption text-text-muted mt-0.5">{task.assigneeName}</p>
          )}
        </div>
      </div>

      {/* Variance reason — only shown for incomplete tasks */}
      {showVarianceSection && (
        <div className="ml-7 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <AlertTriangleIcon
              size={12}
              className="text-warning-400 shrink-0"
              aria-hidden="true"
            />
            <label
              htmlFor={`variance-reason-${task.id}`}
              className="text-caption text-warning-400"
            >
              Variance reason (required to close week)
            </label>
          </div>
          <select
            id={`variance-reason-${task.id}`}
            value={selectedReason}
            onChange={handleReasonChange}
            className={cn(
              'w-full px-2.5 py-1.5 rounded-md text-label bg-surface-elevated',
              'border border-border focus:border-accent-teal-500 text-text-default',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500'
            )}
            data-testid={`variance-reason-select-${task.id}`}
          >
            <option value="">Select reason...</option>
            {VARIANCE_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          {selectedReason === 'other' && (
            <input
              type="text"
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              onBlur={handleOtherBlur}
              placeholder="Describe the reason..."
              className={cn(
                'w-full px-2.5 py-1.5 rounded-md text-label bg-surface-elevated',
                'border border-border focus:border-accent-teal-500 text-text-default',
                'placeholder:text-text-subtle',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500'
              )}
              data-testid={`variance-reason-other-${task.id}`}
            />
          )}
        </div>
      )}
    </li>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface WwpWeekViewProps {
  projectId: number;
  weekId: number;
  tasks: WwpTask[];
  ppc: number | null;
}

export function WwpWeekView({ projectId, weekId, tasks, ppc }: WwpWeekViewProps) {
  const completedCount = tasks.filter((t) => t.isComplete).length;

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      {tasks.length > 0 && (
        <div className="flex items-center justify-between text-label text-text-muted">
          <span>
            {completedCount} / {tasks.length} tasks complete
          </span>
          {ppc !== null && (
            <span className="font-mono text-accent-teal-400 font-semibold">
              PPC: {ppc.toFixed(1)}%
            </span>
          )}
        </div>
      )}

      {/* Task list */}
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CheckSquareIcon
            size={40}
            className="text-neutral-600 mb-3"
            aria-hidden="true"
          />
          <p className="text-heading-4 text-text-default mb-1">No commitments yet</p>
          <p className="text-small text-text-muted">
            Add tasks your team commits to completing this week.
          </p>
        </div>
      ) : (
        <ul className="space-y-2" aria-label="Weekly work plan tasks">
          {tasks.map((task) => (
            <WwpTaskRow
              key={task.id}
              task={task}
              projectId={projectId}
              weekId={weekId}
            />
          ))}
        </ul>
      )}

      {/* Add task form */}
      <AddWwpTaskForm projectId={projectId} weekId={weekId} />
    </div>
  );
}
