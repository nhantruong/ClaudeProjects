import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { AlertCircle, Loader2 } from 'lucide-react';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { tasksApi } from '@/lib/api/tasks.api';
import type { ListTasksParams } from '@/lib/api/tasks.api';
import type { Task, TaskStatus } from '@/types';

// ── Column order ──────────────────────────────────────────────────────────────

const COLUMN_STATUSES: TaskStatus[] = [
  'todo',
  'in_progress',
  'in_review',
  'done',
  'blocked',
];

// ── Component ─────────────────────────────────────────────────────────────────

export interface KanbanBoardProps {
  projectId: number;
  filters?: ListTasksParams;
  onTaskClick: (task: Task) => void;
}

export function KanbanBoard({ projectId, filters, onTaskClick }: KanbanBoardProps) {
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [dragError, setDragError] = useState<string | null>(null);

  // ── Data fetching ───────────────────────────────────────────────────────────

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['tasks', projectId, filters],
    queryFn: () => tasksApi.list(projectId, filters),
    refetchInterval: 30_000,
    staleTime: 30_000,
  });

  const tasks = data?.tasks ?? [];

  // ── Status update mutation ──────────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: TaskStatus }) =>
      tasksApi.update(taskId, { status }),

    // Optimistic update
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', projectId, filters] });

      const snapshot = queryClient.getQueryData<{ tasks: Task[] }>([
        'tasks',
        projectId,
        filters,
      ]);

      queryClient.setQueryData<{ tasks: Task[] }>(
        ['tasks', projectId, filters],
        (old) => {
          if (!old) return old;
          return {
            tasks: old.tasks.map((t) =>
              t.id === taskId ? { ...t, status } : t
            ),
          };
        }
      );

      return { snapshot };
    },

    onError: (_error, _vars, context) => {
      // Revert optimistic update
      if (context?.snapshot) {
        queryClient.setQueryData(
          ['tasks', projectId, filters],
          context.snapshot
        );
      }
      setDragError('Failed to update task status. Please try again.');
      // Auto-dismiss error after 4s
      setTimeout(() => setDragError(null), 4_000);
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', projectId, filters] });
    },
  });

  // ── Drag-and-drop sensors ───────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ── Drag handlers ───────────────────────────────────────────────────────────

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = tasks.find((t) => t.id === event.active.id);
      if (task) setActiveTask(task);
    },
    [tasks]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveTask(null);
      const { active, over } = event;

      if (!over) return;

      // `over.id` is either a column status string or a task id (number)
      // Determine the target column status
      const overId = over.id;
      let targetStatus: TaskStatus | null = null;

      if (COLUMN_STATUSES.includes(overId as TaskStatus)) {
        // Dropped directly onto a column droppable
        targetStatus = overId as TaskStatus;
      } else {
        // Dropped onto another task — find that task's column
        const overTask = tasks.find((t) => t.id === overId);
        if (overTask) targetStatus = overTask.status;
      }

      if (!targetStatus) return;

      const draggedTask = tasks.find((t) => t.id === active.id);
      if (!draggedTask || draggedTask.status === targetStatus) return;

      updateMutation.mutate({ taskId: draggedTask.id, status: targetStatus });
    },
    [tasks, updateMutation]
  );

  // ── Group tasks by status ───────────────────────────────────────────────────

  const tasksByStatus = COLUMN_STATUSES.reduce<Record<TaskStatus, Task[]>>(
    (acc, status) => {
      acc[status] = tasks.filter((t) => t.status === status);
      return acc;
    },
    {
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
      blocked: [],
    }
  );

  // ── Loading state ───────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center h-64"
        aria-label="Loading tasks"
        aria-busy="true"
      >
        <Loader2
          size={32}
          className="text-accent-teal-500 animate-spin"
          aria-hidden="true"
        />
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <AlertCircle size={48} className="text-error-400" aria-hidden="true" />
        <div>
          <h3 className="text-heading-3 text-text-default">Failed to load tasks</h3>
          <p className="text-small text-text-muted mt-1">
            There was an error loading the task board.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="px-4 py-2 rounded-task-card bg-accent-teal-500 text-white text-small font-medium hover:bg-accent-teal-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500 focus-visible:ring-offset-2"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Board ───────────────────────────────────────────────────────────────────

  return (
    <div className="relative">
      {/* Drag operation error toast */}
      {dragError && (
        <div
          role="alert"
          aria-live="assertive"
          className="absolute top-0 right-0 z-10 flex items-center gap-2 px-4 py-2 rounded-task-card bg-error-500 text-white text-small shadow-lg animate-fade-in"
        >
          <AlertCircle size={14} aria-hidden="true" />
          {dragError}
        </div>
      )}

      {/* Live region for drag announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id="kanban-live-region"
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Board columns — horizontal scroll on mobile */}
        <div
          className="flex gap-4 overflow-x-auto pb-4"
          role="list"
          aria-label="Kanban board"
        >
          {COLUMN_STATUSES.map((status) => (
            <div key={status} role="listitem" className="flex-shrink-0">
              <KanbanColumn
                status={status}
                tasks={tasksByStatus[status]}
                onTaskClick={onTaskClick}
                projectId={projectId}
              />
            </div>
          ))}
        </div>

        {/* Drag overlay — renders the ghost card while dragging */}
        <DragOverlay>
          {activeTask && (
            <div className="rotate-1 opacity-90">
              <TaskCard task={activeTask} onClick={() => undefined} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
