import React, { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { KanbanSquare, X } from 'lucide-react';
import { KanbanBoard } from '@/features/kanban/KanbanBoard';
import { FilterBar } from '@/features/kanban/FilterBar';
import { projectsApi } from '@/lib/api/projects.api';
import type { ListTasksParams } from '@/lib/api/tasks.api';
import type { Task } from '@/types';
import { cn } from '@/lib/utils';

// ── Task detail modal (lightweight — full drawer in task #014) ─────────────────

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
}

function TaskDetailModal({ task, onClose }: TaskDetailModalProps) {
  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }

  const STATUS_LABELS: Record<Task['status'], string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    in_review: 'In Review',
    done: 'Done',
    blocked: 'Blocked',
  };

  const PRIORITY_LABELS: Record<Task['priority'], string> = {
    critical: 'Critical',
    high: 'High',
    normal: 'Normal',
    low: 'Low',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-title"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div
        className={cn(
          'w-full max-w-lg rounded-card bg-surface-elevated border border-border',
          'shadow-2xl animate-fade-in',
          'flex flex-col gap-4 p-6'
        )}
        role="document"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <h2
            id="task-modal-title"
            className="text-heading-3 text-text-default leading-snug"
          >
            {task.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'p-1.5 rounded text-text-muted shrink-0',
              'hover:text-text-default hover:bg-surface-hover',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
              'transition-colors duration-150'
            )}
            aria-label="Close task detail"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 text-small text-text-muted">
          <span>
            <span className="text-text-default font-medium">Status:</span>{' '}
            {STATUS_LABELS[task.status]}
          </span>
          <span
            aria-hidden="true"
            className="w-px h-4 bg-border"
          />
          <span>
            <span className="text-text-default font-medium">Priority:</span>{' '}
            {PRIORITY_LABELS[task.priority]}
          </span>
          {task.assigneeName && (
            <>
              <span aria-hidden="true" className="w-px h-4 bg-border" />
              <span>
                <span className="text-text-default font-medium">Assignee:</span>{' '}
                {task.assigneeName}
              </span>
            </>
          )}
        </div>

        {/* Description */}
        {task.description ? (
          <p className="text-body text-text-default whitespace-pre-wrap leading-relaxed">
            {task.description}
          </p>
        ) : (
          <p className="text-body text-text-muted italic">No description provided.</p>
        )}

        {/* Footer note */}
        <p className="text-caption text-text-muted border-t border-border pt-3">
          Full task detail coming in task #014.
        </p>
      </div>
    </div>
  );
}

// ── KanbanPage ────────────────────────────────────────────────────────────────

export function KanbanPage() {
  const { projectId } = useParams({ strict: false });
  const id = Number(projectId);

  const [filters, setFilters] = useState<ListTasksParams>({});
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const { data: projectData } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id),
    enabled: !isNaN(id) && id > 0,
  });

  const projectName = projectData?.project.name;

  if (isNaN(id) || id <= 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <KanbanSquare size={48} className="text-neutral-600 mb-4" aria-hidden="true" />
        <h1 className="text-heading-3 text-text-default">Invalid project</h1>
        <p className="text-small text-text-muted mt-2">No project ID found in the URL.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4 h-full">
        {/* Page header */}
        <header className="flex items-center gap-3">
          <KanbanSquare
            size={20}
            className="text-accent-teal-500 shrink-0"
            aria-hidden="true"
          />
          <div>
            <h1 className="text-heading-3 text-text-default">Kanban Board</h1>
            {projectName && (
              <p className="text-small text-text-muted">{projectName}</p>
            )}
          </div>
        </header>

        {/* Filter bar */}
        <FilterBar
          onFilterChange={setFilters}
          members={
            projectData?.project.members?.map((m) => ({
              userId: m.userId,
              displayName: m.displayName,
            })) ?? []
          }
        />

        {/* Kanban board */}
        <div className="flex-1 overflow-hidden">
          <KanbanBoard
            projectId={id}
            filters={filters}
            onTaskClick={setSelectedTask}
          />
        </div>
      </div>

      {/* Task detail modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </>
  );
}
