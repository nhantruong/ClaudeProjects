import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskCard } from './TaskCard';
import { QuickAddTaskForm } from './QuickAddTaskForm';
import type { Task, TaskStatus } from '@/types';

// ── Column config ─────────────────────────────────────────────────────────────

const COLUMN_CONFIG: Record<
  TaskStatus,
  { label: string; color: string; bgColor: string }
> = {
  todo: {
    label: 'To Do',
    color: '#484F58',
    bgColor: 'rgba(72, 79, 88, 0.15)',
  },
  in_progress: {
    label: 'In Progress',
    color: '#1F6FEB',
    bgColor: 'rgba(31, 111, 235, 0.15)',
  },
  in_review: {
    label: 'In Review',
    color: '#D29922',
    bgColor: 'rgba(210, 153, 34, 0.15)',
  },
  done: {
    label: 'Done',
    color: '#2EA043',
    bgColor: 'rgba(46, 160, 67, 0.15)',
  },
  blocked: {
    label: 'Blocked',
    color: '#DA3633',
    bgColor: 'rgba(218, 54, 51, 0.15)',
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  projectId: number;
}

export function KanbanColumn({ status, tasks, onTaskClick, projectId }: KanbanColumnProps) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const config = COLUMN_CONFIG[status];

  const { setNodeRef, isOver } = useDroppable({ id: status });

  const taskIds = tasks.map((t) => t.id);

  return (
    <section
      className="flex flex-col min-w-kanban-column w-72 max-h-full"
      aria-label={`${config.label} column`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2 rounded-t-task-card bg-surface-column border border-border border-b-0">
        <div className="flex items-center gap-2">
          {/* Status color dot */}
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: config.color }}
            aria-hidden="true"
          />
          <h2 className="text-small font-semibold text-text-default">
            {config.label}
          </h2>
        </div>

        {/* Task count badge */}
        <span
          className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-badge text-caption font-medium text-text-muted bg-surface-elevated border border-border"
          aria-label={`${tasks.length} task${tasks.length !== 1 ? 's' : ''}`}
        >
          {tasks.length}
        </span>
      </div>

      {/* Column body */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col flex-1 overflow-y-auto rounded-b-task-card',
          'bg-surface-column border border-border border-t-0',
          'p-2 gap-2',
          'min-h-[120px] max-h-[calc(100vh-220px)]',
          // Drop zone highlight
          isOver && 'ring-2 ring-inset ring-accent-teal-500 ring-dashed'
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {/* Task group wrapper for hover state to show drag handle */}
          <div className="flex flex-col gap-2 group">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
              />
            ))}
          </div>
        </SortableContext>

        {/* Empty state */}
        {tasks.length === 0 && !showQuickAdd && (
          <div
            className="flex flex-col items-center justify-center py-6 text-center"
            aria-label={`No tasks in ${config.label}`}
          >
            <Inbox
              size={24}
              className="text-neutral-600 mb-2"
              aria-hidden="true"
            />
            <p className="text-small text-text-muted">No tasks here</p>
          </div>
        )}

        {/* Quick add form */}
        {showQuickAdd && (
          <QuickAddTaskForm
            projectId={projectId}
            status={status}
            onClose={() => setShowQuickAdd(false)}
          />
        )}
      </div>

      {/* Add task button */}
      {!showQuickAdd && (
        <button
          type="button"
          onClick={() => setShowQuickAdd(true)}
          className={cn(
            'flex items-center gap-2 mt-1 px-3 py-2 rounded-task-card w-full',
            'text-small text-text-muted',
            'hover:bg-surface-column hover:text-text-default',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
            'transition-colors duration-150'
          )}
          data-testid={`add-task-${status}`}
          aria-label={`Add task to ${config.label}`}
        >
          <Plus size={14} aria-hidden="true" />
          Add task
        </button>
      )}
    </section>
  );
}
