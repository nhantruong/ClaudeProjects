/**
 * GanttChart — custom SVG implementation.
 *
 * Library decision: Custom SVG over frappe-gantt.
 * frappe-gantt has no first-party TypeScript types, its DOM manipulation model
 * conflicts with React's reconciler, and its styling hooks are too limited to
 * apply the Raphael design-system tokens (CSS custom properties). A custom SVG
 * chart gives full type safety, direct design-token access, and a controlled
 * drag implementation that integrates with TanStack Query mutations.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfMonth,
  format,
  isWeekend,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircleIcon } from 'lucide-react';
import { tasksApi } from '@/lib/api/tasks.api';
import type { Task } from '@/types';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ZoomLevel = 'day' | 'week' | 'month';

interface GanttChartProps {
  tasks: Task[];
  projectId: number;
  zoom: ZoomLevel;
}

interface ScheduledTask extends Task {
  startDate: string;
  dueDate: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const ROW_HEIGHT = 40;
const ROW_GAP = 8;
const ROW_STRIDE = ROW_HEIGHT + ROW_GAP;
const LABEL_WIDTH = 220;
const HEADER_HEIGHT = 56;
const MIN_BAR_WIDTH = 8;
const DRAG_THRESHOLD = 3; // px before drag starts
const HANDLE_WIDTH = 6; // resize handle width in px

// Column width per zoom level
const COL_WIDTH: Record<ZoomLevel, number> = {
  day: 32,
  week: 120,
  month: 80,
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'done') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parseISO(task.dueDate) < today;
}

function barColor(task: Task): string {
  if (task.status === 'done') return 'var(--color-success-500, #2EA043)';
  if (task.status === 'blocked') return 'var(--color-status-blocked, #DA3633)';
  if (isOverdue(task)) return 'var(--color-error-500, #DA3633)';
  if (task.status === 'in_progress') return 'var(--color-status-inprogress, #1F6FEB)';
  return 'var(--color-surface-elevated, #22272E)';
}

function barBorderColor(task: Task): string {
  if (task.status === 'blocked') return 'var(--color-status-blocked, #DA3633)';
  if (isOverdue(task)) return 'var(--color-error-400, #F85149)';
  if (task.status === 'in_progress') return 'var(--color-accent-teal-500, #14B8A6)';
  if (task.status === 'done') return 'var(--color-success-500, #2EA043)';
  return 'var(--color-border-default, #30363D)';
}

function barTextColor(task: Task): string {
  if (task.status === 'done') return '#FFFFFF';
  if (task.status === 'blocked' || isOverdue(task)) return '#FFFFFF';
  if (task.status === 'in_progress') return '#FFFFFF';
  return 'var(--color-text-default, #E6EDF3)';
}

// ── GanttChart component ───────────────────────────────────────────────────────

export function GanttChart({ tasks, projectId, zoom }: GanttChartProps) {
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // ── Drag state ──────────────────────────────────────────────────────────────

  const [dragState, setDragState] = useState<{
    taskId: number;
    mode: 'move' | 'resize-right' | 'resize-left';
    startX: number;
    origStartDate: string;
    origDueDate: string;
  } | null>(null);

  const [dragOffset, setDragOffset] = useState(0);
  const [dragError, setDragError] = useState<string | null>(null);

  // ── Filter scheduled tasks ──────────────────────────────────────────────────

  const scheduledTasks = useMemo(
    () =>
      tasks.filter(
        (t): t is ScheduledTask =>
          t.startDate !== null && t.dueDate !== null
      ),
    [tasks]
  );

  // ── Compute timeline bounds ─────────────────────────────────────────────────

  const { timelineStart, timelineEnd } = useMemo(() => {
    const today = new Date();

    if (scheduledTasks.length === 0) {
      const start = zoom === 'day'
        ? addDays(today, -7)
        : zoom === 'week'
        ? addWeeks(today, -2)
        : addMonths(today, -1);
      const end = zoom === 'day'
        ? addDays(today, 21)
        : zoom === 'week'
        ? addWeeks(today, 6)
        : addMonths(today, 3);
      return { timelineStart: start, timelineEnd: end };
    }

    const dates = scheduledTasks.flatMap((t) => [
      parseISO(t.startDate),
      parseISO(t.dueDate),
    ]);

    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    // Pad generously
    const padStart = zoom === 'day' ? 7 : zoom === 'week' ? 14 : 30;
    const padEnd = zoom === 'day' ? 14 : zoom === 'week' ? 21 : 45;

    return {
      timelineStart: addDays(minDate, -padStart),
      timelineEnd: addDays(maxDate, padEnd),
    };
  }, [scheduledTasks, zoom]);

  const totalDays = differenceInCalendarDays(timelineEnd, timelineStart) + 1;

  // ── Column units for the zoom level ────────────────────────────────────────

  const columnUnits = useMemo(() => {
    if (zoom === 'day') {
      return eachDayOfInterval({ start: timelineStart, end: timelineEnd });
    }
    if (zoom === 'week') {
      return eachWeekOfInterval(
        { start: timelineStart, end: timelineEnd },
        { weekStartsOn: 1 }
      );
    }
    // month
    return eachMonthOfInterval({ start: timelineStart, end: timelineEnd });
  }, [zoom, timelineStart, timelineEnd]);

  // ── X-axis helpers ──────────────────────────────────────────────────────────

  const dayToX = useCallback(
    (date: Date): number => {
      const dayIndex = differenceInCalendarDays(date, timelineStart);
      if (zoom === 'day') return dayIndex * COL_WIDTH.day;
      if (zoom === 'week') {
        const weekIndex = Math.floor(dayIndex / 7);
        const dayInWeek = dayIndex % 7;
        return weekIndex * COL_WIDTH.week + (dayInWeek / 7) * COL_WIDTH.week;
      }
      // month
      const monthStart = startOfMonth(date);
      const daysInMonth = eachDayOfInterval({
        start: monthStart,
        end: endOfMonth(date),
      }).length;
      const monthIndex = differenceInCalendarDays(monthStart, startOfMonth(timelineStart));
      const colIndex = Math.round(monthIndex / 30.44);
      const dayFraction = (date.getDate() - 1) / daysInMonth;
      return colIndex * COL_WIDTH.month + dayFraction * COL_WIDTH.month;
    },
    [zoom, timelineStart]
  );

  const xToDay = useCallback(
    (x: number): Date => {
      if (zoom === 'day') {
        const dayIndex = Math.round(x / COL_WIDTH.day);
        return addDays(timelineStart, dayIndex);
      }
      if (zoom === 'week') {
        const weekIndex = Math.floor(x / COL_WIDTH.week);
        const remainder = x % COL_WIDTH.week;
        const dayInWeek = Math.round((remainder / COL_WIDTH.week) * 7);
        return addDays(addWeeks(startOfWeek(timelineStart, { weekStartsOn: 1 }), weekIndex), dayInWeek);
      }
      // month
      const colIndex = Math.floor(x / COL_WIDTH.month);
      const fraction = (x % COL_WIDTH.month) / COL_WIDTH.month;
      const monthDate = addMonths(startOfMonth(timelineStart), colIndex);
      const daysInMonth = eachDayOfInterval({
        start: monthDate,
        end: endOfMonth(monthDate),
      }).length;
      return addDays(monthDate, Math.round(fraction * daysInMonth));
    },
    [zoom, timelineStart]
  );

  // ── Today x position ────────────────────────────────────────────────────────

  const todayX = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dayToX(today);
  }, [dayToX]);

  // ── Total SVG width ─────────────────────────────────────────────────────────

  const svgWidth = useMemo(() => {
    if (zoom === 'day') return totalDays * COL_WIDTH.day;
    if (zoom === 'week') return columnUnits.length * COL_WIDTH.week;
    return columnUnits.length * COL_WIDTH.month;
  }, [zoom, totalDays, columnUnits]);

  const svgHeight = HEADER_HEIGHT + scheduledTasks.length * ROW_STRIDE + 16;

  // ── Scroll today into view on mount / zoom change ───────────────────────────

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const targetX = todayX + LABEL_WIDTH - el.clientWidth / 2;
    el.scrollLeft = Math.max(0, targetX);
  }, [todayX, zoom]);

  // ── Dependency arrows ────────────────────────────────────────────────────────

  // Build arrow paths from task.dependsOn — but the list endpoint doesn't return
  // dependsOn. We derive a simplified version from same-project tasks whose IDs
  // appear in each other's list. Since the list endpoint doesn't include
  // dependency arrays, we skip arrows when data isn't available (detail endpoint
  // is per-task, expensive to batch here). The arrows data can be passed as prop
  // in a future iteration once bulk dependency data is available.
  //
  // For now, the arrows structure is prepared but left empty — the architecture
  // is in place for when bulk dependency data is piped in.

  const dependencyArrows: Array<{ fromIndex: number; toIndex: number }> = [];

  // ── Date-update mutation ────────────────────────────────────────────────────

  const updateDateMutation = useMutation({
    mutationFn: ({
      taskId,
      startDate,
      dueDate,
    }: {
      taskId: number;
      startDate: string;
      dueDate: string;
    }) => tasksApi.update(taskId, { startDate, dueDate }),

    onMutate: async ({ taskId, startDate, dueDate }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', projectId] });
      const snapshot = queryClient.getQueryData<{ tasks: Task[] }>(['tasks', projectId]);
      queryClient.setQueryData<{ tasks: Task[] }>(['tasks', projectId], (old) => {
        if (!old) return old;
        return {
          tasks: old.tasks.map((t) =>
            t.id === taskId ? { ...t, startDate, dueDate } : t
          ),
        };
      });
      return { snapshot };
    },

    onError: (_err, _vars, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(['tasks', projectId], context.snapshot);
      }
      setDragError('Failed to update task dates. Please try again.');
      setTimeout(() => setDragError(null), 4000);
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });

  // ── Mouse drag handlers ─────────────────────────────────────────────────────

  const handleBarMouseDown = useCallback(
    (
      e: React.MouseEvent,
      task: ScheduledTask,
      mode: 'move' | 'resize-right' | 'resize-left'
    ) => {
      e.preventDefault();
      e.stopPropagation();

      setDragState({
        taskId: task.id,
        mode,
        startX: e.clientX,
        origStartDate: task.startDate,
        origDueDate: task.dueDate,
      });
      setDragOffset(0);
    },
    []
  );

  useEffect(() => {
    if (!dragState) return;

    function onMouseMove(e: MouseEvent) {
      const dx = e.clientX - dragState!.startX;
      setDragOffset(dx);
    }

    function onMouseUp(e: MouseEvent) {
      const dx = e.clientX - dragState!.startX;

      if (Math.abs(dx) < DRAG_THRESHOLD) {
        setDragState(null);
        setDragOffset(0);
        return;
      }

      const { taskId, mode, origStartDate, origDueDate } = dragState!;

      const origStart = parseISO(origStartDate);
      const origEnd = parseISO(origDueDate);

      let newStart = origStart;
      let newEnd = origEnd;

      const snapDx = (x: number) => {
        // convert dx pixels to a new absolute x position for that date
        const origX = dayToX(origStart);
        return xToDay(origX + x);
      };
      const snapEndDx = (x: number) => {
        const origX = dayToX(origEnd);
        return xToDay(origX + x);
      };

      if (mode === 'move') {
        const delta = differenceInCalendarDays(snapDx(dx), origStart);
        newStart = addDays(origStart, delta);
        newEnd = addDays(origEnd, delta);
      } else if (mode === 'resize-right') {
        newEnd = snapEndDx(dx);
        if (newEnd <= newStart) newEnd = addDays(newStart, 1);
      } else if (mode === 'resize-left') {
        newStart = snapDx(dx);
        if (newStart >= newEnd) newStart = addDays(newEnd, -1);
      }

      updateDateMutation.mutate({
        taskId,
        startDate: format(newStart, 'yyyy-MM-dd'),
        dueDate: format(newEnd, 'yyyy-MM-dd'),
      });

      setDragState(null);
      setDragOffset(0);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragState, dayToX, xToDay, updateDateMutation]);

  // ── Render header tick labels ───────────────────────────────────────────────

  const headerTicks = useMemo((): Array<{ x: number; label: string }> => {
    return columnUnits.map((unit) => ({
      x: dayToX(unit),
      label:
        zoom === 'day'
          ? format(unit, 'd')
          : zoom === 'week'
          ? format(unit, 'MMM d')
          : format(unit, 'MMM yyyy'),
    }));
  }, [columnUnits, dayToX, zoom]);

  // Month sub-header for day zoom
  const monthBands = useMemo(() => {
    if (zoom !== 'day') return [];
    const months = eachMonthOfInterval({ start: timelineStart, end: timelineEnd });
    return months.map((m) => ({
      x: dayToX(m),
      label: format(m, 'MMM yyyy'),
    }));
  }, [zoom, timelineStart, timelineEnd, dayToX]);

  // ── Build bar rects for scheduled tasks ────────────────────────────────────

  const barRects = useMemo(() => {
    return scheduledTasks.map((task, index) => {
      const origStart = parseISO(task.startDate);
      const origEnd = parseISO(task.dueDate);

      let startX = dayToX(origStart);
      let endX = dayToX(origEnd) + (zoom === 'day' ? COL_WIDTH.day : 0);

      // Apply drag offset
      if (dragState && dragState.taskId === task.id) {
        const snappedDx = dragOffset;
        if (dragState.mode === 'move') {
          startX += snappedDx;
          endX += snappedDx;
        } else if (dragState.mode === 'resize-right') {
          endX += snappedDx;
          if (endX <= startX + MIN_BAR_WIDTH) endX = startX + MIN_BAR_WIDTH;
        } else if (dragState.mode === 'resize-left') {
          startX += snappedDx;
          if (startX >= endX - MIN_BAR_WIDTH) startX = endX - MIN_BAR_WIDTH;
        }
      }

      const barWidth = Math.max(endX - startX, MIN_BAR_WIDTH);
      const y = HEADER_HEIGHT + index * ROW_STRIDE + ROW_GAP / 2;

      return { task, startX, barWidth, y };
    });
  }, [scheduledTasks, dayToX, zoom, dragState, dragOffset]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="relative flex flex-col w-full" data-testid="gantt-chart">
      {/* Drag error toast */}
      {dragError && (
        <div
          role="alert"
          aria-live="assertive"
          className="absolute top-2 right-2 z-20 flex items-center gap-2 px-4 py-2 rounded-task-card bg-error-500 text-white text-small shadow-lg animate-fade-in"
        >
          <AlertCircleIcon size={14} aria-hidden="true" />
          {dragError}
        </div>
      )}

      {/* Outer flex: label panel + scrollable chart area */}
      <div className="flex w-full" style={{ minHeight: `${svgHeight}px` }}>
        {/* Fixed label column */}
        <div
          className="flex-shrink-0 border-r border-border bg-surface-sidebar"
          style={{ width: LABEL_WIDTH }}
        >
          {/* Label header spacer */}
          <div
            className="flex items-end px-3 pb-2 border-b border-border"
            style={{ height: HEADER_HEIGHT }}
          >
            <span className="text-label text-text-muted uppercase tracking-wide">
              Task
            </span>
          </div>

          {/* Label rows */}
          {scheduledTasks.map((task, index) => {
            const overdue = isOverdue(task);
            return (
              <div
                key={task.id}
                className="flex items-center gap-2 px-3"
                style={{ height: ROW_HEIGHT, marginTop: index === 0 ? ROW_GAP / 2 : ROW_GAP }}
                title={`${task.title}${task.assigneeName ? ` — ${task.assigneeName}` : ''}`}
              >
                {/* Priority dot */}
                <span
                  className="flex-shrink-0 w-2 h-2 rounded-full"
                  style={{ backgroundColor: priorityColor(task.priority) }}
                  aria-hidden="true"
                />
                {/* Title */}
                <span
                  className={cn(
                    'text-small truncate flex-1',
                    overdue ? 'text-error-400' : 'text-text-default'
                  )}
                >
                  {task.title}
                </span>
                {/* Assignee initials */}
                {task.assigneeName && (
                  <span
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-caption text-white font-medium"
                    style={{ backgroundColor: avatarColor(task.assigneeName) }}
                    aria-label={task.assigneeName}
                    title={task.assigneeName}
                  >
                    {getInitials(task.assigneeName)}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Scrollable SVG area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-x-auto overflow-y-hidden"
          style={{ cursor: dragState ? 'grabbing' : 'default' }}
        >
          <svg
            ref={svgRef}
            width={svgWidth}
            height={svgHeight}
            aria-label="Gantt chart timeline"
            role="img"
            style={{ display: 'block', userSelect: 'none' }}
          >
            {/* ── Background rows ──────────────────────────────────────────── */}
            {scheduledTasks.map((_, index) => {
              const y = HEADER_HEIGHT + index * ROW_STRIDE;
              return (
                <rect
                  key={index}
                  x={0}
                  y={y}
                  width={svgWidth}
                  height={ROW_HEIGHT + ROW_GAP}
                  fill={index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'}
                />
              );
            })}

            {/* ── Day/weekend highlights (day zoom only) ───────────────────── */}
            {zoom === 'day' &&
              eachDayOfInterval({ start: timelineStart, end: timelineEnd }).map(
                (day, i) => {
                  if (!isWeekend(day)) return null;
                  return (
                    <rect
                      key={i}
                      x={dayToX(day)}
                      y={HEADER_HEIGHT}
                      width={COL_WIDTH.day}
                      height={svgHeight - HEADER_HEIGHT}
                      fill="rgba(255,255,255,0.015)"
                    />
                  );
                }
              )}

            {/* ── Header ───────────────────────────────────────────────────── */}
            <rect
              x={0}
              y={0}
              width={svgWidth}
              height={HEADER_HEIGHT}
              fill="var(--color-surface-sidebar, #0D1117)"
            />

            {/* Month band sub-header (day zoom) */}
            {zoom === 'day' &&
              monthBands.map(({ x, label }) => (
                <text
                  key={label}
                  x={x + 4}
                  y={18}
                  fill="var(--color-text-muted, #8B949E)"
                  fontSize="11"
                  fontFamily="var(--font-mono, monospace)"
                >
                  {label}
                </text>
              ))}

            {/* Tick labels */}
            {headerTicks.map(({ x, label }) => (
              <text
                key={`${x}-${label}`}
                x={x + (zoom === 'day' ? COL_WIDTH.day / 2 : 4)}
                y={zoom === 'day' ? 40 : 28}
                fill="var(--color-text-muted, #8B949E)"
                fontSize="11"
                fontFamily="var(--font-mono, monospace)"
                textAnchor={zoom === 'day' ? 'middle' : 'start'}
              >
                {label}
              </text>
            ))}

            {/* Header bottom border */}
            <line
              x1={0}
              y1={HEADER_HEIGHT}
              x2={svgWidth}
              y2={HEADER_HEIGHT}
              stroke="var(--color-border-default, #30363D)"
              strokeWidth={1}
            />

            {/* ── Vertical grid lines ───────────────────────────────────────── */}
            {headerTicks.map(({ x }) => (
              <line
                key={x}
                x1={x}
                y1={HEADER_HEIGHT}
                x2={x}
                y2={svgHeight}
                stroke="var(--color-border-subtle, #21262D)"
                strokeWidth={1}
              />
            ))}

            {/* ── Dependency arrows ────────────────────────────────────────── */}
            {dependencyArrows.map(({ fromIndex, toIndex }, i) => {
              const from = barRects[fromIndex];
              const to = barRects[toIndex];
              if (!from || !to) return null;

              const x1 = from.startX + from.barWidth;
              const y1 = from.y + ROW_HEIGHT / 2;
              const x2 = to.startX;
              const y2 = to.y + ROW_HEIGHT / 2;

              const mid = (x1 + x2) / 2;

              return (
                <g key={i} aria-hidden="true">
                  <path
                    d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke="var(--color-border-hover, #484F58)"
                    strokeWidth={1.5}
                    markerEnd="url(#arrow)"
                  />
                </g>
              );
            })}

            {/* Arrow marker definition */}
            <defs>
              <marker
                id="arrow"
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L0,6 L8,3 z" fill="var(--color-border-hover, #484F58)" />
              </marker>
            </defs>

            {/* ── Task bars ─────────────────────────────────────────────────── */}
            {barRects.map(({ task, startX, barWidth, y }) => {
              const overdue = isOverdue(task);
              const isDragging = dragState?.taskId === task.id;
              const bg = barColor(task);
              const border = barBorderColor(task);
              const textClr = barTextColor(task);

              return (
                <g
                  key={task.id}
                  role="listitem"
                  aria-label={`${task.title}${task.assigneeName ? `, assigned to ${task.assigneeName}` : ''}${overdue ? ', overdue' : ''}`}
                >
                  {/* Main bar */}
                  <rect
                    x={startX + 1}
                    y={y + 4}
                    width={Math.max(barWidth - 2, MIN_BAR_WIDTH)}
                    height={ROW_HEIGHT - 8}
                    rx={4}
                    ry={4}
                    fill={bg}
                    stroke={border}
                    strokeWidth={isDragging ? 2 : 1}
                    opacity={isDragging ? 0.85 : 1}
                    style={{ cursor: 'grab' }}
                    onMouseDown={(e) =>
                      handleBarMouseDown(e, task as ScheduledTask, 'move')
                    }
                  />

                  {/* Overdue left accent stripe */}
                  {overdue && task.status !== 'done' && (
                    <rect
                      x={startX + 1}
                      y={y + 4}
                      width={4}
                      height={ROW_HEIGHT - 8}
                      rx={4}
                      ry={0}
                      fill="var(--color-error-400, #F85149)"
                    />
                  )}

                  {/* Bar label (title + assignee) */}
                  {barWidth > 32 && (
                    <text
                      x={startX + 8}
                      y={y + ROW_HEIGHT / 2 + 1}
                      fill={textClr}
                      fontSize="11"
                      fontFamily="var(--font-sans, sans-serif)"
                      dominantBaseline="middle"
                      style={{ pointerEvents: 'none' }}
                    >
                      <tspan>
                        {truncateLabel(
                          task.title +
                            (task.assigneeName ? ` · ${task.assigneeName}` : ''),
                          barWidth - 20
                        )}
                      </tspan>
                    </text>
                  )}

                  {/* Resize handle — left */}
                  {barWidth > 20 && (
                    <rect
                      x={startX + 1}
                      y={y + 4}
                      width={HANDLE_WIDTH}
                      height={ROW_HEIGHT - 8}
                      rx={4}
                      ry={4}
                      fill="transparent"
                      style={{ cursor: 'ew-resize' }}
                      onMouseDown={(e) =>
                        handleBarMouseDown(e, task as ScheduledTask, 'resize-left')
                      }
                    />
                  )}

                  {/* Resize handle — right */}
                  {barWidth > 20 && (
                    <rect
                      x={startX + barWidth - HANDLE_WIDTH - 1}
                      y={y + 4}
                      width={HANDLE_WIDTH}
                      height={ROW_HEIGHT - 8}
                      rx={4}
                      ry={4}
                      fill="transparent"
                      style={{ cursor: 'ew-resize' }}
                      onMouseDown={(e) =>
                        handleBarMouseDown(e, task as ScheduledTask, 'resize-right')
                      }
                    />
                  )}
                </g>
              );
            })}

            {/* ── Today marker ──────────────────────────────────────────────── */}
            {todayX >= 0 && todayX <= svgWidth && (
              <g aria-label="Today" role="img">
                <line
                  x1={todayX}
                  y1={0}
                  x2={todayX}
                  y2={svgHeight}
                  stroke="var(--color-accent-teal-500, #14B8A6)"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                />
                <rect
                  x={todayX - 18}
                  y={2}
                  width={36}
                  height={16}
                  rx={3}
                  fill="var(--color-accent-teal-500, #14B8A6)"
                />
                <text
                  x={todayX}
                  y={11}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#FFFFFF"
                  fontSize="10"
                  fontFamily="var(--font-mono, monospace)"
                  fontWeight="600"
                >
                  Today
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}

// ── Utility helpers ────────────────────────────────────────────────────────────

function truncateLabel(text: string, maxWidth: number): string {
  // Approximate: avg char width ~6.5px at 11px font
  const maxChars = Math.floor(maxWidth / 6.5);
  if (text.length <= maxChars) return text;
  return text.slice(0, Math.max(0, maxChars - 1)) + '…';
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? '?').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

const AVATAR_COLORS = [
  '#1F6FEB',
  '#2EA043',
  '#D29922',
  '#DA3633',
  '#8250DF',
  '#0D9488',
  '#E86B2A',
  '#6E7681',
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] ?? '#6E7681';
}

function priorityColor(priority: Task['priority']): string {
  switch (priority) {
    case 'critical': return '#DA3633';
    case 'high': return '#E86B2A';
    case 'normal': return '#8B949E';
    case 'low': return '#6E7681';
  }
}
