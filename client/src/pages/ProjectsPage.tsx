'use client';
import React, { useState } from 'react';
import { FolderIcon, PlusIcon, AlertCircleIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api/projects.api';
import { useAuthStore } from '@/lib/stores/auth';
import { ProjectList } from '@/features/projects/ProjectList';
import { CreateProjectModal } from '@/features/projects/CreateProjectModal';
import { cn } from '@/lib/utils';

// ── Skeleton loader ────────────────────────────────────────────────────────────

function ProjectCardSkeleton() {
  return (
    <div
      className="bg-surface-card border border-border rounded-card p-5 space-y-3 animate-pulse"
      aria-hidden="true"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="h-5 w-28 bg-neutral-800 rounded-badge" />
        <div className="h-5 w-16 bg-neutral-800 rounded-badge" />
      </div>
      <div className="h-5 w-3/4 bg-neutral-800 rounded" />
      <div className="h-4 w-full bg-neutral-800 rounded" />
      <div className="h-4 w-2/3 bg-neutral-800 rounded" />
      <div className="pt-2 border-t border-border flex gap-4">
        <div className="h-3 w-16 bg-neutral-800 rounded" />
        <div className="h-3 w-20 bg-neutral-800 rounded" />
      </div>
    </div>
  );
}

function ProjectsLoadingSkeleton() {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      aria-label="Loading projects"
    >
      <ProjectCardSkeleton />
      <ProjectCardSkeleton />
      <ProjectCardSkeleton />
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ProjectsPage() {
  const user = useAuthStore((s) => s.user);
  const canCreate = user?.role === 'admin' || user?.role === 'manager';
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const projects = data?.projects ?? [];

  return (
    <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-heading-2 font-mono text-text-default">Projects</h1>
        {canCreate && (
          <button
            type="button"
            data-testid="new-project-button"
            onClick={() => setCreateModalOpen(true)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-body text-white font-medium',
              'bg-accent-teal-500 hover:bg-accent-teal-600',
              'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
              'min-h-[40px]'
            )}
          >
            <PlusIcon size={16} aria-hidden="true" />
            New Project
          </button>
        )}
      </div>

      {/* Loading state */}
      {isLoading && <ProjectsLoadingSkeleton />}

      {/* Error state */}
      {isError && !isLoading && (
        <div
          className="flex flex-col items-center justify-center py-16 text-center"
          role="alert"
        >
          <AlertCircleIcon size={48} className="text-error-400 mb-4" aria-hidden="true" />
          <h2 className="text-heading-3 text-text-default mb-2">Failed to load projects</h2>
          <p className="text-small text-text-muted mb-5">
            There was an error loading your projects. Please try again.
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
      )}

      {/* Empty state */}
      {!isLoading && !isError && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderIcon size={48} className="text-neutral-600 mb-4" aria-hidden="true" />
          <h2 className="text-heading-3 text-text-default mb-2">No projects yet</h2>
          <p className="text-small text-text-muted mb-5">
            {canCreate
              ? "Create your first project to get started."
              : "You haven't been assigned to any projects yet. Contact your admin."}
          </p>
          {canCreate && (
            <button
              type="button"
              data-testid="create-first-project-button"
              onClick={() => setCreateModalOpen(true)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-lg text-body text-white font-medium',
                'bg-accent-teal-500 hover:bg-accent-teal-600',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500'
              )}
            >
              <PlusIcon size={16} aria-hidden="true" />
              Create project
            </button>
          )}
        </div>
      )}

      {/* Project grid */}
      {!isLoading && !isError && projects.length > 0 && (
        <ProjectList projects={projects} />
      )}

      {/* Create project modal */}
      <CreateProjectModal open={createModalOpen} onOpenChange={setCreateModalOpen} />
    </div>
  );
}
