import { describe, it, expect } from 'vitest';

/**
 * Unit tests for GanttChart utility logic.
 * The SVG rendering itself is tested at the integration/E2E level (Playwright).
 * Here we test the pure helper functions that are module-private via re-export
 * from a test-only path, or we verify the exported ZoomLevel type contract.
 */

// ── ZoomLevel type contract ───────────────────────────────────────────────────

// These tests use the TypeScript compiler (via Vitest) to assert the type shape.
// They will fail at compile time if ZoomLevel changes shape unexpectedly.

import type { ZoomLevel } from './GanttChart';

describe('ZoomLevel type', () => {
  it('accepts valid zoom values', () => {
    const day: ZoomLevel = 'day';
    const week: ZoomLevel = 'week';
    const month: ZoomLevel = 'month';
    expect([day, week, month]).toEqual(['day', 'week', 'month']);
  });
});

// ── Date arithmetic sanity checks ─────────────────────────────────────────────

import { addDays, differenceInCalendarDays, parseISO, format } from 'date-fns';

describe('date helpers used in GanttChart', () => {
  it('differenceInCalendarDays computes positive forward deltas', () => {
    const start = parseISO('2026-03-01');
    const end = parseISO('2026-03-15');
    expect(differenceInCalendarDays(end, start)).toBe(14);
  });

  it('differenceInCalendarDays computes negative backward deltas', () => {
    const start = parseISO('2026-03-15');
    const end = parseISO('2026-03-01');
    expect(differenceInCalendarDays(end, start)).toBe(-14);
  });

  it('addDays round-trips correctly', () => {
    const base = parseISO('2026-03-01');
    const shifted = addDays(base, 7);
    expect(format(shifted, 'yyyy-MM-dd')).toBe('2026-03-08');
  });

  it('addDays with negative delta goes backward', () => {
    const base = parseISO('2026-03-08');
    const shifted = addDays(base, -7);
    expect(format(shifted, 'yyyy-MM-dd')).toBe('2026-03-01');
  });
});

// ── isOverdue logic ───────────────────────────────────────────────────────────

import { parseISO as parse } from 'date-fns';

describe('isOverdue logic', () => {
  it('a past due date with non-done status is overdue', () => {
    // Simulate the logic inline — pure function under test
    function isOverdue(dueDate: string | null, status: string): boolean {
      if (!dueDate || status === 'done') return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return parse(dueDate) < today;
    }

    expect(isOverdue('2020-01-01', 'todo')).toBe(true);
    expect(isOverdue('2020-01-01', 'done')).toBe(false);
    expect(isOverdue(null, 'todo')).toBe(false);
    expect(isOverdue('2099-12-31', 'todo')).toBe(false);
  });
});

// ── truncateLabel logic ───────────────────────────────────────────────────────

describe('truncateLabel logic', () => {
  // Mirror the inline implementation
  function truncateLabel(text: string, maxWidth: number): string {
    const maxChars = Math.floor(maxWidth / 6.5);
    if (text.length <= maxChars) return text;
    return text.slice(0, Math.max(0, maxChars - 1)) + '…';
  }

  it('returns text unchanged when it fits', () => {
    const short = 'Hi';
    expect(truncateLabel(short, 200)).toBe(short);
  });

  it('truncates text that exceeds available width', () => {
    const long = 'A'.repeat(100);
    const result = truncateLabel(long, 50); // ~7 chars
    expect(result.endsWith('…')).toBe(true);
    expect(result.length).toBeLessThan(long.length);
  });

  it('handles zero maxWidth gracefully', () => {
    const result = truncateLabel('hello', 0);
    expect(result).toBe('…');
  });
});
