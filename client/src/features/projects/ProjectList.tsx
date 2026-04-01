import React from 'react';
import { ProjectCard } from './ProjectCard';
import type { ProjectWithCounts } from '@/lib/api/projects.api';

interface ProjectListProps {
  projects: ProjectWithCounts[];
}

export function ProjectList({ projects }: ProjectListProps) {
  return (
    <ul
      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      aria-label="Projects"
    >
      {projects.map((project) => (
        <li key={project.id}>
          <ProjectCard project={project} />
        </li>
      ))}
    </ul>
  );
}
