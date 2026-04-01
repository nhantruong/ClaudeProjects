import React from 'react';
import { format, parseISO, startOfISOWeek, addDays } from 'date-fns';
import { CalendarIcon, InboxIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task, TaskStatus, TaskPriority } from '@/types';

// ── Status / priority display maps ─────────────────────────────────────────────

const STATUS_BG: Record<TaskStatus, string> = {
  todo: '#484F58',
  in_progress: '#1F6FEB',
  in_review: '#D29922',
  done: '#2EA043',
  blocked: '#DA3633',
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
  blocked: 'Blocked',
};

const PRIORITY_BG: Record<TaskPriority, string> = {
  critical: '#DA3633',
  high: '#E86B2A',
  normal: '#8B949E',
  low: '#6E7681',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  critical: 'Critical',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
};

// ── Task row ───────────────────────────────────────────────────────────────────

interface LookaheadTaskRowProps {
  task: Task;
}

function LookaheadTaskRow({ task }: LookaheadTaskRowProps) {
  const isOverdue =
    task.dueDate != null && new Date(task.dueDate) < new Date() && task.status !== 'done';

  return (
    <tr
      className="border-b border-border last:border-0 hover:bg-surface-elevated/40 transition-colors"
      data-testid={`lookahead-task-${task.id}`}
    >
      {/* Title */}
      <td className="py-2.5 pr-3 pl-0 text-body text-text-default max-w-xs">
        <span className="line-clamp-2">{task.title}</span>
      </td>

      {/* Due date */}
      <td className="py-2.5 pr-3 whitespace-nowrap">
        {task.dueDate ? (
          <span
            className={cn(
              'flex items-center gap-1 text-label',
              isOverdue ? 'text-error-400' : 'text-text-muted'
            )}
          >
            <CalendarIcon size={12} aria-hidden="true" />
            {format(parseISO(task.dueDate), 'MMM d')}
          </span>
        ) : (
          <span className="text-caption text-text-subtle">—</span>
        )}
      </td>

      {/* Assignee */}
      <td className="py-2.5 pr-3 text-label text-text-muted whitespace-nowrap">
        {task.assigneeName ?? <span className="text-text-subtle">Unassigned</span>}
      </td>

      {/* Status */}
      <td className="py-2.5 pr-3 whitespace-nowrap">
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-caption text-white font-medium uppercase tracking-wide"
          style={{ backgroundColor: STATUS_BG[task.status] }}
        >
          {STATUS_LABELS[task.status]}
        </span>
      </td>

      {/* Priority */}
      <td className="py-2.5 whitespace-nowrap">
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-caption text-white font-medium"
          style={{ backgroundColor: PRIORITY_BG[task.priority] }}
        >
          {PRIORITY_LABELS[task.priority]}
        </span>
      </td>
    </tr>
  );
}

// ── Week group ─────────────────────────────────────────────────────────────────

interface WeekGroupProps {
  weekStart: Date;
  tasks: Task[];
  index: number;
}

