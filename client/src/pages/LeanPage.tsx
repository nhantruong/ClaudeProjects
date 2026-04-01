import React, { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfISOWeek, addDays, subDays } from 'date-fns';
import * as Tabs from '@radix-ui/react-tabs';
import {
  ClipboardListIcon,
  TrendingUpIcon,
  CalendarRangeIcon,
  AlertCircleIcon,
} from 'lucide-react';
import { leanApi } from '@/lib/api/lean.api';
import { WwpWeekNav } from '@/features/lean/WwpWeekNav';
import { WwpWeekView } from '@/features/lean/WwpWeekView';
import { CloseWeekButton } from '@/features/lean/CloseWeekButton';
import { PpcChart } from '@/features/lean/PpcChart';
import { LookaheadTable } from '@/features/lean/LookaheadTable';
import { cn } from '@/lib/utils';

// ── Skeleton ───────────────────────────────────────────────────────────────────

function LeanSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-label="Loading lean board">
      <div className="h-8 w-1/3 bg-neutral-800 rounded" />
      <div className="h-6 w-1/4 bg-neutral-800 rounded" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-neutral-800 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export function LeanPage() {
  const { projectId } = useParams({ strict: false });
  const id = Number(projectId);
  const queryClient = useQueryClient();

  // Default to current ISO week (Monday)
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() =>
    startOfISOWeek(new Date())
  );

  const weekKey = format(currentWeekStart, 'yyyy-MM-dd');

  // Load all WWPs list (for nav "has plan" check)
  const { data: wwpsData, isLoading: wwpsLoading } = useQuery({
    queryKey: ['wwps', id],
    queryFn: () => leanApi.listWwps(id),
    enabled: !isNaN(id) && id > 0,
  });

  const wwps = wwpsData?.wwps ?? [];

  // Find the WWP for the current week
  const currentWwp = wwps.find((w) => w.weekStartDate === weekKey);

  // Load full WWP detail when we have a weekId
  const { data: wwpDetailData, isLoading: wwpDetailLoading } = useQuery({
    queryKey: ['wwp', id, currentWwp?.id],
    queryFn: () => leanApi.getWwp(id, currentWwp!.id),
    enabled: currentWwp != null,
  });

  // Load PPC history
  const { data: ppcData } = useQuery({
    queryKey: ['ppc-history', id],
    queryFn: () => leanApi.getPpcHistory(id),
    enabled: !isNaN(id) && id > 0,
  });

  // Load lookahead tasks
  const { data: lookaheadData, isLoading: lookaheadLoading } = useQuery({
    queryKey: ['lookahead', id],
    queryFn: () => leanApi.getLookahead(id, 4),
    enabled: !isNaN(id) && id > 0,
  });

  // Create WWP mutation
  const createWwpMutation = useMutation({
    mutationFn: () => leanApi.createWwp(id, weekKey),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['wwps', id] });
    },
  });

  function handlePrevWeek() {
    setCurrentWeekStart((d) => subDays(d, 7));
  }

  function handleNextWeek() {
    setCurrentWeekStart((d) => addDays(d, 7));
  }

  if (isNaN(id) || id <= 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircleIcon size={48} className="text-error-400 mb-4" aria-hidden="true" />
        <h1 className="text-heading-3 text-text-default">Invalid project</h1>
        <p className="text-small text-text-muted mt-2">No valid project ID in the URL.</p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto">
      {/* Page header */}
      <header className="flex items-center gap-3 mb-6">
        <ClipboardListIcon
          size={22}
          className="text-accent-teal-500 shrink-0"
          aria-hidden="true"
        />
        <div>
          <h1 className="text-heading-2 font-mono text-text-default">
            Lean Construction
          </h1>
          <p className="text-small text-text-muted">
            Last Planner System — weekly planning, PPC tracking, lookahead
          </p>
        </div>
      </header>

      {/* Tabs */}
      <Tabs.Root defaultValue="weekly-plan">
        <Tabs.List
          className="flex border-b border-border mb-6 overflow-x-auto"
          aria-label="Lean construction sections"
        >
          {[
            { value: 'weekly-plan', label: 'Weekly Plan', icon: ClipboardListIcon },
            { value: 'ppc-trend', label: 'PPC Trend', icon: TrendingUpIcon },
            { value: 'lookahead', label: 'Lookahead', icon: CalendarRangeIcon },
          ].map(({ value, label, icon: Icon }) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-body text-text-muted whitespace-nowrap',
                'border-b-2 border-transparent -mb-px',
                'hover:text-text-default transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
                'data-[state=active]:border-accent-teal-500 data-[state=active]:text-text-default'
              )}
              data-testid={`lean-tab-${value}`}
            >
              <Icon size={15} aria-hidden="true" />
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* ── Weekly Plan tab ─────────────────────────────────────────────────── */}
        <Tabs.Content value="weekly-plan" data-testid="lean-content-weekly-plan">
          {/* Week navigation */}
          {wwpsLoading ? (
            <LeanSkeleton />
          ) : (
            <>
              <WwpWeekNav
                currentWeekStart={currentWeekStart}
                wwps={wwps}
                isCreating={createWwpMutation.isPending}
                onPrevWeek={handlePrevWeek}
                onNextWeek={handleNextWeek}
                onCreateWwp={() => createWwpMutation.mutate()}
              />

              {createWwpMutation.isError && (
                <p className="text-label text-error-400 mt-2" role="alert">
                  Failed to create plan. A plan for this week may already exist.
                </p>
              )}

              {/* WWP content */}
              {currentWwp == null ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-lg mt-4">
                  <ClipboardListIcon
                    size={48}
                    className="text-neutral-600 mb-4"
                    aria-hidden="true"
                  />
                  <p className="text-heading-3 text-text-default mb-2">
                    No plan for this week
                  </p>
                  <p className="text-small text-text-muted">
                    Create a weekly work plan to start adding task commitments.
                  </p>
                </div>
              ) : wwpDetailLoading ? (
                <div className="mt-4">
                  <LeanSkeleton />
                </div>
              ) : wwpDetailData ? (
                <div className="mt-4 space-y-6">
                  <WwpWeekView
                    projectId={id}
                    weekId={currentWwp.id}
                    tasks={wwpDetailData.wwp.tasks}
                    ppc={wwpDetailData.wwp.ppc}
                  />

                  {/* Close week section */}
                  <div className="pt-4 border-t border-border">
                    <h3 className="text-heading-4 text-text-default mb-3">
                      End-of-week close
                    </h3>
                    <p className="text-small text-text-muted mb-3">
                      Mark all tasks complete or provide variance reasons for incomplete
                      items, then close the week to calculate PPC.
                    </p>
                    <CloseWeekButton
                      projectId={id}
                      weekId={currentWwp.id}
                      isClosed={wwpDetailData.wwp.ppc !== null}
                    />
                  </div>
                </div>
              ) : null}
            </>
          )}
        </Tabs.Content>

        {/* ── PPC Trend tab ───────────────────────────────────────────────────── */}
        <Tabs.Content value="ppc-trend" data-testid="lean-content-ppc-trend">
          <PpcChart data={ppcData?.history ?? []} />
        </Tabs.Content>

        {/* ── Lookahead tab ───────────────────────────────────────────────────── */}
        <Tabs.Content value="lookahead" data-testid="lean-content-lookahead">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-heading-3 text-text-default">4-Week Lookahead</h2>
              <p className="text-small text-text-muted mt-0.5">
                Open tasks due in the next 4 weeks, grouped by week.
              </p>
            </div>
          </div>

          {lookaheadLoading ? (
            <LeanSkeleton />
          ) : (
            <LookaheadTable tasks={lookaheadData?.tasks ?? []} weeksCount={4} />
          )}
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
