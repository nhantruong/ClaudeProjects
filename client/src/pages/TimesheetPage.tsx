import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Tabs from '@radix-ui/react-tabs';
import {
  PlusIcon,
  Trash2Icon,
  PencilIcon,
  Loader2,
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
} from 'lucide-react';
import { z } from 'zod';
import { timesheetApi } from '@/lib/api/timesheet.api';
import type { TimesheetEntry, CreateTimesheetInput, UpdateTimesheetInput } from '@/lib/api/timesheet.api';
import { projectsApi } from '@/lib/api/projects.api';
import { cn, formatDate } from '@/lib/utils';

// ── Helpers ────────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function totalHours(rows: Array<{ hours: number }>) {
  return rows.reduce((sum, r) => sum + r.hours, 0);
}

// ── Entry form ─────────────────────────────────────────────────────────────────

const entrySchema = z.object({
  projectId: z.number({ invalid_type_error: 'Project is required' }).int().positive('Project is required'),
  entryDate: z.string().min(1, 'Date is required'),
  hours: z.number({ invalid_type_error: 'Hours required' }).min(0.25, 'Min 0.25h').max(24, 'Max 24h'),
  description: z.string().optional(),
});

interface EntryFormProps {
  projects: Array<{ id: number; name: string }>;
  entry?: TimesheetEntry;
  onSave: () => void;
  onCancel: () => void;
}

function EntryForm({ projects, entry, onSave, onCancel }: EntryFormProps) {
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useState<string>(entry ? String(entry.projectId) : '');
  const [entryDate, setEntryDate] = useState(entry?.entryDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [hours, setHours] = useState(entry ? String(entry.hours) : '');
  const [description, setDescription] = useState(entry?.description ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: CreateTimesheetInput) => timesheetApi.createEntry(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['timesheet'] });
      onSave();
    },
    onError: () => setServerError('Failed to save entry. Please try again.'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateTimesheetInput) => timesheetApi.updateEntry(entry!.id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['timesheet'] });
      onSave();
    },
    onError: () => setServerError('Failed to update entry. Please try again.'),
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    const result = entrySchema.safeParse({
      projectId: projectId ? Number(projectId) : undefined,
      entryDate,
      hours: hours ? Number(hours) : undefined,
      description: description || undefined,
    });

    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        if (!errs[key]) errs[key] = issue.message;
      }
      setErrors(errs);
      return;
    }

    setErrors({});
    if (entry) {
      updateMutation.mutate({
        hours: result.data.hours,
        description: result.data.description ?? null,
        entryDate: result.data.entryDate,
      });
    } else {
      createMutation.mutate({
        projectId: result.data.projectId,
        entryDate: result.data.entryDate,
        hours: result.data.hours,
        description: result.data.description,
      });
    }
  }

  const inputCls = (err?: string) => cn(
    'w-full bg-surface-primary border rounded-lg px-3 py-2 text-body text-text-default',
    'placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent-teal-500 focus:border-transparent',
    'transition-colors disabled:opacity-50',
    err ? 'border-error-500' : 'border-border'
  );
  const labelCls = 'block text-label text-text-muted mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="bg-surface-card border border-border rounded-lg p-5 space-y-4">
      <h3 className="text-heading-3 font-sans text-text-default">
        {entry ? 'Edit Entry' : 'New Entry'}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Project */}
        <div>
          <label htmlFor="ts-project" className={labelCls}>
            Project <span className="text-error-400">*</span>
          </label>
          <select
            id="ts-project"
            value={projectId}
            onChange={(e) => { setProjectId(e.target.value); setErrors((p) => ({ ...p, projectId: '' })); }}
            disabled={isLoading || !!entry}
            className={cn(inputCls(errors['projectId']), 'cursor-pointer')}
          >
            <option value="">Select project…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {errors['projectId'] && <p className="mt-1 text-caption text-error-400">{errors['projectId']}</p>}
        </div>

        {/* Date */}
        <div>
          <label htmlFor="ts-date" className={labelCls}>
            Date <span className="text-error-400">*</span>
          </label>
          <input
            id="ts-date"
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            disabled={isLoading}
            className={inputCls(errors['entryDate'])}
          />
          {errors['entryDate'] && <p className="mt-1 text-caption text-error-400">{errors['entryDate']}</p>}
        </div>

        {/* Hours */}
        <div>
          <label htmlFor="ts-hours" className={labelCls}>
            Hours <span className="text-error-400">*</span>
          </label>
          <input
            id="ts-hours"
            type="number"
            step="0.25"
            min="0.25"
            max="24"
            value={hours}
            onChange={(e) => { setHours(e.target.value); setErrors((p) => ({ ...p, hours: '' })); }}
            disabled={isLoading}
            placeholder="e.g. 4.5"
            className={inputCls(errors['hours'])}
          />
          {errors['hours'] && <p className="mt-1 text-caption text-error-400">{errors['hours']}</p>}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="ts-desc" className={labelCls}>Description</label>
          <input
            id="ts-desc"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isLoading}
            placeholder="What did you work on?"
            className={inputCls()}
          />
        </div>
      </div>

      {serverError && <p className="text-small text-error-400">{serverError}</p>}

      <div className="flex items-center gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 rounded-lg text-body text-text-default border border-border hover:bg-surface-elevated transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            'px-4 py-2 rounded-lg text-body text-white font-medium flex items-center gap-2',
            'bg-accent-teal-500 hover:bg-accent-teal-600 transition-colors disabled:opacity-50'
          )}
        >
          {isLoading && <Loader2 size={14} className="animate-spin" />}
          {entry ? 'Save changes' : 'Add entry'}
        </button>
      </div>
    </form>
  );
}