function WeekGroup({ weekStart, tasks, index }: WeekGroupProps) {
  const weekEnd = addDays(weekStart, 6);
  const weekLabel = `Week ${index + 1}: ${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}`;

  return (
    <section aria-label={weekLabel}>
      {/* Week header */}
      <div className="flex items-center gap-2 mb-2 mt-6 first:mt-0">
        <h3 className="text-heading-4 text-text-default font-mono">{weekLabel}</h3>
        <span className="text-caption text-text-muted">
          ({tasks.length} task{tasks.length !== 1 ? 's' : ''})
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface-card">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 pr-3 pl-4 text-left text-label text-text-muted font-medium">
                Task
              </th>
              <th className="py-2 pr-3 text-left text-label text-text-muted font-medium">
                Due
              </th>
              <th className="py-2 pr-3 text-left text-label text-text-muted font-medium">
                Assignee
              </th>
              <th className="py-2 pr-3 text-left text-label text-text-muted font-medium">
                Status
              </th>
              <th className="py-2 text-left text-label text-text-muted font-medium">
                Priority
              </th>
            </tr>
          </thead>
          <tbody className="px-4">
            {tasks.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-0 hover:bg-surface-elevated/40 transition-colors">
                <td className="py-2.5 pr-3 pl-4 text-body text-text-default max-w-xs">
                  <span className="line-clamp-2">{t.title}</span>
                </td>
                <td className="py-2.5 pr-3 whitespace-nowrap">
                  {t.dueDate ? (
                    <span
                      className={cn(
                        'flex items-center gap-1 text-label',
                        new Date(t.dueDate) < new Date() && t.status !== 'done'
                          ? 'text-error-400'
                          : 'text-text-muted'
                      )}
                    >
                      <CalendarIcon size={12} aria-hidden="true" />
                      {format(parseISO(t.dueDate), 'MMM d')}
                    </span>
                  ) : (
                    <span className="text-caption text-text-subtle">—</span>
                  )}
                </td>
                <td className="py-2.5 pr-3 text-label text-text-muted whitespace-nowrap">
                  {t.assigneeName ?? <span className="text-text-subtle">Unassigned</span>}
                </td>
                <td className="py-2.5 pr-3 whitespace-nowrap">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-caption text-white font-medium uppercase tracking-wide"
                    style={{ backgroundColor: STATUS_BG[t.status] }}
                  >
                    {STATUS_LABELS[t.status]}
                  </span>
                </td>
                <td className="py-2.5 whitespace-nowrap">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-caption text-white font-medium"
                    style={{ backgroundColor: PRIORITY_BG[t.priority] }}
                  >
                    {PRIORITY_LABELS[t.priority]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface LookaheadTableProps {
  tasks: Task[];
  weeksCount: number;
}

export function LookaheadTable({ tasks, weeksCount }: LookaheadTableProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <InboxIcon size={48} className="text-neutral-600 mb-4" aria-hidden="true" />
        <p className="text-heading-3 text-text-default mb-2">No tasks in lookahead</p>
        <p className="text-small text-text-muted">
          No open tasks are due in the next {weeksCount} weeks.
        </p>
      </div>
    );
  }

  // Group tasks by their ISO week start
  const today = new Date();
  const weekGroups: { weekStart: Date; tasks: Task[] }[] = [];

  for (let i = 0; i < weeksCount; i++) {
    const weekStart = startOfISOWeek(addDays(today, i * 7));
    const weekEnd = addDays(weekStart, 6);

    const weekTasks = tasks.filter((t) => {
      if (!t.dueDate) return false;
      const due = parseISO(t.dueDate);
      return due >= weekStart && due <= weekEnd;
    });

    if (weekTasks.length > 0) {
      weekGroups.push({ weekStart, tasks: weekTasks });
    }
  }

  // Tasks with no due date or due date outside the window
  const ungroupedTasks = tasks.filter((t) => {
    if (!t.dueDate) return true;
    const due = parseISO(t.dueDate);
    const firstWeek = startOfISOWeek(today);
    const lastWeek = addDays(startOfISOWeek(addDays(today, (weeksCount - 1) * 7)), 6);
    return due < firstWeek || due > lastWeek;
  });

  return (
    <div className="space-y-2">
      {weekGroups.map((group, idx) => (
        <WeekGroup
          key={format(group.weekStart, 'yyyy-MM-dd')}
          weekStart={group.weekStart}
          tasks={group.tasks}
          index={idx}
        />
      ))}

      {ungroupedTasks.length > 0 && (
        <section aria-label="Other tasks">
          <div className="flex items-center gap-2 mb-2 mt-6">
            <h3 className="text-heading-4 text-text-default font-mono">Other tasks</h3>
            <span className="text-caption text-text-muted">
              ({ungroupedTasks.length})
            </span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface-card">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 pl-4 text-left text-label text-text-muted font-medium">Task</th>
                  <th className="py-2 pr-3 text-left text-label text-text-muted font-medium">Due</th>
                  <th className="py-2 pr-3 text-left text-label text-text-muted font-medium">Assignee</th>
                  <th className="py-2 pr-3 text-left text-label text-text-muted font-medium">Status</th>
                  <th className="py-2 text-left text-label text-text-muted font-medium">Priority</th>
                </tr>
              </thead>
              <tbody>
                {ungroupedTasks.map((t) => (
                  <LookaheadTaskRow key={t.id} task={t} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
