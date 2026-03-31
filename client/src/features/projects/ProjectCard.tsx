import React from 'react';
import { Link } from '@tanstack/react-router';
import { CalendarIcon, CheckSquareIcon, UsersIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import type { ProjectWithCounts } from '@/lib/api/projects.api';
import type { ProjectDomain, ProjectStatus } from '@/types';

// ── Domain badge ───────────────────────────────────────────────────────────────

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

// ── Status badge ───────────────────────────────────────────────────────────────

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

// ── Component ──────────────────────────────────────────────────────────────────

interface ProjectCardProps {
  project: ProjectWithCounts;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: String(project.id) }}
      data-testid={`project-card-${project.id}`}
      className={cn(
        'block bg-surface-card border border-border rounded-card p-5',
        'hover:border-border-hover hover:bg-surface-hover',
        'transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500'
      )}
    >
      {/* Top row: domain badge + status badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
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

      {/* Project name */}
      <h3 className="text-heading-3 font-mono text-text-default mb-2 leading-snug line-clamp-2">
        {project.name}
      </h3>

      {/* Description */}
      {project.description && (
        <p className="text-small text-text-muted mb-4 line-clamp-2">{project.description}</p>
      )}

      {/* Bottom row: task count, member count, end date */}
      <div className="flex items-center gap-4 mt-auto pt-3 border-t border-border">
        <span className="flex items-center gap-1 text-caption text-text-muted">
          <CheckSquareIcon size={12} aria-hidden="true" />
          <span>{project.taskCount} tasks</span>
        </span>
        <span className="flex items-center gap-1 text-caption text-text-muted">
          <UsersIcon size={12} aria-hidden="true" />
          <span>{project.memberCount} members</span>
        </span>
        {project.endDate && (
          <span className="flex items-center gap-1 text-caption text-text-muted ml-auto">
            <CalendarIcon size={12} aria-hidden="true" />
            <span>{formatDate(project.endDate)}</span>
          </span>
        )}
      </div>
    </Link>
  );
}
