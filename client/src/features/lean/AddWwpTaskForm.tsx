import React, { useState } from 'react';
import { PlusIcon, Loader2, SearchIcon } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '@/lib/api/tasks.api';
import { leanApi } from '@/lib/api/lean.api';
import { cn } from '@/lib/utils';
import type { Task } from '@/types';

// ── Props ──────────────────────────────────────────────────────────────────────

interface AddWwpTaskFormProps {
  projectId: number;
  weekId: number;
}

// ── Mode toggle ────────────────────────────────────────────────────────────────

type AddMode = 'task' | 'adhoc';

// ── Component ──────────────────────────────────────────────────────────────────

export function AddWwpTaskForm({ projectId, weekId }: AddWwpTaskFormProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AddMode>('adhoc');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [error, setError] = useState('');

  // Load tasks for the search dropdown
  const { data: tasksData } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksApi.list(projectId),
    enabled: isOpen && mode === 'task',
  });

  const filteredTasks = (tasksData?.tasks ?? []).filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  const addMutation = useMutation({
    mutationFn: () => {
      if (mode === 'adhoc') {
        return leanApi.addWwpTask(projectId, weekId, { description });
      }
      if (!selectedTask) throw new Error('No task selected');
      return leanApi.addWwpTask(projectId, weekId, {
        description: selectedTask.title,
        taskId: selectedTask.id,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['wwp', projectId, weekId] });
      setDescription('');
      setSearch('');
      setSelectedTask(null);
      setError('');
      setIsOpen(false);
    },
    onError: () => {
      setError('Failed to add task. Please try again.');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (mode === 'adhoc' && !description.trim()) {
      setError('Please enter a task description.');
      return;
    }
    if (mode === 'task' && !selectedTask) {
      setError('Please select a task from the list.');
      return;
    }

    addMutation.mutate();
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg',
          'text-text-muted hover:text-text-default',
          'border border-dashed border-border hover:border-border-hover',
          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
          'text-label'
        )}
        data-testid="add-wwp-task-toggle"
      >
        <PlusIcon size={14} aria-hidden="true" />
        Add task commitment
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-4">
      {/* Mode toggle */}
      <div className="flex gap-1 mb-4 p-1 rounded-md bg-surface-card w-fit">
        <button
          type="button"
          onClick={() => { setMode('adhoc'); setSelectedTask(null); setSearch(''); }}
          className={cn(
            'px-3 py-1.5 rounded text-label transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
            mode === 'adhoc'
              ? 'bg-surface-elevated text-text-default'
              : 'text-text-muted hover:text-text-default'
          )}
        >
          Ad-hoc description
        </button>
        <button
          type="button"
          onClick={() => { setMode('task'); setDescription(''); }}
          className={cn(
            'px-3 py-1.5 rounded text-label transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
            mode === 'task'
              ? 'bg-surface-elevated text-text-default'
              : 'text-text-muted hover:text-text-default'
          )}
        >
          From project tasks
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {mode === 'adhoc' ? (
          <div className="mb-3">
            <label
              htmlFor="wwp-description"
              className="block text-label text-text-muted mb-1.5"
            >
              Task description
            </label>
            <input
              id="wwp-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will be completed this week?"
              className={cn(
                'w-full px-3 py-2 rounded-md text-body bg-surface-card',
                'border border-border focus:border-accent-teal-500 text-text-default',
                'placeholder:text-text-subtle',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500'
              )}
              autoFocus
              data-testid="wwp-description-input"
            />
          </div>
        ) : (
          <div className="mb-3">
            <label
              htmlFor="wwp-task-search"
              className="block text-label text-text-muted mb-1.5"
            >
              Search tasks
            </label>
            <div className="relative">
              <SearchIcon
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="wwp-task-search"
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSelectedTask(null); }}
                placeholder="Search task title..."
                className={cn(
                  'w-full pl-8 pr-3 py-2 rounded-md text-body bg-surface-card',
                  'border border-border focus:border-accent-teal-500 text-text-default',
                  'placeholder:text-text-subtle',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500'
                )}
                autoFocus
                data-testid="wwp-task-search-input"
              />
            </div>

            {/* Task list */}
            {search.trim() && (
              <ul
                className="mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-surface-card divide-y divide-border"
                role="listbox"
                aria-label="Matching tasks"
              >
                {filteredTasks.length === 0 ? (
                  <li className="px-3 py-2 text-label text-text-muted">No tasks found</li>
                ) : (
                  filteredTasks.slice(0, 20).map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selectedTask?.id === t.id}
                        onClick={() => { setSelectedTask(t); setSearch(t.title); }}
                        className={cn(
                          'w-full text-left px-3 py-2 text-label transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-teal-500',
                          selectedTask?.id === t.id
                            ? 'bg-accent-teal-500/10 text-accent-teal-400'
                            : 'text-text-default hover:bg-surface-elevated'
                        )}
                      >
                        {t.title}
                        {t.assigneeName && (
                          <span className="ml-2 text-caption text-text-muted">
                            — {t.assigneeName}
                          </span>
                        )}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-label text-error-400 mb-3" role="alert">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={addMutation.isPending}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-label font-medium',
              'bg-accent-teal-500 hover:bg-accent-teal-600 text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
              'transition-colors'
            )}
            data-testid="add-wwp-task-submit"
          >
            {addMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            ) : (
              <PlusIcon size={14} aria-hidden="true" />
            )}
            Add commitment
          </button>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setDescription('');
              setSearch('');
              setSelectedTask(null);
              setError('');
            }}
            className={cn(
              'px-3 py-2 rounded-lg text-label text-text-muted',
              'hover:text-text-default hover:bg-surface-elevated',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
              'transition-colors'
            )}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
