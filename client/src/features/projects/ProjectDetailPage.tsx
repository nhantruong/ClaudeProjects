'use client';
import React, { useState } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import * as Tabs from '@radix-ui/react-tabs';
import {
  ArrowLeftIcon,
  CalendarIcon,
  KanbanIcon,
  PencilIcon,
  AlertCircleIcon,
  Loader2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api/projects.api';
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

// ── Skeleton loader ────────────────────────────────────────────────────────────

function ProjectDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-label="Loading project details">
      <div className="h-6 w-32 bg-neutral-800 rounded" />
      <div className="h-8 w-2/3 bg-neutral-800 rounded" />
      <div className="flex gap-2">
        <div className="h-5 w-24 bg-neutral-800 rounded-badge" />
        <div className="h-5 w-16 bg-neutral-800 rounded-badge" />
      </div>
      <div className="h-16 bg-neutral-800 rounded" />
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
    return (
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <ProjectDetailSkeleton />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
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
          <Tabs.Trigger
            value="tasks"
            data-testid="tab-tasks"
            className={cn(
              'px-4 py-2.5 text-body text-text-muted',
              'border-b-2 border-transparent -mb-px',
              'hover:text-text-default transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
              'data-[state=active]:border-accent-teal-500 data-[state=active]:text-text-default'
            )}
          >
            Tasks
          </Tabs.Trigger>
          <Tabs.Trigger
            value="members"
            data-testid="tab-members"
            className={cn(
              'px-4 py-2.5 text-body text-text-muted',
              'border-b-2 border-transparent -mb-px',
              'hover:text-text-default transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
              'data-[state=active]:border-accent-teal-500 data-[state=active]:text-text-default'
            )}
          >
            Members
          </Tabs.Trigger>
        </Tabs.List>

        {/* Tasks tab — links to Kanban (implemented in task #012) */}
        <Tabs.Content value="tasks" data-testid="tab-content-tasks">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <KanbanIcon size={48} className="text-neutral-600 mb-4" aria-hidden="true" />
            <h3 className="text-heading-3 text-text-default mb-2">View tasks on the Kanban board</h3>
            <p className="text-small text-text-muted mb-5">
              Use the Kanban board to manage and update task status.
            </p>
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
          </div>
        </Tabs.Content>

        {/* Members tab */}
        <Tabs.Content value="members" data-testid="tab-content-members">
          <ProjectMembersPanel
            projectId={projectIdNum}
            members={project.members ?? []}
          />
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
  );
}
