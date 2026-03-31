import React from 'react';
import { BrainCircuit } from 'lucide-react';

// ── Component ──────────────────────────────────────────────────────────────────

export function RaphaelBriefingPanel() {
  return (
    <div className="bg-surface-card border border-border rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4">
        <BrainCircuit size={16} className="text-accent-teal-400" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-text-default">Raphael's Briefing</h2>
      </div>
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <BrainCircuit size={40} className="text-neutral-600 mb-3" aria-hidden="true" />
        <p className="text-sm font-medium text-text-muted">AI Advisor Coming Soon</p>
        <p className="text-xs text-text-subtle mt-1">
          Raphael will analyse your projects and surface daily priorities once the advisor API is
          online.
        </p>
      </div>
    </div>
  );
}
