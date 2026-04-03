import type { RfiDiscipline, RfiPriority, RfiStatus } from '@/lib/api/rfi.api';

// ── Discipline color map ───────────────────────────────────────────────────────

export const DISCIPLINE_COLORS: Record<RfiDiscipline, { bg: string; text: string }> = {
  'Mechanical':       { bg: 'bg-info-500/20',    text: 'text-info-400' },
  'Electrical':       { bg: 'bg-warning-500/20', text: 'text-warning-400' },
  'Plumbing':         { bg: 'bg-success-500/20', text: 'text-success-400' },
  'Fire Protection':  { bg: 'bg-error-500/20',   text: 'text-error-400' },
  'Civil / Structural': { bg: 'bg-[#8250DF]/20', text: 'text-[#8250DF]' },
  'Architectural':    { bg: 'bg-[#0D9488]/20',   text: 'text-accent-teal-400' },
  'General':          { bg: 'bg-neutral-700/40', text: 'text-text-muted' },
};

// ── Status badge classes ───────────────────────────────────────────────────────

export const STATUS_BADGE: Record<RfiStatus, string> = {
  'Open':         'bg-info-500/20 text-info-400',
  'Under Review': 'bg-warning-500/20 text-warning-400',
  'Responded':    'bg-success-500/20 text-success-400',
  'Closed':       'bg-neutral-700/40 text-text-muted',
};

// ── Priority dot color ─────────────────────────────────────────────────────────

export const PRIORITY_DOT: Record<RfiPriority, string> = {
  'Low':    'bg-success-500',
  'Medium': 'bg-warning-400',
  'High':   'bg-[#E86B2A]',
  'Urgent': 'bg-error-400',
};

// ── SLA helpers ────────────────────────────────────────────────────────────────

export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

export function slaLabel(
  status: RfiStatus,
  requiredDate: string | null,
): { text: string; className: string } {
  if (status === 'Closed' || status === 'Responded') {
    return { text: 'Resolved', className: 'text-success-400' };
  }
  const days = daysUntil(requiredDate);
  if (days === null) return { text: '—', className: '' };
  if (days < 0)  return { text: `${Math.abs(days)}d overdue`,  className: 'text-error-400' };
  if (days <= 2) return { text: `${days}d left`,               className: 'text-warning-400' };
  return           { text: `${days}d remaining`,               className: 'text-success-400' };
}

export function formatRelativeDate(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)    return 'just now';
  if (mins < 60)   return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days < 30)   return `${days}d ago`;
  return new Date(isoString).toLocaleDateString();
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/[\s/]+/);
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
}
