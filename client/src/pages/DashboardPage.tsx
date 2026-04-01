import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CalendarClock, CheckCircle2, FolderOpen } from 'lucide-react';
import { dashboardApi } from '@/lib/api/dashboard.api';
import { StatCard } from '@/features/dashboard/StatCard';
import { ProjectSummaryCard } from '@/features/dashboard/ProjectSummaryCard';
import { WorkloadWidget } from '@/features/dashboard/WorkloadWidget';
import { PpcTrendChart } from '@/features/dashboard/PpcTrendChart';
import { RaphaelBriefingPanel } from '@/features/dashboard/RaphaelBriefingPanel';

// ── Page ───────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.getSummary,
    refetchInterval: 30_000,
  });

  if (isLoading) return <DashboardSkeleton />;

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center gap-4">
        <p className="text-text-muted">Failed to load dashboard.</p>
        <button
          onClick={() => void refetch()}
          className="text-sm text-accent-teal-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500 rounded"
          data-testid="dashboard-retry"
        >
          Retry
        </button>
      </div>
    );
  }

  const { projects, stats, workload, ppcTrend } = data;

  const visibleProjects = projects.filter(
    (p) => p.status === 'active' || p.status === 'planning'
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-mono text-text-default">Dashboard</h1>
        <p className="text-text-muted text-sm mt-1">Your project command center</p>
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Due Today"
          value={stats.dueToday}
          icon={CalendarClock}
          variant="warning"
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          icon={AlertTriangle}
          variant="danger"
        />
        <StatCard
          label="Completed This Week"
          value={stats.completedThisWeek}
          icon={CheckCircle2}
          variant="success"
        />
      </div>

      {/* Main 2-column grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left 2/3 — projects + PPC chart */}
        <div className="xl:col-span-2 space-y-6">
          {/* Active projects section */}
          <section aria-labelledby="active-projects-heading">
            <h2
              id="active-projects-heading"
              className="text-sm font-semibold text-text-default mb-3 flex items-center gap-2"
            >
              <FolderOpen size={14} className="text-text-muted" aria-hidden="true" />
              Active Projects
            </h2>

            {visibleProjects.length === 0 ? (
              <div className="bg-surface-card border border-border rounded-lg p-8 text-center">
                <FolderOpen
                  size={40}
                  className="text-neutral-600 mx-auto mb-3"
                  aria-hidden="true"
                />
                <p className="text-text-muted text-sm">No active projects yet.</p>
              </div>
            ) : (
              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                data-testid="projects-grid"
              >
                {visibleProjects.map((p) => (
                  <ProjectSummaryCard key={p.id} project={p} />
                ))}
              </div>
            )}
          </section>

          <PpcTrendChart data={ppcTrend} />
        </div>

        {/* Right 1/3 — workload + advisor */}
        <div className="space-y-6">
          <WorkloadWidget workload={workload} />
          <RaphaelBriefingPanel />
        </div>
      </div>
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div
      className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse"
      aria-label="Loading dashboard"
      aria-busy="true"
    >
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 bg-surface-card rounded" />
        <div className="h-4 w-56 bg-surface-card rounded" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 bg-surface-card border border-border rounded-lg" />
        ))}
      </div>

      {/* Main grid skeleton */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-surface-card border border-border rounded-lg" />
            ))}
          </div>
          <div className="h-52 bg-surface-card border border-border rounded-lg" />
        </div>
        <div className="space-y-4">
          <div className="h-48 bg-surface-card border border-border rounded-lg" />
          <div className="h-48 bg-surface-card border border-border rounded-lg" />
        </div>
      </div>
    </div>
  );
}
