import React from 'react';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  variant: 'default' | 'warning' | 'danger' | 'success';
}

// ── Variant config ─────────────────────────────────────────────────────────────

const variantClasses: Record<StatCardProps['variant'], string> = {
  default: 'bg-accent-teal-500/10 text-accent-teal-400',
  warning: 'bg-warning-500/10 text-warning-400',
  danger: 'bg-error-500/10 text-error-400',
  success: 'bg-success-500/10 text-success-400',
};

// ── Component ──────────────────────────────────────────────────────────────────

export function StatCard({ label, value, icon: Icon, variant }: StatCardProps) {
  return (
    <div className="bg-surface-card border border-border rounded-lg p-5 flex items-start gap-4">
      <div
        className={cn(
          'flex items-center justify-center w-10 h-10 rounded-full shrink-0',
          variantClasses[variant]
        )}
        aria-hidden="true"
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p
          className="text-3xl font-bold font-mono text-text-default leading-none"
          data-testid={`stat-value-${label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {value}
        </p>
        <p className="text-sm text-text-muted mt-1">{label}</p>
      </div>
    </div>
  );
}
