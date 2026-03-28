import React from 'react';
import { LayoutDashboard } from 'lucide-react';

// TODO (task #015): Implement full dashboard with stat cards, project cards,
// team workload chart, PPC trend chart, and Raphael briefing panel.
// See WIREFRAMES.md § A. Dashboard for layout and component specs.

export function DashboardPage() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <LayoutDashboard size={48} className="text-neutral-600 mb-4" aria-hidden="true" />
      <h1 className="text-heading-3 text-text-default font-mono">Dashboard</h1>
      <p className="text-small text-text-muted mt-2">Coming soon — see task #015</p>
    </div>
  );
}
