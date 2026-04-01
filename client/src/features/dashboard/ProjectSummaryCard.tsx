import React from 'react';
import { Link } from '@tanstack/react-router';
import { Layers } from 'lucide-react';
import type { ProjectSummary } from '@/lib/api/dashboard.api';

// ── Domain badge config ────────────────────────────────────────────────────────

const domainColors: Record<string, string> = {
  electromechanical: '#1F4E8C',
  bim: '#5A1F8C',
  software: '#1F5C3E',
  other: '#484F58',
};

const domainLabels: Record<string, string> = {
  electromechanical: 'Electromechanical',
  bim: 'BIM',
  software: 'Software',
  other: 'Other',
};

// ── Status badge config ────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  planning: '#484F58',
  active: '#1F6FEB',
  on_hold: '#D29922',
  completed: '#2EA043',
  cancelled: '#DA3633',
};

const statusLabels: Record<string, string> = {
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// ── Component ──────────────────────────────────────────────────────────────────

interface ProjectSummaryCardProps {
  project: ProjectSummary;
}

export function ProjectSummaryCard({ project }: ProjectSummaryCardProps) {
  const domainColor = domainColors[project.domain] ?? '#484F58';
  const domainLabel = domainLabels[project.domain] ?? project.domain;
  const statusColor = statusColors[project.status] ?? '#484F58';
  const statusLabel = statusLabels[project.status] ?? project.status;

  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: String(project.id) }}
      className="bg-surface-card border border-border rounded-lg p-4 hover:border-border-hover transition-colors block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-primary"
      data-testid={`project-card-${project.id}`}
    >
      {/* Badges row */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium leading-none uppercase tracking-wide text-white"
          style={{ backgroundColor: domainColor }}
        >
          {domainLabel}
        </span>
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium leading-none uppercase tracking-wide text-white"
          style={{ backgroundColor: statusColor }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Project name */}
      <p className="font-mono font-semibold text-text-default text-sm truncate mb-1">
        {project.name}
      </p>

      {/* Task count */}
      <div className="flex items-center gap-1 text-xs text-text-muted">
        <Layers size={11} aria-hidden="true" />
        <span>{project.taskCount} {project.taskCount === 1 ? 'task' : 'tasks'}</span>
      </div>
    </Link>
  );
}
