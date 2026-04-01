import React from 'react';
import { CalendarDaysIcon, CalendarIcon, LayoutGridIcon } from 'lucide-react';
import type { ZoomLevel } from './GanttChart';
import { cn } from '@/lib/utils';

interface GanttToolbarProps {
  zoom: ZoomLevel;
  onZoomChange: (zoom: ZoomLevel) => void;
}

const ZOOM_OPTIONS: Array<{ value: ZoomLevel; label: string; icon: React.ReactNode }> = [
  {
    value: 'day',
    label: 'Day',
    icon: <CalendarDaysIcon size={14} aria-hidden="true" />,
  },
  {
    value: 'week',
    label: 'Week',
    icon: <CalendarIcon size={14} aria-hidden="true" />,
  },
  {
    value: 'month',
    label: 'Month',
    icon: <LayoutGridIcon size={14} aria-hidden="true" />,
  },
];

export function GanttToolbar({ zoom, onZoomChange }: GanttToolbarProps) {
  return (
    <div
      className="flex items-center gap-1 p-1 rounded-lg border border-border bg-surface-card"
      role="group"
      aria-label="Gantt zoom level"
      data-testid="gantt-toolbar"
    >
      {ZOOM_OPTIONS.map(({ value, label, icon }) => (
        <button
          key={value}
          type="button"
          data-testid={`zoom-${value}`}
          onClick={() => onZoomChange(value)}
          aria-pressed={zoom === value}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-small font-medium',
            'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
            zoom === value
              ? 'bg-accent-teal-500 text-white'
              : 'text-text-muted hover:text-text-default hover:bg-surface-elevated'
          )}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  );
}
