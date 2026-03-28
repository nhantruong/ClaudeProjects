import React from 'react';
import { FolderOpen } from 'lucide-react';

// TODO (task #011): Implement project list page with project cards grid,
// create project button (manager/admin), and project status filters.
// See WIREFRAMES.md for ProjectCard component spec.

export function ProjectsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <FolderOpen size={48} className="text-neutral-600 mb-4" aria-hidden="true" />
      <h1 className="text-heading-3 text-text-default font-mono">Projects</h1>
      <p className="text-small text-text-muted mt-2">Coming soon — see task #011</p>
    </div>
  );
}
