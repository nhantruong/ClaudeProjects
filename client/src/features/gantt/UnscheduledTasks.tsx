import React from 'react';
import { CalendarIcon } from 'lucide-react';
import type { Task } from '@/types';
import { cn } from '@/lib/utils';

interface UnscheduledTasksProps {
  tasks: Task[];
}

const PRIORITY_LABELS: Record<Task['priority'], string> = {
  critical: 'Critical',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
};

const PRIORITY_COLORS: Record<Task['priority'], string> = {
  critical: 'text-error-400',
  high: 'text-warning-500',
  normal: 'text-text-muted',
  low: 'text-neutral-500',
};

export function UnscheduledTasks({ tasks }: UnscheduledTasksProps) {
  if (tasks.length === 0) return null;

  return (
    <section
      className="mt-6 border-t border-border pt-6"
      aria-label="Unscheduled tasks"
      data-testid="unscheduled-tasks"
    >
      <h3 className="text-heading-3 text-text-muted mb-3 flex items-center gap-2">
        <CalendarIcon size={16} className="text-neutral-500" aria-hidden="true" />
        Unscheduled ({tasks.length})
      </h3>

      <ul className="space-y-2" role="list">
        {tasks.map((task) => (
          <li
            key={task.id}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-task-card',
              'bg-surface-card border border-border',
              'hover:border-border-hover transition-colors'
            )}
            data-testid={`unscheduled-task-${task.id}`}
          >
            {/* Priority dot */}
            <span
              className="flex-shrink-0 w-2 h-2 rounded-full"
              style={{ backgroundColor: priorityDot(task.priority) }}
              aria-hidden="true"
            />

            {/* Title */}
            <span className="flex-1 text-small text-text-default truncate">
              {task.title}
            </span>

            {/* Priority label */}
            <span
              className={cn('text-caption flex-shrink-0', PRIORITY_COLORS[task.priority])}
            >
              {PRIORITY_LABELS[task.priority]}
            </span>

            {/* Assignee */}
            {task.assigneeName && (
              <span className="text-caption text-text-muted flex-shrink-0 truncate max-w-24">
                {task.assigneeName}
              </span>
            )}

            {/* No dates label */}
            <span className="flex-shrink-0 flex items-center gap-1 text-caption text-neutral-500">
              <CalendarIcon size={11} aria-hidden="true" />
              No dates set
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function priorityDot(priority: Task['priority']): string {
  switch (priority) {
    case 'critical': return '#DA3633';
    case 'high': return '#E86B2A';
    case 'normal': return '#8B949E';
    case 'low': return '#6E7681';
  }
}
