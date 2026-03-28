import React from 'react';
import { Users } from 'lucide-react';

// TODO (task #019): Implement team management page.
// Admin-only: list users, create/edit/deactivate accounts, assign roles.
// See API.md §Users for endpoint contracts.

export function TeamPage() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <Users size={48} className="text-neutral-600 mb-4" aria-hidden="true" />
      <h1 className="text-heading-3 text-text-default font-mono">Team</h1>
      <p className="text-small text-text-muted mt-2">Coming soon — see task #019</p>
    </div>
  );
}
