'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link2, X, Plus, Loader2, AlertCircle } from 'lucide-react';
import { tasksApi } from '@/lib/api/tasks.api';
import { cn } from '@/lib/utils';

// ── Props ──────────────────────────────────────────────────────────────────────

interface DependenciesSectionProps {
  taskId: number;
  dependsOn: number[];
  blockedBy: number[];
}

// ── Dependency chip ────────────────────────────────────────────────────────────

interface DependencyChipProps {
  taskId: number;
  dependsOnId: number;
  label: string;
  onRemove: () => void;
  isRemoving: boolean;
}

function DependencyChip({
  dependsOnId,
  label,
  onRemove,
  isRemoving,
}: DependencyChipProps) {
  return (
    <li
      className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface-elevated border border-border text-body-small text-text-default"
      data-testid="dependency-chip"
    >
      <span className="font-mono text-caption text-text-muted" aria-label="Task ID">
        #{dependsOnId}
      </span>
      <span className="text-text-muted">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        disabled={isRemoving}
        className={cn(
          'ml-1 text-text-subtle hover:text-error-400 transition-colors rounded',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error-500',
          isRemoving && 'opacity-50 cursor-not-allowed'
        )}
        aria-label={`Remove dependency on task #${dependsOnId}`}
        data-testid="dependency-remove"
      >
        {isRemoving ? (
          <Loader2 size={12} className="animate-spin" aria-hidden="true" />
        ) : (
          <X size={12} aria-hidden="true" />
        )}
      </button>
    </li>
  );
}

// ── Add dependency form ────────────────────────────────────────────────────────

interface AddDependencyFormProps {
  taskId: number;
  label: string;
}

function AddDependencyForm({ taskId, label }: AddDependencyFormProps) {
  const queryClient = useQueryClient();
  const [inputValue, setInputValue] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const addMutation = useMutation({
    mutationFn: (dependsOnTaskId: number) =>
      tasksApi.addDependency(taskId, dependsOnTaskId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      setInputValue('');
      setErrorMessage(null);
      setIsAdding(false);
    },
    onError: (error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setErrorMessage('Adding this dependency would create a circular chain.');
      } else if (status === 400) {
        setErrorMessage('A task cannot depend on itself.');
      } else if (status === 404) {
        setErrorMessage('Task not found. Check the task ID and try again.');
      } else {
        setErrorMessage('Failed to add dependency. Please try again.');
      }
    },
  });

  function handleCommit() {
    const id = parseInt(inputValue.trim(), 10);
    if (isNaN(id) || id <= 0) {
      setErrorMessage('Enter a valid task ID (positive number).');
      return;
    }
    setErrorMessage(null);
    addMutation.mutate(id);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommit();
    } else if (e.key === 'Escape') {
      setInputValue('');
      setErrorMessage(null);
      setIsAdding(false);
    }
  }

  if (!isAdding) {
    return (
      <button
        type="button"
        onClick={() => setIsAdding(true)}
        className={cn(
          'flex items-center gap-1.5 text-body-small text-text-subtle',
          'hover:text-accent-teal-400 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500 rounded'
        )}
        data-testid={`add-dependency-button-${label}`}
      >
        <Plus size={13} aria-hidden="true" />
        Add {label.toLowerCase()}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="1"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setErrorMessage(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Task ID (e.g. 42)"
          className={cn(
            'w-32 bg-surface-elevated border rounded px-2 py-1',
            'text-body-small text-text-default placeholder:text-text-subtle',
            'focus:outline-none focus:ring-2 focus:ring-accent-teal-500',
            errorMessage ? 'border-error-500' : 'border-border'
          )}
          aria-label={`Task ID for ${label}`}
          aria-describedby={errorMessage ? 'dep-error' : undefined}
          aria-invalid={!!errorMessage}
          autoFocus
        />
        <button
          type="button"
          onClick={handleCommit}
          disabled={addMutation.isPending}
          className={cn(
            'px-2 py-1 rounded text-body-small font-medium',
            'bg-accent-teal-500 text-white hover:bg-accent-teal-600 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          aria-label="Confirm dependency"
        >
          {addMutation.isPending ? (
            <Loader2 size={13} className="animate-spin" aria-hidden="true" />
          ) : (
            'Add'
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setInputValue('');
            setErrorMessage(null);
            setIsAdding(false);
          }}
          className={cn(
            'text-text-subtle hover:text-text-muted transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500 rounded'
          )}
          aria-label="Cancel"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
      {errorMessage && (
        <p
          id="dep-error"
          role="alert"
          className="flex items-center gap-1.5 text-caption text-error-400"
          data-testid="dependency-error"
        >
          <AlertCircle size={12} aria-hidden="true" />
          {errorMessage}
        </p>
      )}
    </div>
  );
}

// ── Sub-section ────────────────────────────────────────────────────────────────

interface DependencySubsectionProps {
  taskId: number;
  ids: number[];
  heading: string;
  emptyText: string;
  showRemove: boolean;
}

function DependencySubsection({
  taskId,
  ids,
  heading,
  emptyText,
  showRemove,
}: DependencySubsectionProps) {
  const queryClient = useQueryClient();
  const [removingId, setRemovingId] = useState<number | null>(null);

  const removeMutation = useMutation({
    mutationFn: (dependsOnId: number) =>
      tasksApi.removeDependency(taskId, dependsOnId),
    onMutate: (id) => setRemovingId(id),
    onSettled: () => setRemovingId(null),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <span className="text-caption font-medium text-text-muted uppercase tracking-wide">
        {heading}
      </span>

      {ids.length === 0 ? (
        <p className="text-body-small text-text-subtle italic">{emptyText}</p>
      ) : (
        <ul className="flex flex-wrap gap-2" aria-label={heading}>
          {ids.map((id) => (
            <DependencyChip
              key={id}
              taskId={taskId}
              dependsOnId={id}
              label=""
              onRemove={() => removeMutation.mutate(id)}
              isRemoving={removingId === id}
            />
          ))}
        </ul>
      )}

      {showRemove && (
        <AddDependencyForm taskId={taskId} label={heading} />
      )}
    </div>
  );
}

// ── DependenciesSection ────────────────────────────────────────────────────────

export function DependenciesSection({
  taskId,
  dependsOn,
  blockedBy,
}: DependenciesSectionProps) {
  return (
    <section aria-label="Dependencies" data-testid="dependencies-section">
      <div className="flex items-center gap-2 mb-3">
        <Link2 size={15} className="text-text-muted" aria-hidden="true" />
        <h3 className="text-label font-semibold text-text-default">Dependencies</h3>
      </div>

      <div className="flex flex-col gap-4">
        <DependencySubsection
          taskId={taskId}
          ids={dependsOn}
          heading="Depends on"
          emptyText="No upstream dependencies"
          showRemove={true}
        />
        <DependencySubsection
          taskId={taskId}
          ids={blockedBy}
          heading="Blocks"
          emptyText="Does not block other tasks"
          showRemove={false}
        />
      </div>
    </section>
  );
}
