'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  User,
  Calendar,
  Flag,
  Activity,
} from 'lucide-react';
import { tasksApi } from '@/lib/api/tasks.api';
import { cn, formatDate, getInitials } from '@/lib/utils';
import { SubtasksSection } from './SubtasksSection';
import { CommentsSection } from './CommentsSection';
import { DependenciesSection } from './DependenciesSection';
import type { TaskStatus, TaskPriority } from '@/types';

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
  blocked: 'Blocked',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: '#484F58',
  in_progress: '#1F6FEB',
  in_review: '#D29922',
  done: '#2EA043',
  blocked: '#DA3633',
};

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

const AVATAR_COLORS = [
  '#1F6FEB', '#2EA043', '#D29922', '#DA3633',
  '#8250DF', '#0D9488', '#E86B2A', '#6E7681',
] as const;

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6 animate-pulse" aria-busy="true" aria-label="Loading task">
      <div className="h-6 bg-surface-elevated rounded w-3/4" />
      <div className="flex gap-2">
        <div className="h-5 w-20 bg-surface-elevated rounded-full" />
        <div className="h-5 w-16 bg-surface-elevated rounded-full" />
      </div>
      <div className="h-16 bg-surface-elevated rounded" />
      <div className="h-4 bg-surface-elevated rounded w-1/2" />
      <div className="h-4 bg-surface-elevated rounded w-1/3" />
    </div>
  );
}

// ── Inline text input ──────────────────────────────────────────────────────────

interface InlineTextProps {
  value: string | null;
  onSave: (v: string) => void;
  isSaving: boolean;
  placeholder?: string;
  className?: string;
  as?: 'input' | 'textarea';
  ariaLabel: string;
}

function InlineText({
  value,
  onSave,
  isSaving,
  placeholder = '—',
  className,
  as: Tag = 'input',
  ariaLabel,
}: InlineTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value ?? '');
  }, [value, editing]);

  function startEdit() {
    setDraft(value ?? '');
    setEditing(true);
    setTimeout(() => ref.current?.focus(), 0);
  }

  function commit() {
    const trimmed = draft.trim();
    if (trimmed !== (value ?? '').trim() && trimmed.length > 0) {
      onSave(trimmed);
    }
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (Tag === 'input' && e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      setDraft(value ?? '');
      setEditing(false);
    }
  }

  if (editing) {
    const sharedClass = cn(
      'w-full bg-surface-elevated border border-accent-teal-500 rounded px-2 py-1',
      'text-text-default focus:outline-none focus:ring-2 focus:ring-accent-teal-500',
      className
    );
    if (Tag === 'textarea') {
      return (
        <textarea
          ref={ref as React.Ref<HTMLTextAreaElement>}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          rows={4}
          className={cn(sharedClass, 'resize-none')}
          aria-label={ariaLabel}
          disabled={isSaving}
        />
      );
    }
    return (
      <input
        ref={ref as React.Ref<HTMLInputElement>}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className={sharedClass}
        aria-label={ariaLabel}
        disabled={isSaving}
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={startEdit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startEdit(); }
      }}
      className={cn(
        'cursor-text rounded px-1 -mx-1',
        'hover:bg-surface-elevated/60 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
        !value && 'text-text-subtle italic',
        className
      )}
      aria-label={`${ariaLabel}: ${value || placeholder}. Click to edit.`}
    >
      {isSaving ? (
        <span className="inline-flex items-center gap-1">
          <Loader2 size={12} className="animate-spin" aria-hidden="true" />
          {value || placeholder}
        </span>
      ) : (
        value || placeholder
      )}
    </span>
  );
}

// ── Inline date input ──────────────────────────────────────────────────────────

interface InlineDateProps {
  value: string | null;
  onSave: (v: string | null) => void;
  isSaving: boolean;
  label: string;
}

function InlineDate({ value, onSave, isSaving, label }: InlineDateProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value ?? '');
  }, [value, editing]);

  function startEdit() {
    setDraft(value ?? '');
    setEditing(true);
    setTimeout(() => ref.current?.focus(), 0);
  }

  function commit() {
    const v = draft.trim() || null;
    if (v !== value) onSave(v);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    else if (e.key === 'Escape') { setDraft(value ?? ''); setEditing(false); }
  }

  if (editing) {
    return (
      <input
        ref={ref}
        type="date"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className={cn(
          'bg-surface-elevated border border-accent-teal-500 rounded px-2 py-0.5',
          'text-body-small text-text-default',
          'focus:outline-none focus:ring-2 focus:ring-accent-teal-500'
        )}
        aria-label={label}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      disabled={isSaving}
      className={cn(
        'text-body-small rounded px-1 -mx-1 transition-colors',
        'hover:bg-surface-elevated/60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
        value ? 'text-text-default' : 'text-text-subtle italic',
        isSaving && 'opacity-60'
      )}
      aria-label={`${label}: ${value ? formatDate(value) : 'Not set'}. Click to edit.`}
    >
      {isSaving ? (
        <span className="inline-flex items-center gap-1">
          <Loader2 size={11} className="animate-spin" aria-hidden="true" />
          {value ? formatDate(value) : 'Not set'}
        </span>
      ) : (
        value ? formatDate(value) : 'Not set'
      )}
    </button>
  );
}

