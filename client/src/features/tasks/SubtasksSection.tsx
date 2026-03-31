import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckSquare, Square, Plus, Trash2, Loader2 } from 'lucide-react';
import { tasksApi } from '@/lib/api/tasks.api';
import { cn } from '@/lib/utils';
import type { Subtask } from '@/types';

// ── Props ──────────────────────────────────────────────────────────────────────

interface SubtasksSectionProps {
  taskId: number;
  subtasks: Subtask[];
}

// ── Subtask row ────────────────────────────────────────────────────────────────

interface SubtaskRowProps {
  taskId: number;
  subtask: Subtask;
}

function SubtaskRow({ taskId, subtask }: SubtaskRowProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(subtask.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleMutation = useMutation({
    mutationFn: () =>
      tasksApi.updateSubtask(taskId, subtask.id, { isComplete: !subtask.isComplete }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });

  const renameMutation = useMutation({
    mutationFn: (title: string) =>
      tasksApi.updateSubtask(taskId, subtask.id, { title }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      setIsEditing(false);
    },
    onError: () => {
      setEditTitle(subtask.title);
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => tasksApi.deleteSubtask(taskId, subtask.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });

  function handleTitleClick() {
    setEditTitle(subtask.title);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleRenameCommit() {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== subtask.title) {
      renameMutation.mutate(trimmed);
    } else {
      setEditTitle(subtask.title);
      setIsEditing(false);
    }
  }

  function handleRenameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameCommit();
    } else if (e.key === 'Escape') {
      setEditTitle(subtask.title);
      setIsEditing(false);
    }
  }

  return (
    <li
      className="group flex items-center gap-2 py-1.5 rounded px-1 hover:bg-surface-elevated/40 transition-colors"
      data-testid="subtask-row"
    >
      {/* Toggle checkbox */}
      <button
        type="button"
        onClick={() => toggleMutation.mutate()}
        disabled={toggleMutation.isPending}
        className={cn(
          'shrink-0 text-text-muted hover:text-accent-teal-400 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500 rounded',
          toggleMutation.isPending && 'opacity-50 cursor-not-allowed'
        )}
        aria-label={subtask.isComplete ? 'Mark incomplete' : 'Mark complete'}
        data-testid="subtask-toggle"
      >
        {toggleMutation.isPending ? (
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        ) : subtask.isComplete ? (
          <CheckSquare size={16} className="text-success-400" aria-hidden="true" />
        ) : (
          <Square size={16} aria-hidden="true" />
        )}
      </button>

      {/* Title — inline edit */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleRenameCommit}
          onKeyDown={handleRenameKeyDown}
          className={cn(
            'flex-1 bg-surface-elevated border border-accent-teal-500 rounded px-2 py-0.5',
            'text-body text-text-default',
            'focus:outline-none focus:ring-2 focus:ring-accent-teal-500'
          )}
          aria-label="Edit subtask title"
          disabled={renameMutation.isPending}
        />
      ) : (
        <span
          role="button"
          tabIndex={0}
          onClick={handleTitleClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleTitleClick();
            }
          }}
          className={cn(
            'flex-1 text-body cursor-text rounded px-1 -mx-1',
            'hover:bg-surface-elevated/60 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
            subtask.isComplete
              ? 'line-through text-text-subtle'
              : 'text-text-default'
          )}
          aria-label={`Subtask: ${subtask.title}${subtask.isComplete ? ' (complete)' : ''}`}
        >
          {subtask.title}
        </span>
      )}

      {/* Delete — visible on hover */}
      <button
        type="button"
        onClick={() => deleteMutation.mutate()}
        disabled={deleteMutation.isPending}
        className={cn(
          'shrink-0 text-text-subtle hover:text-error-400 transition-colors',
          'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error-500 rounded',
          deleteMutation.isPending && 'opacity-50 cursor-not-allowed'
        )}
        aria-label={`Delete subtask: ${subtask.title}`}
        data-testid="subtask-delete"
      >
        {deleteMutation.isPending ? (
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
        ) : (
          <Trash2 size={14} aria-hidden="true" />
        )}
      </button>
    </li>
  );
}

// ── Add subtask row ────────────────────────────────────────────────────────────

interface AddSubtaskRowProps {
  taskId: number;
}

function AddSubtaskRow({ taskId }: AddSubtaskRowProps) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addMutation = useMutation({
    mutationFn: (newTitle: string) =>
      tasksApi.addSubtask(taskId, { title: newTitle }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      setTitle('');
      setIsAdding(false);
    },
  });

  function handleStartAdding() {
    setIsAdding(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleCommit() {
    const trimmed = title.trim();
    if (trimmed) {
      addMutation.mutate(trimmed);
    } else {
      setTitle('');
      setIsAdding(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommit();
    } else if (e.key === 'Escape') {
      setTitle('');
      setIsAdding(false);
    }
  }

  if (isAdding) {
    return (
      <li className="flex items-center gap-2 py-1.5 px-1">
        <Square size={16} className="text-text-subtle shrink-0" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleCommit}
          onKeyDown={handleKeyDown}
          placeholder="Subtask title"
          className={cn(
            'flex-1 bg-surface-elevated border border-accent-teal-500 rounded px-2 py-0.5',
            'text-body text-text-default placeholder:text-text-subtle',
            'focus:outline-none focus:ring-2 focus:ring-accent-teal-500'
          )}
          aria-label="New subtask title"
          disabled={addMutation.isPending}
        />
        {addMutation.isPending && (
          <Loader2 size={14} className="animate-spin text-text-muted shrink-0" aria-hidden="true" />
        )}
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={handleStartAdding}
        className={cn(
          'flex items-center gap-2 w-full py-1.5 px-1 rounded',
          'text-body-small text-text-subtle hover:text-accent-teal-400',
          'hover:bg-surface-elevated/40 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500'
        )}
        data-testid="add-subtask-button"
      >
        <Plus size={14} aria-hidden="true" />
        Add subtask
      </button>
    </li>
  );
}

// ── SubtasksSection ────────────────────────────────────────────────────────────

export function SubtasksSection({ taskId, subtasks }: SubtasksSectionProps) {
  const completedCount = subtasks.filter((s) => s.isComplete).length;
  const totalCount = subtasks.length;

  return (
    <section aria-label="Subtasks" data-testid="subtasks-section">
      <div className="flex items-center gap-2 mb-2">
        <CheckSquare size={15} className="text-text-muted" aria-hidden="true" />
        <h3 className="text-label font-semibold text-text-default">Subtasks</h3>
        {totalCount > 0 && (
          <span
            className="text-caption text-text-muted font-mono"
            aria-label={`${completedCount} of ${totalCount} complete`}
          >
            [{completedCount}/{totalCount}]
          </span>
        )}
      </div>

      <ul className="flex flex-col" aria-label="Subtask list">
        {subtasks
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((subtask) => (
            <SubtaskRow key={subtask.id} taskId={taskId} subtask={subtask} />
          ))}
        <AddSubtaskRow taskId={taskId} />
      </ul>
    </section>
  );
}
