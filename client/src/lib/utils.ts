import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';

/**
 * Merge Tailwind classes safely — clsx for conditionals, twMerge for deduplication.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format an ISO date string or Date object as a short human-readable date.
 * e.g. "28 Mar 2026"
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'd MMM yyyy');
}

/**
 * Format an ISO date string as a short date without year (for compact display).
 * e.g. "Mar 31"
 */
export function formatShortDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d');
}

/**
 * Format a date as relative time from now.
 * e.g. "2 days ago", "in 3 hours"
 */
export function formatRelativeDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Return true if the given ISO date string is strictly before today (UTC).
 */
export function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return parseISO(dueDate) < today;
}

/**
 * Derive two-letter initials from a display name.
 * "Raphael Advisor" → "RA", "Raphael" → "R"
 */
export function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0][0] ?? '?').toUpperCase();
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase();
}
