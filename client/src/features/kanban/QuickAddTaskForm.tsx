import React, { useRef, useEffect } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tasksApi } from '@/lib/api/tasks.api';
import type { TaskStatus } from '@/types';

// ── Component ─────────────────────────────────────────────────────────────────

export interface QuickAddTaskFormProps {
  projectId: number;
  status: TaskStatus;
  onClose: () => void;
}

export function QuickAddTaskForm({ projectId, status, onClose }: QuickAddTaskFormProps) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = React.useState('');
  const [error, setError] = React.useState('');

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const createMutation = useMutation({
    mutationFn: () =>
      tasksApi.create(projectId, { title: title.trim(), status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      onClose();
    },
    onError: () => {
      setError('Failed to create task. Please try again.');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }
    setError('');
    createMutation.mutate();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      className="mt-2 flex flex-col gap-2"
      data-testid="quick-add-task-form"
    >
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          if (error) setError('');
        }}
        placeholder="Task title..."
        maxLength={300}
        className={cn(
          'w-full rounded-task-card bg-surface-elevated border px-3 py-2',
          'text-body text-text-default placeholder:text-text-muted',
          'focus:outline-none focus:ring-2 focus:ring-accent-teal-500 focus:border-transparent',
          error ? 'border-error-500' : 'border-border'
        )}
        aria-label="New task title"
        aria-describedby={error ? 'quick-add-error' : undefined}
        disabled={createMutation.isPending}
      />

      {error && (
        <p
          id="quick-add-error"
          className="text-small text-error-400"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={createMutation.isPending || !title.trim()}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-task-card text-small font-medium',
            'bg-accent-teal-500 text-white',
            'hover:bg-accent-teal-600 disabled:opacity-50 disabled:cursor-not-allowed',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500 focus-visible:ring-offset-1',
            'transition-colors duration-150'
          )}
          aria-busy={createMutation.isPending}
        >
          {createMutation.isPending && (
            <Loader2 size={12} className="animate-spin" aria-hidden="true" />
          )}
          {createMutation.isPending ? 'Adding...' : 'Add task'}
        </button>

        <button
          type="button"
          onClick={onClose}
          disabled={createMutation.isPending}
          className={cn(
            'p-1.5 rounded-task-card text-text-muted',
            'hover:text-text-default hover:bg-surface-elevated',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
            'transition-colors duration-150'
          )}
          aria-label="Cancel"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
