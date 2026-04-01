import React, { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { AlertCircleIcon, GanttChartIcon, Loader2 } from 'lucide-react';
import { GanttChart, type ZoomLevel } from '@/features/gantt/GanttChart';
import { GanttToolbar } from '@/features/gantt/GanttToolbar';
import { UnscheduledTasks } from '@/features/gantt/UnscheduledTasks';
import { tasksApi } from '@/lib/api/tasks.api';
import { projectsApi } from '@/lib/api/projects.api';
import { cn } from '@/lib/utils';

export function GanttPage() {
  const { projectId } = useParams({ strict: false });
  const id = Number(projectId);

  const [zoom, setZoom] = useState<ZoomLevel>('week');

  // ── Project name ─────────────────────────────────────────────────────────────

  const { data: projectData } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id),
    enabled: !isNaN(id) && id > 0,
  });

  const projectName = projectData?.project.name;

  // ── Task list ─────────────────────────────────────────────────────────────────

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['tasks', id],
    queryFn: () => tasksApi.list(id),
    staleTime: 30_000,
    refetchInterval: 30_000,
    enabled: !isNaN(id) && id > 0,
  });

  const allTasks = data?.tasks ?? [];

  const scheduledTasks = allTasks.filter(
    (t) => t.startDate !== null && t.dueDate !== null
  );

  const unscheduledTasks = allTasks.filter(
    (t) => t.startDate === null || t.dueDate === null
  );

  // ── Invalid ID ────────────────────────────────────────────────────────────────

  if (isNaN(id) || id <= 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <GanttChartIcon size={48} className="text-neutral-600 mb-4" aria-hidden="true" />
        <h1 className="text-heading-3 text-text-default">Invalid project</h1>
        <p className="text-small text-text-muted mt-2">No project ID found in the URL.</p>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────────

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

  // ── Error ─────────────────────────────────────────────────────────────────────

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <AlertCircleIcon size={48} className="text-error-400" aria-hidden="true" />
        <div>
          <h3 className="text-heading-3 text-text-default">Failed to load tasks</h3>
          <p className="text-small text-text-muted mt-1">
            There was an error loading the Gantt chart data.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className={cn(
            'px-4 py-2 rounded-task-card text-small font-medium text-white',
            'bg-accent-teal-500 hover:bg-accent-teal-600 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500 focus-visible:ring-offset-2'
          )}
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────────

  if (allTasks.length === 0) {
    return (
      <div className="flex flex-col gap-4 h-full">
        <PageHeader projectName={projectName} zoom={zoom} onZoomChange={setZoom} />
        <div className="flex flex-col items-center justify-center flex-1 py-20 text-center">
          <GanttChartIcon
            size={48}
            className="text-neutral-600 mb-4"
            aria-hidden="true"
          />
          <h3 className="text-heading-3 text-text-default mb-2">
            No tasks on the timeline
          </h3>
          <p className="text-small text-text-muted">
            Create tasks with start and due dates to see them on the Gantt chart.
          </p>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 h-full">
      <PageHeader projectName={projectName} zoom={zoom} onZoomChange={setZoom} />

      {/* Chart area — horizontal scroll handled inside GanttChart */}
      <div className="flex-1 overflow-hidden rounded-card border border-border bg-surface-card">
        {scheduledTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <GanttChartIcon
              size={40}
              className="text-neutral-600 mb-3"
              aria-hidden="true"
            />
            <h3 className="text-heading-3 text-text-default mb-1">
              No scheduled tasks
            </h3>
            <p className="text-small text-text-muted">
              {unscheduledTasks.length} task
              {unscheduledTasks.length !== 1 ? 's' : ''} found but{' '}
              {unscheduledTasks.length !== 1 ? 'none have' : 'it has no'} start and
              due dates set.
            </p>
          </div>
        ) : (
          <GanttChart tasks={scheduledTasks} projectId={id} zoom={zoom} />
        )}
      </div>

      {/* Unscheduled section */}
      <UnscheduledTasks tasks={unscheduledTasks} />
    </div>
  );
}

// ── Page header sub-component ─────────────────────────────────────────────────

interface PageHeaderProps {
  projectName: string | undefined;
  zoom: ZoomLevel;
  onZoomChange: (z: ZoomLevel) => void;
}

function PageHeader({ projectName, zoom, onZoomChange }: PageHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <GanttChartIcon
          size={20}
          className="text-accent-teal-500 shrink-0"
          aria-hidden="true"
        />
        <div>
          <h1 className="text-heading-3 text-text-default">Gantt Chart</h1>
          {projectName && (
            <p className="text-small text-text-muted">{projectName}</p>
          )}
        </div>
      </div>

      <GanttToolbar zoom={zoom} onZoomChange={onZoomChange} />
    </header>
  );
}
