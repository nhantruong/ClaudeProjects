import React from 'react';
import { Calendar, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn, getInitials, formatShortDate, isOverdue } from '@/lib/utils';
import type { Task, TaskPriority } from '@/types';

// ── Avatar color helper ────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#1F6FEB',
  '#2EA043',
  '#D29922',
  '#DA3633',
  '#8250DF',
  '#0D9488',
  '#E86B2A',
  '#6E7681',
] as const;

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

// ── Priority badge helper ──────────────────────────────────────────────────────

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  critical: 'Critical',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  critical: '#DA3633',
  high: '#E86B2A',
  normal: '#8B949E',
  low: '#6E7681',
};

// ── Component ─────────────────────────────────────────────────────────────────

export interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const overdue = isOverdue(task.dueDate) && task.status !== 'done';
  const blocked = task.status === 'blocked';

  const cardClasses = cn(
    'relative flex flex-col gap-2 rounded-task-card p-3 cursor-pointer',
    'bg-surface-card border border-border',
    'hover:border-border-hover hover:bg-surface-hover',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
    'transition-colors duration-150',
    // Dragging state
    isDragging && 'opacity-80 scale-[1.02] border-[3px] border-accent-teal-500 shadow-xl',
    // Overdue state: left border
    !isDragging && overdue && 'border-l-[3px] border-l-error-500',
    // Blocked state: full border override
    !isDragging && blocked && !overdue && 'border border-status-blocked'
  );

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={cardClasses}
      data-testid="task-card"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Task: ${task.title}`}
    >
      {/* Drag handle — hover-visible on desktop, always-visible on mobile */}
      <button
        {...attributes}
        {...listeners}
        className={cn(
          'absolute top-2 right-2 text-text-muted rounded p-0.5',
          'opacity-0 group-hover:opacity-100 focus:opacity-100',
          'hover:text-text-default hover:bg-surface-elevated',
          'touch-none cursor-grab active:cursor-grabbing',
          'md:opacity-0 md:group-hover:opacity-100',
          'opacity-100 md:opacity-0'
        )}
        aria-label="Drag task"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={14} aria-hidden="true" />
      </button>

      {/* Top row: priority badge + assignee avatar */}
      <div className="flex items-center justify-between gap-2 pr-5">
        {/* Priority badge */}
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded-badge text-caption font-medium uppercase tracking-wide text-white shrink-0"
          style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
          aria-label={`Priority: ${PRIORITY_LABELS[task.priority]}`}
        >
          {PRIORITY_LABELS[task.priority]}
        </span>

        {/* Assignee avatar */}
        {task.assigneeName && (
          <div
            className="flex items-center justify-center w-6 h-6 rounded-full text-white shrink-0"
            style={{
              backgroundColor: getAvatarColor(task.assigneeName),
              fontSize: '10px',
              fontWeight: 600,
            }}
            role="img"
            aria-label={task.assigneeName}
            title={task.assigneeName}
          >
            {getInitials(task.assigneeName)}
          </div>
        )}
      </div>

      {/* Task title */}
      <p
        className="text-body text-text-default line-clamp-2 leading-snug"
        title={task.title}
      >
        {task.title}
      </p>

      {/* Due date */}
      {task.dueDate && (
        <div
          className={cn(
            'flex items-center gap-1 text-small',
            overdue ? 'text-error-400' : 'text-text-muted'
          )}
          aria-label={`Due ${formatShortDate(task.dueDate)}${overdue ? ' — overdue' : ''}`}
        >
          <Calendar size={12} aria-hidden="true" />
          <span>{formatShortDate(task.dueDate)}</span>
          {overdue && (
            <span className="sr-only"> (overdue)</span>
          )}
        </div>
      )}
    </article>
  );
}