// ── Entries Tab ────────────────────────────────────────────────────────────────

function EntriesTab({ projects }: { projects: Array<{ id: number; name: string }> }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<TimesheetEntry | null>(null);
  const [filterProjectId, setFilterProjectId] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['timesheet', 'entries', filterProjectId],
    queryFn: () => timesheetApi.listEntries(filterProjectId ? { projectId: Number(filterProjectId) } : undefined),
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => timesheetApi.deleteEntry(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['timesheet'] }),
  });

  const entries = data?.entries ?? [];
  const total = totalHours(entries);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <select
            value={filterProjectId}
            onChange={(e) => setFilterProjectId(e.target.value)}
            className="bg-surface-primary border border-border rounded-lg px-3 py-2 text-body-small text-text-default focus:outline-none focus:ring-2 focus:ring-accent-teal-500"
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {entries.length > 0 && (
            <span className="text-small text-text-muted">
              <span className="font-mono font-semibold text-accent-teal-400">{total.toFixed(2)}h</span> total
            </span>
          )}
        </div>
        {!showForm && !editEntry && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-body text-white font-medium',
              'bg-accent-teal-500 hover:bg-accent-teal-600 transition-colors'
            )}
          >
            <PlusIcon size={16} />
            Add Entry
          </button>
        )}
      </div>

      {/* Add / Edit form */}
      {(showForm || editEntry) && (
        <EntryForm
          projects={projects}
          entry={editEntry ?? undefined}
          onSave={() => { setShowForm(false); setEditEntry(null); }}
          onCancel={() => { setShowForm(false); setEditEntry(null); }}
        />
      )}

      {/* Entries table */}
      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-surface-card border border-border rounded-lg" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ClockIcon size={40} className="text-neutral-600 mb-3" aria-hidden="true" />
          <p className="text-text-muted">No timesheet entries yet.</p>
        </div>
      ) : (
        <div className="bg-surface-card border border-border rounded-lg overflow-hidden">
          <div className="hidden sm:grid grid-cols-[100px_1fr_60px_1fr_80px] gap-3 px-4 py-2.5 border-b border-border bg-surface-elevated text-xs font-medium text-text-muted uppercase tracking-wide">
            <div>Date</div>
            <div>Project</div>
            <div>Hours</div>
            <div>Description</div>
            <div className="text-right">Actions</div>
          </div>
          <div className="divide-y divide-border">
            {entries.map((e) => (
              <div
                key={e.id}
                className="grid grid-cols-1 sm:grid-cols-[100px_1fr_60px_1fr_80px] gap-1 sm:gap-3 px-4 py-3 hover:bg-surface-elevated/40 transition-colors"
              >
                <div className="text-sm text-text-muted font-mono">{formatDate(e.entryDate)}</div>
                <div className="text-sm text-text-default font-medium truncate">{e.projectName}</div>
                <div className="font-mono text-sm text-accent-teal-400 font-semibold">{e.hours}h</div>
                <div className="text-sm text-text-muted truncate">{e.description ?? '—'}</div>
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    aria-label="Edit entry"
                    onClick={() => { setEditEntry(e); setShowForm(false); }}
                    className="p-1.5 text-text-muted hover:text-text-default hover:bg-surface-elevated rounded transition-colors"
                  >
                    <PencilIcon size={13} />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete entry"
                    onClick={() => deleteMutation.mutate(e.id)}
                    disabled={deleteMutation.isPending}
                    className="p-1.5 text-text-muted hover:text-error-400 hover:bg-error-500/10 rounded transition-colors disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2Icon size={13} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Weekly Tab ─────────────────────────────────────────────────────────────────

function WeeklyTab() {
  const [year, setYear] = useState(new Date().getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ['timesheet', 'weekly', year],
    queryFn: () => timesheetApi.getWeeklySummary(year),
    staleTime: 60_000,
  });

  const rows = data?.summary ?? [];

  // Group by week
  const weeks = Array.from(new Set(rows.map((r) => r.week))).sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      <YearNav year={year} onYearChange={setYear} />
      {isLoading ? (
        <SummarySkeleton />
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {weeks.map((week) => {
            const weekRows = rows.filter((r) => r.week === week);
            const weekTotal = totalHours(weekRows);
            return (
              <div key={week} className="bg-surface-card border border-border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-surface-elevated border-b border-border">
                  <span className="text-label font-medium text-text-default">
                    Week {week} · {year}
                  </span>
                  <span className="font-mono text-sm text-accent-teal-400 font-semibold">
                    {weekTotal.toFixed(2)}h
                  </span>
                </div>
                {weekRows.map((r) => (
                  <div key={`${week}-${r.projectId}`} className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-b-0">
                    <span className="text-sm text-text-default">{r.projectName}</span>
                    <span className="font-mono text-sm text-text-muted">{r.hours.toFixed(2)}h</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Monthly Tab ────────────────────────────────────────────────────────────────

function MonthlyTab() {
  const [year, setYear] = useState(new Date().getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ['timesheet', 'monthly', year],
    queryFn: () => timesheetApi.getMonthlySummary(year),
    staleTime: 60_000,
  });

  const rows = data?.summary ?? [];
  const months = Array.from(new Set(rows.map((r) => r.month))).sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      <YearNav year={year} onYearChange={setYear} />
      {isLoading ? (
        <SummarySkeleton />
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {months.map((month) => {
            const monthRows = rows.filter((r) => r.month === month);
            const monthTotal = totalHours(monthRows);
            return (
              <div key={month} className="bg-surface-card border border-border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-surface-elevated border-b border-border">
                  <span className="text-label font-medium text-text-default">
                    {MONTH_NAMES[month - 1]} {year}
                  </span>
                  <span className="font-mono text-sm text-accent-teal-400 font-semibold">
                    {monthTotal.toFixed(2)}h
                  </span>
                </div>
                {monthRows.map((r) => (
                  <div key={`${month}-${r.projectId}`} className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-b-0">
                    <span className="text-sm text-text-default">{r.projectName}</span>
                    <span className="font-mono text-sm text-text-muted">{r.hours.toFixed(2)}h</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Yearly Tab ─────────────────────────────────────────────────────────────────

function YearlyTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['timesheet', 'yearly'],
    queryFn: () => timesheetApi.getYearlySummary(),
    staleTime: 60_000,
  });

  const rows = data?.summary ?? [];
  const years = Array.from(new Set(rows.map((r) => r.year))).sort((a, b) => a - b);
  const grandTotal = totalHours(rows);

  return (
    <div className="space-y-4">
      {isLoading ? (
        <SummarySkeleton />
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="flex items-center gap-2">
            <ClockIcon size={16} className="text-text-muted" />
            <span className="text-body text-text-muted">
              All-time total:{' '}
              <span className="font-mono font-semibold text-accent-teal-400">{grandTotal.toFixed(2)}h</span>
            </span>
          </div>
          <div className="space-y-4">
            {years.map((yr) => {
              const yearRows = rows.filter((r) => r.year === yr);
              const yearTotal = totalHours(yearRows);
              return (
                <div key={yr} className="bg-surface-card border border-border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-surface-elevated border-b border-border">
                    <span className="text-label font-medium text-text-default">{yr}</span>
                    <span className="font-mono text-sm text-accent-teal-400 font-semibold">
                      {yearTotal.toFixed(2)}h
                    </span>
                  </div>
                  {yearRows.map((r) => (
                    <div key={`${yr}-${r.projectId}`} className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-b-0">
                      <span className="text-sm text-text-default">{r.projectName}</span>
                      <span className="font-mono text-sm text-text-muted">{r.hours.toFixed(2)}h</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────────

function YearNav({ year, onYearChange }: { year: number; onYearChange: (y: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onYearChange(year - 1)}
        className="p-1.5 text-text-muted hover:text-text-default hover:bg-surface-elevated rounded transition-colors"
        aria-label="Previous year"
      >
        <ChevronLeftIcon size={16} />
      </button>
      <span className="font-mono text-text-default font-semibold">{year}</span>
      <button
        type="button"
        onClick={() => onYearChange(year + 1)}
        disabled={year >= new Date().getFullYear()}
        className="p-1.5 text-text-muted hover:text-text-default hover:bg-surface-elevated rounded transition-colors disabled:opacity-40"
        aria-label="Next year"
      >
        <ChevronRightIcon size={16} />
      </button>
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-surface-card border border-border rounded-lg overflow-hidden">
          <div className="h-10 bg-surface-elevated" />
          <div className="p-3 space-y-2">
            <div className="h-8 bg-surface-primary rounded" />
            <div className="h-8 bg-surface-primary rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <CalendarIcon size={40} className="text-neutral-600 mb-3" aria-hidden="true" />
      <p className="text-text-muted">No timesheet data for this period.</p>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function TimesheetPage() {
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
    staleTime: 60_000,
  });

  const projects = (projectsData?.projects ?? []).map((p) => ({ id: p.id, name: p.name }));

  const tabTriggerCls = cn(
    'px-4 py-2.5 text-body text-text-muted capitalize',
    'border-b-2 border-transparent -mb-px',
    'hover:text-text-default transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
    'data-[state=active]:border-accent-teal-500 data-[state=active]:text-text-default'
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-mono text-text-default">Timesheet</h1>
        <p className="text-text-muted text-sm mt-1">Log and track your work hours by project</p>
      </div>

      <Tabs.Root defaultValue="entries">
        <Tabs.List className="flex border-b border-border mb-6" aria-label="Timesheet views">
          <Tabs.Trigger value="entries" className={tabTriggerCls}>Entries</Tabs.Trigger>
          <Tabs.Trigger value="weekly" className={tabTriggerCls}>Weekly</Tabs.Trigger>
          <Tabs.Trigger value="monthly" className={tabTriggerCls}>Monthly</Tabs.Trigger>
          <Tabs.Trigger value="yearly" className={tabTriggerCls}>Yearly</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="entries">
          <EntriesTab projects={projects} />
        </Tabs.Content>
        <Tabs.Content value="weekly">
          <WeeklyTab />
        </Tabs.Content>
        <Tabs.Content value="monthly">
          <MonthlyTab />
        </Tabs.Content>
        <Tabs.Content value="yearly">
          <YearlyTab />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
