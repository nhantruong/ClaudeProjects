import React from 'react';
import { format, addDays, subDays, isToday, startOfISOWeek } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WwpSummary } from '@/lib/api/lean.api';

// ── Props ──────────────────────────────────────────────────────────────────────

interface WwpWeekNavProps {
  currentWeekStart: Date;
  wwps: WwpSummary[];
  isCreating: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onCreateWwp: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function WwpWeekNav({
  currentWeekStart,
  wwps,
  isCreating,
  onPrevWeek,
  onNextWeek,
  onCreateWwp,
}: WwpWeekNavProps) {
  const weekEnd = addDays(currentWeekStart, 6);
  const isoCurrentWeekStart = startOfISOWeek(new Date());
  const isCurrentWeek =
    format(currentWeekStart, 'yyyy-MM-dd') ===
    format(isoCurrentWeekStart, 'yyyy-MM-dd');

  const weekKey = format(currentWeekStart, 'yyyy-MM-dd');
  const hasWwp = wwps.some((w) => w.weekStartDate === weekKey);

  const weekLabel = `${format(currentWeekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3">
      {/* Week navigation */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevWeek}
          className={cn(
            'p-1.5 rounded text-text-muted',
            'hover:text-text-default hover:bg-surface-elevated',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
            'transition-colors'
          )}
          aria-label="Previous week"
        >
          <ChevronLeftIcon size={18} aria-hidden="true" />
        </button>

        <div className="text-center min-w-[180px]">
          <p className="text-body font-medium text-text-default font-mono">
            {weekLabel}
          </p>
          {isCurrentWeek && (
            <p className="text-caption text-accent-teal-400 mt-0.5">Current week</p>
          )}
        </div>

        <button
          type="button"
          onClick={onNextWeek}
          className={cn(
            'p-1.5 rounded text-text-muted',
            'hover:text-text-default hover:bg-surface-elevated',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
            'transition-colors'
          )}
          aria-label="Next week"
        >
          <ChevronRightIcon size={18} aria-hidden="true" />
        </button>
      </div>

      {/* Create WWP button — only shown if no plan exists for this week */}
      {!hasWwp && (
        <button
          type="button"
          onClick={onCreateWwp}
          disabled={isCreating}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-label font-medium',
            'bg-accent-teal-500 hover:bg-accent-teal-600 text-white',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors'
          )}
          data-testid="create-wwp-button"
        >
          {isCreating ? (
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          ) : (
            <PlusIcon size={14} aria-hidden="true" />
          )}
          Create plan for this week
        </button>
      )}
    </div>
  );
}
