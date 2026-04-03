import React, { useState } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import * as Tabs from '@radix-ui/react-tabs';
import {
  ArrowLeftIcon,
  CalendarIcon,
  GanttChartIcon,
  KanbanIcon,
  ClipboardListIcon,
  FileTextIcon,
  PencilIcon,
  AlertCircleIcon,
  Loader2,
  ExternalLinkIcon,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api/projects.api';
import { rfiApi } from '@/lib/api/rfi.api';
import { useAuthStore } from '@/lib/stores/auth';
import { EditProjectModal } from './EditProjectModal';
import { ProjectMembersPanel } from './ProjectMembersPanel';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { ProjectDomain, ProjectStatus } from '@/types';

// ── Domain + status display maps ───────────────────────────────────────────────

const DOMAIN_COLORS: Record<ProjectDomain, string> = {
  electromechanical: '#1F4E8C',
  bim: '#5A1F8C',
  software: '#1F5C3E',
  other: '#484F58',
};

const DOMAIN_LABELS: Record<ProjectDomain, string> = {
  electromechanical: 'Electromechanical',
  bim: 'BIM',
  software: 'Software',
  other: 'Other',
};

const DOMAIN_GRADIENTS: Record<ProjectDomain, string> = {
  electromechanical: 'linear-gradient(135deg, #1F4E8C 0%, #0D9488 100%)',
  bim: 'linear-gradient(135deg, #5A1F8C 0%, #1F6FEB 100%)',
  software: 'linear-gradient(135deg, #1F5C3E 0%, #0D9488 100%)',
  other: 'linear-gradient(135deg, #30363D 0%, #484F58 100%)',
};

const STATUS_BG: Record<ProjectStatus, string> = {
  planning: '#484F58',
  active: '#1F6FEB',
  on_hold: '#D29922',
  completed: '#2EA043',
  cancelled: '#DA3633',
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const RFI_STATUS_COLORS: Record<string, string> = {
  'Open': '#1F6FEB',
  'Under Review': '#D29922',
  'Responded': '#2EA043',
  'Closed': '#484F58',
};

const RFI_PRIORITY_COLORS: Record<string, string> = {
  'Low': '#484F58',
  'Medium': '#1F6FEB',
  'High': '#D29922',
  'Urgent': '#DA3633',
};

// ── Skeleton loader ────────────────────────────────────────────────────────────

function ProjectDetailSkeleton() {
  return (
    <div className="animate-pulse" aria-label="Loading project details">
      <div className="w-full h-40 bg-neutral-800" />
      <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto space-y-4">
        <div className="h-6 w-32 bg-neutral-800 rounded" />
        <div className="h-8 w-2/3 bg-neutral-800 rounded" />
        <div className="flex gap-2">
          <div className="h-5 w-24 bg-neutral-800 rounded-badge" />
          <div className="h-5 w-16 bg-neutral-800 rounded-badge" />
        </div>
        <div className="h-16 bg-neutral-800 rounded" />
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ProjectDetailPage() {
  const { projectId } = useParams({ from: '/projects/$projectId' });
  const user = useAuthStore((s) => s.user);
  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  const [editModalOpen, setEditModalOpen] = useState(false);

  const projectIdNum = Number(projectId);

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['project', projectIdNum],
    queryFn: () => projectsApi.get(projectIdNum),
    enabled: !isNaN(projectIdNum),
  });

  const project = data?.project;

  if (isLoading) {
    return <ProjectDetailSkeleton />;
  }

  if (isError || !project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <AlertCircleIcon size={48} className="text-error-400 mb-4" aria-hidden="true" />
        <h2 className="text-heading-3 text-text-default mb-2">Failed to load project</h2>
        <p className="text-small text-text-muted mb-4">
          The project could not be loaded. It may not exist or you may not have access.
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className={cn(
            'px-4 py-2 rounded-lg text-body text-white font-medium',
            'bg-accent-teal-500 hover:bg-accent-teal-600',
            'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500'
          )}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Cover image banner */}
      {project.coverImageUrl ? (
        <img
          src={project.coverImageUrl}
          alt=""
          className="w-full h-44 object-cover"
          aria-hidden="true"
        />
      ) : (
        <div
          className="w-full h-44 flex items-center justify-center"
          style={{ background: DOMAIN_GRADIENTS[project.domain] }}
          aria-hidden="true"
        >
          <span className="text-white/20 text-8xl font-mono font-bold select-none">
            {DOMAIN_LABELS[project.domain][0]}
          </span>
        </div>
      )}

      <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto">
        {/* Back link */}
        <Link
          to="/projects"
          className={cn(
            'inline-flex items-center gap-1.5 text-small text-text-muted hover:text-text-default',
            'transition-colors mb-6',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500 rounded'
          )}
          data-testid="back-to-projects"
        >
          <ArrowLeftIcon size={14} aria-hidden="true" />
          All projects
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-badge text-label text-white font-medium uppercase tracking-wide"
                style={{ backgroundColor: DOMAIN_COLORS[project.domain] }}
              >
                {DOMAIN_LABELS[project.domain]}
              </span>
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-badge text-label text-white font-medium"
                style={{ backgroundColor: STATUS_BG[project.status] }}
              >
                {STATUS_LABELS[project.status]}
              </span>
            </div>

            {/* Name */}
            <h1 className="text-heading-2 font-mono text-text-default break-words">
              {project.name}
            </h1>

            {/* Description */}
            {project.description && (
              <p className="mt-2 text-body text-text-muted">{project.description}</p>
            )}

            {/* Dates */}
            {(project.startDate || project.endDate) && (
              <div className="flex flex-wrap items-center gap-4 mt-3">
                {project.startDate && (
                  <span className="flex items-center gap-1.5 text-small text-text-muted">
                    <CalendarIcon size={13} aria-hidden="true" />
                    <span>Start: {formatDate(project.startDate)}</span>
                  </span>
                )}
                {project.endDate && (
                  <span className="flex items-center gap-1.5 text-small text-text-muted">
                    <CalendarIcon size={13} aria-hidden="true" />
                    <span>End: {formatDate(project.endDate)}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Edit button */}
          {canEdit && (
            <button
              type="button"
              data-testid="edit-project-button"
              onClick={() => setEditModalOpen(true)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-label font-medium',
                'text-text-default border border-border hover:bg-surface-elevated',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
                'flex-shrink-0'
              )}
            >
              <PencilIcon size={14} aria-hidden="true" />
              Edit
            </button>
          )}
        </div>

        {/* Tabs */}
        <Tabs.Root defaultValue="tasks" className="mt-2">
          <Tabs.List
            className="flex border-b border-border mb-6"
            aria-label="Project sections"
          >
            {(['tasks', 'members', 'rfis'] as const).map((tab) => (
              <Tabs.Trigger
                key={tab}
                value={tab}
                data-testid={`tab-${tab}`}
                className={cn(
                  'px-4 py-2.5 text-body text-text-muted capitalize',
                  'border-b-2 border-transparent -mb-px',
                  'hover:text-text-default transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
                  'data-[state=active]:border-accent-teal-500 data-[state=active]:text-text-default'
                )}
              >
                {tab === 'rfis' ? 'RFIs' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {/* Tasks tab — links to Kanban and Gantt views */}
          <Tabs.Content value="tasks" data-testid="tab-content-tasks">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <KanbanIcon size={48} className="text-neutral-600 mb-4" aria-hidden="true" />
              <h3 className="text-heading-3 text-text-default mb-2">View project tasks</h3>
              <p className="text-small text-text-muted mb-5">
                Use the Kanban board to manage task status, or the Gantt chart to see the timeline.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/projects/$projectId/kanban"
                  params={{ projectId }}
                  data-testid="open-kanban-link"
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-body text-white font-medium',
                    'bg-accent-teal-500 hover:bg-accent-teal-600',
                    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500'
                  )}
                >
                  <KanbanIcon size={16} aria-hidden="true" />
                  Open Kanban board
                </Link>
                <Link
                  to="/projects/$projectId/gantt"
                  params={{ projectId }}
                  data-testid="open-gantt-link"
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-body font-medium',
                    'border border-border text-text-default',
                    'hover:bg-surface-elevated transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500'
                  )}
                >
                  <GanttChartIcon size={16} aria-hidden="true" />
                  Open Gantt chart
                </Link>
                <Link
                  to="/projects/$projectId/lean"
                  params={{ projectId }}
                  data-testid="open-lean-link"
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-body font-medium',
                    'border border-border text-text-default',
                    'hover:bg-surface-elevated transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500'
                  )}
                >
                  <ClipboardListIcon size={16} aria-hidden="true" />
                  Open Lean board
                </Link>
              </div>
            </div>
          </Tabs.Content>

          {/* Members tab */}
          <Tabs.Content value="members" data-testid="tab-content-members">
            <ProjectMembersPanel
              projectId={projectIdNum}
              members={project.members ?? []}
            />
          </Tabs.Content>

          {/* RFIs tab */}
          <Tabs.Content value="rfis" data-testid="tab-content-rfis">
            <RfisTabContent projectId={projectIdNum} projectIdStr={projectId} />
          </Tabs.Content>
        </Tabs.Root>

        {/* Edit modal */}
        {editModalOpen && (
          <EditProjectModal
            project={project}
            open={editModalOpen}
            onOpenChange={setEditModalOpen}
          />
        )}
      </div>
    </div>
  );
}

// ── RFIs Tab Content ───────────────────────────────────────────────────────────

function RfisTabContent({ projectId, projectIdStr }: { projectId: number; projectIdStr: string }) {
  const { data: rfisData, isLoading: rfisLoading } = useQuery({
    queryKey: ['rfis', projectId],
    queryFn: () => rfiApi.list(projectId),
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['rfi-stats', projectId],
    queryFn: () => rfiApi.stats(projectId),
  });

  const rfis = rfisData?.rfis ?? [];
  const stats = statsData?.stats;

  return (
    <div className="space-y-5">
      {/* Stats chips */}
      {(statsLoading || stats) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-surface-card border border-border rounded-lg animate-pulse" />
            ))
          ) : stats ? (
            <>
              <StatChip label="Total" value={stats.total} color="#8B949E" />
              <StatChip label="Open" value={stats.open} color="#1F6FEB" />
              <StatChip label="Overdue" value={stats.overdue} color="#DA3633" />
              <StatChip label="Avg Response" value={stats.avgResponseDays != null ? `${stats.avgResponseDays}d` : '—'} color="#D29922" />
            </>
          ) : null}
        </div>
      )}

      {/* Open to full RFI manager */}
      <div className="flex items-center justify-between">
        <h3 className="text-heading-3 font-sans text-text-default">
          RFI List <span className="text-text-muted font-normal text-body">({rfis.length})</span>
        </h3>
        <Link
          to="/projects/$projectId/rfis"
          params={{ projectId: projectIdStr }}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-label font-medium',
            'text-accent-teal-400 border border-border hover:bg-surface-elevated',
            'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500'
          )}
        >
          <ExternalLinkIcon size={13} aria-hidden="true" />
          Open RFI Manager
        </Link>
      </div>

      {/* RFI table */}
      {rfisLoading ? (
        <div className="space-y-2 animate-pulse">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 bg-surface-card border border-border rounded-lg" />
          ))}
        </div>
      ) : rfis.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileTextIcon size={40} className="text-neutral-600 mb-3" aria-hidden="true" />
          <p className="text-text-muted text-sm">No RFIs for this project yet.</p>
          <Link
            to="/projects/$projectId/rfis"
            params={{ projectId: projectIdStr }}
            className="mt-3 text-sm text-accent-teal-400 hover:underline"
          >
            Open RFI Manager to create one
          </Link>
        </div>
      ) : (
        <div className="bg-surface-card border border-border rounded-lg overflow-hidden">
          <div className="hidden sm:grid grid-cols-[80px_1fr_130px_80px_100px_90px] gap-3 px-4 py-2.5 border-b border-border bg-surface-elevated text-xs font-medium text-text-muted uppercase tracking-wide">
            <div>#</div>
            <div>Title</div>
            <div>Discipline</div>
            <div>Priority</div>
            <div>Status</div>
            <div>Due</div>
          </div>
          <div className="divide-y divide-border">
            {rfis.map((rfi) => (
              <div
                key={rfi.id}
                className="grid grid-cols-1 sm:grid-cols-[80px_1fr_130px_80px_100px_90px] gap-1 sm:gap-3 px-4 py-3 text-sm hover:bg-surface-elevated/40 transition-colors"
              >
                <div className="font-mono text-text-muted text-xs">{rfi.rfiNumber}</div>
                <div className="text-text-default font-medium truncate">{rfi.title}</div>
                <div className="text-text-muted text-xs">{rfi.discipline}</div>
                <div>
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase text-white"
                    style={{ backgroundColor: RFI_PRIORITY_COLORS[rfi.priority] ?? '#484F58' }}
                  >
                    {rfi.priority}
                  </span>
                </div>
                <div>
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold text-white"
                    style={{ backgroundColor: RFI_STATUS_COLORS[rfi.status] ?? '#484F58' }}
                  >
                    {rfi.status}
                  </span>
                </div>
                <div className="text-text-muted text-xs">
                  {rfi.requiredDate ? formatDate(rfi.requiredDate) : '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatChip({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-surface-card border border-border rounded-lg px-4 py-3">
      <p className="text-caption text-text-muted mb-1">{label}</p>
      <p className="text-heading-3 font-mono font-semibold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
