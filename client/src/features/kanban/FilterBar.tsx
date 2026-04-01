import React, { useState } from 'react';
import { X, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ListTasksParams } from '@/lib/api/tasks.api';
import type { TaskPriority } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FilterBarProps {
  onFilterChange: (filters: ListTasksParams) => void;
  members?: Array<{ userId: number; displayName: string }>;
}

// ── Priority toggle chips ──────────────────────────────────────────────────────

const PRIORITIES: Array<{ value: TaskPriority; label: string; color: string }> = [
  { value: 'critical', label: 'Critical', color: '#DA3633' },
  { value: 'high', label: 'High', color: '#E86B2A' },
  { value: 'normal', label: 'Normal', color: '#8B949E' },
  { value: 'low', label: 'Low', color: '#6E7681' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function FilterBar({ onFilterChange, members = [] }: FilterBarProps) {
  const [assigneeId, setAssigneeId] = useState<number | undefined>(undefined);
  const [selectedPriority, setSelectedPriority] = useState<TaskPriority | undefined>(undefined);

  const hasFilters = assigneeId !== undefined || selectedPriority !== undefined;

  function handleAssigneeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value === '' ? undefined : Number(e.target.value);
    setAssigneeId(value);
    onFilterChange({ assigneeId: value, priority: selectedPriority });
  }

  function handlePriorityToggle(priority: TaskPriority) {
    const next = selectedPriority === priority ? undefined : priority;
    setSelectedPriority(next);
    onFilterChange({ assigneeId, priority: next });
  }

  function handleClear() {
    setAssigneeId(undefined);
    setSelectedPriority(undefined);
    onFilterChange({});
  }

  return (
    <div
      className="flex flex-wrap items-center gap-3 py-2"
      role="search"
      aria-label="Filter tasks"
      data-testid="filter-bar"
    >
      {/* Filter icon */}
      <SlidersHorizontal
        size={16}
        className="text-text-muted shrink-0"
        aria-hidden="true"
      />

      {/* Assignee filter */}
      {members.length > 0 && (
        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-assignee"
            className="text-label text-text-muted whitespace-nowrap"
          >
            Assignee
          </label>
          <select
            id="filter-assignee"
            value={assigneeId ?? ''}
            onChange={handleAssigneeChange}
            className={cn(
              'rounded-task-card bg-surface-elevated border border-border px-2 py-1',
              'text-small text-text-default',
              'focus:outline-none focus:ring-2 focus:ring-accent-teal-500 focus:border-transparent',
              'cursor-pointer'
            )}
          >
            <option value="">All members</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.displayName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Priority filter — toggle chips */}
      <div
        className="flex items-center gap-1.5"
        role="group"
        aria-label="Filter by priority"
      >
        {PRIORITIES.map(({ value, label, color }) => {
          const isActive = selectedPriority === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => handlePriorityToggle(value)}
              className={cn(
                'px-2 py-0.5 rounded-badge text-label font-medium uppercase tracking-wide',
                'border transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
                isActive
                  ? 'text-white border-transparent'
                  : 'text-text-muted border-border hover:border-border-hover hover:text-text-default'
              )}
              style={isActive ? { backgroundColor: color } : undefined}
              aria-pressed={isActive}
              aria-label={`${isActive ? 'Remove' : 'Apply'} ${label} priority filter`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Clear filters */}
      {hasFilters && (
        <button
          type="button"
          onClick={handleClear}
          className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded-task-card text-small',
            'text-text-muted border border-border',
            'hover:text-text-default hover:border-border-hover',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
            'transition-colors duration-150'
          )}
          aria-label="Clear all filters"
          data-testid="clear-filters"
        >
          <X size={12} aria-hidden="true" />
          Clear
        </button>
      )}
    </div>
  );
}