// ── Inline select ──────────────────────────────────────────────────────────────

interface InlineSelectProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onSave: (v: T) => void;
  isSaving: boolean;
  renderValue: (v: T) => React.ReactNode;
  ariaLabel: string;
}

function InlineSelect<T extends string>({
  value,
  options,
  onSave,
  isSaving,
  renderValue,
  ariaLabel,
}: InlineSelectProps<T>) {
  const [editing, setEditing] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  function startEdit() {
    setEditing(true);
    setTimeout(() => selectRef.current?.focus(), 0);
  }

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    onSave(e.target.value as T);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') setEditing(false);
  }

  if (editing) {
    return (
      <select
        ref={selectRef}
        defaultValue={value}
        onChange={handleChange}
        onBlur={() => setEditing(false)}
        onKeyDown={handleKeyDown}
        className={cn(
          'bg-surface-elevated border border-accent-teal-500 rounded px-2 py-0.5',
          'text-body-small text-text-default',
          'focus:outline-none focus:ring-2 focus:ring-accent-teal-500'
        )}
        aria-label={ariaLabel}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      disabled={isSaving}
      className={cn(
        'rounded transition-colors',
        'hover:opacity-80 hover:ring-2 hover:ring-inset hover:ring-white/20',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
        isSaving && 'opacity-60'
      )}
      aria-label={`${ariaLabel}. Click to change.`}
    >
      {isSaving ? (
        <span className="inline-flex items-center gap-1">
          <Loader2 size={11} className="animate-spin text-white" aria-hidden="true" />
          {renderValue(value)}
        </span>
      ) : (
        renderValue(value)
      )}
    </button>
  );
}

// ── TaskDetailPanel ────────────────────────────────────────────────────────────

interface TaskDetailPanelProps {
  taskId: number;
  onClose: () => void;
}

export function TaskDetailPanel({ taskId, onClose }: TaskDetailPanelProps) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => tasksApi.get(taskId),
    enabled: taskId > 0,
  });

  const task = data?.task;

  const updateMutation = useMutation({
    mutationFn: (patch: Parameters<typeof tasksApi.update>[1]) =>
      tasksApi.update(taskId, patch),
    onSuccess: (result) => {
      queryClient.setQueryData(['task', taskId], (old: typeof data) =>
        old ? { task: { ...old.task, ...result.task } } : old
      );
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const STATUS_OPTIONS = (Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => ({
    value: s,
    label: STATUS_LABELS[s],
  }));

  const PRIORITY_OPTIONS = (Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((p) => ({
    value: p,
    label: PRIORITY_LABELS[p],
  }));

  // ── Loading / error states ─────────────────────────────────────────────────

  if (isLoading) {
    return (
      <>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="h-5 w-32 bg-surface-elevated rounded animate-pulse" />
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'p-1.5 rounded text-text-muted',
              'hover:text-text-default hover:bg-surface-elevated',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
              'transition-colors'
            )}
            aria-label="Close"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <DetailSkeleton />
        </div>
      </>
    );
  }

  if (isError || !task) {
    return (
      <>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <span className="text-body-small text-text-muted">Task detail</span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded text-text-muted hover:text-text-default hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500 transition-colors"
            aria-label="Close"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center px-6">
          <AlertCircle size={48} className="text-error-400" aria-hidden="true" />
          <div>
            <h3 className="text-heading-3 text-text-default">Failed to load task</h3>
            <p className="text-body-small text-text-muted mt-1">
              The task could not be loaded. Try again.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className="px-4 py-2 rounded bg-accent-teal-500 text-white text-body-small font-medium hover:bg-accent-teal-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500"
          >
            Retry
          </button>
        </div>
      </>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const isSaving = updateMutation.isPending;

  return (
    <>
      {/* Header */}
      <div className="flex items-start gap-3 px-6 py-4 border-b border-border shrink-0">
        <div className="flex-1 min-w-0">
          <InlineText
            value={task.title}
            onSave={(title) => updateMutation.mutate({ title })}
            isSaving={isSaving}
            className="text-heading-3 text-text-default font-semibold leading-snug"
            ariaLabel="Task title"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          className={cn(
            'shrink-0 p-1.5 rounded text-text-muted',
            'hover:text-text-default hover:bg-surface-elevated',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
            'transition-colors'
          )}
          aria-label="Close task detail"
          data-testid="close-drawer"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">

        {/* Status + Priority badges */}
        <div className="flex flex-wrap items-center gap-3">
          <InlineSelect
            value={task.status}
            options={STATUS_OPTIONS}
            onSave={(status) => updateMutation.mutate({ status })}
            isSaving={isSaving}
            ariaLabel="Status"
            renderValue={(s) => (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-caption font-medium uppercase tracking-wide text-white"
                style={{ backgroundColor: STATUS_COLORS[s] }}
              >
                {STATUS_LABELS[s]}
              </span>
            )}
          />
          <InlineSelect
            value={task.priority}
            options={PRIORITY_OPTIONS}
            onSave={(priority) => updateMutation.mutate({ priority })}
            isSaving={isSaving}
            ariaLabel="Priority"
            renderValue={(p) => (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-caption font-medium uppercase tracking-wide text-white"
                style={{ backgroundColor: PRIORITY_COLORS[p] }}
              >
                <Flag size={10} className="mr-1" aria-hidden="true" />
                {PRIORITY_LABELS[p]}
              </span>
            )}
          />
        </div>

        {/* Metadata grid */}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
          {/* Assignee */}
          <div className="flex flex-col gap-0.5">
            <dt className="flex items-center gap-1 text-caption text-text-muted uppercase tracking-wide">
              <User size={11} aria-hidden="true" />
              Assignee
            </dt>
            <dd className="text-body-small text-text-default">
              {task.assigneeName ? (
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white shrink-0"
                    style={{
                      backgroundColor: getAvatarColor(task.assigneeName),
                      fontSize: '9px',
                      fontWeight: 600,
                    }}
                    role="img"
                    aria-label={task.assigneeName}
                  >
                    {getInitials(task.assigneeName)}
                  </span>
                  {task.assigneeName}
                </span>
              ) : (
                <span className="text-text-subtle italic">Unassigned</span>
              )}
            </dd>
          </div>

          {/* Status (text form for screen readers alongside badge) */}
          <div className="flex flex-col gap-0.5">
            <dt className="flex items-center gap-1 text-caption text-text-muted uppercase tracking-wide">
              <Activity size={11} aria-hidden="true" />
              Progress
            </dt>
            <dd className="text-body-small text-text-muted">
              {task.completedAt
                ? `Completed ${formatDate(task.completedAt)}`
                : task.status === 'in_progress'
                ? 'In progress'
                : STATUS_LABELS[task.status]}
            </dd>
          </div>

          {/* Start date */}
          <div className="flex flex-col gap-0.5">
            <dt className="flex items-center gap-1 text-caption text-text-muted uppercase tracking-wide">
              <Calendar size={11} aria-hidden="true" />
              Start date
            </dt>
            <dd>
              <InlineDate
                value={task.startDate}
                onSave={(startDate) => updateMutation.mutate({ startDate })}
                isSaving={isSaving}
                label="Start date"
              />
            </dd>
          </div>

          {/* Due date */}
          <div className="flex flex-col gap-0.5">
            <dt className="flex items-center gap-1 text-caption text-text-muted uppercase tracking-wide">
              <Calendar size={11} aria-hidden="true" />
              Due date
            </dt>
            <dd>
              <InlineDate
                value={task.dueDate}
                onSave={(dueDate) => updateMutation.mutate({ dueDate })}
                isSaving={isSaving}
                label="Due date"
              />
            </dd>
          </div>
        </dl>

        {/* Description */}
        <section aria-label="Description">
          <h3 className="text-label font-semibold text-text-default mb-1.5">Description</h3>
          <InlineText
            value={task.description}
            onSave={(description) => updateMutation.mutate({ description })}
            isSaving={isSaving}
            placeholder="No description. Click to add one."
            className="text-body text-text-default leading-relaxed whitespace-pre-wrap"
            as="textarea"
            ariaLabel="Task description"
          />
        </section>

        {/* Mark as Done */}
        {task.status !== 'done' && (
          <button
            type="button"
            onClick={() => updateMutation.mutate({ status: 'done' })}
            disabled={isSaving}
            className={cn(
              'flex items-center justify-center gap-2 w-full py-2 rounded',
              'bg-success-500/15 border border-success-500/40 text-success-400',
              'hover:bg-success-500/25 hover:border-success-500/60 transition-colors',
              'text-body-small font-medium',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-400',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            data-testid="mark-done-button"
            aria-label="Mark task as done"
          >
            {isSaving ? (
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
            ) : (
              <CheckCircle2 size={15} aria-hidden="true" />
            )}
            Mark as Done
          </button>
        )}

        {/* Divider */}
        <div className="border-t border-border" role="separator" />

        {/* Subtasks */}
        <SubtasksSection taskId={task.id} subtasks={task.subtasks} />

        {/* Divider */}
        <div className="border-t border-border" role="separator" />

        {/* Comments */}
        <CommentsSection taskId={task.id} comments={task.comments} />

        {/* Divider */}
        <div className="border-t border-border" role="separator" />

        {/* Dependencies */}
        <DependenciesSection
          taskId={task.id}
          dependsOn={task.dependsOn}
          blockedBy={task.blockedBy}
        />

        {/* Bottom padding */}
        <div className="pb-4" aria-hidden="true" />
      </div>
    </>
  );
}
