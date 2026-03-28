import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timesheetApi, taskLogApi } from '../lib/api/timesheet.api';
import { worktypeApi } from '../lib/api/worktype.api';
import { projectsApi } from '../lib/api/projects.api';
import { useAuthStore } from '../lib/stores/auth.store';
import { cn, formatHours, getThisMonday } from '../lib/utils';
import type { TimesheetEntry, TaskLog, TaskLogInput, WorkGroup } from '@bim/shared-types';

// ── Helpers ──────────────────────────────────────────────────
const DAYS_VN = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  SUBMITTED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  LOCKED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Nháp', SUBMITTED: 'Đã nộp', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', LOCKED: 'Khóa',
};

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDateVN(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

// ── Task Form ─────────────────────────────────────────────────
interface TaskFormProps {
  workDate: string;
  hierarchy: WorkGroup[];
  onSaved: () => void;
  onCancel: () => void;
  editing?: TaskLog;
}

function TaskForm({ workDate, hierarchy, onSaved, onCancel, editing }: TaskFormProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState<TaskLogInput>({
    workDate,
    workGroupId: editing?.workGroupId ?? 0,
    workTypeId: editing?.workTypeId ?? 0,
    detailActionId: editing?.detailActionId ?? undefined,
    projectId: editing?.projectId ?? undefined,
    hours: editing?.hours ?? 1,
    overtimeHours: editing?.overtimeHours ?? 0,
    description: editing?.description ?? '',
    isConfirmed: editing?.isConfirmed ?? false,
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-active'],
    queryFn: () => projectsApi.list({ isActive: true, pageSize: 100 }),
    staleTime: 60_000,
  });

  const selectedGroup = hierarchy.find(g => g.workGroupId === form.workGroupId);
  const workTypes = selectedGroup?.workTypes ?? [];
  const selectedType = workTypes.find(t => t.workTypeId === form.workTypeId);
  const detailActions = selectedType?.detailActions ?? [];

  const createMut = useMutation({
    mutationFn: (input: TaskLogInput) => taskLogApi.create(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-logs', workDate] }); onSaved(); },
  });

  const updateMut = useMutation({
    mutationFn: (input: Partial<TaskLogInput>) =>
      taskLogApi.update(editing!.logId, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-logs', workDate] }); onSaved(); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.workGroupId || !form.workTypeId || !form.hours) return;
    if (editing) updateMut.mutate(form);
    else createMut.mutate(form);
  };

  const isPending = createMut.isPending || updateMut.isPending;
  const error = createMut.error || updateMut.error;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
          {(error as any).response?.data?.error?.message ?? 'Có lỗi xảy ra'}
        </div>
      )}

      {/* Work Group */}
      <div>
        <label className="label-sm">Nhóm công việc *</label>
        <select
          className="form-select"
          value={form.workGroupId || ''}
          onChange={e => setForm(f => ({ ...f, workGroupId: Number(e.target.value), workTypeId: 0, detailActionId: undefined }))}
          required
        >
          <option value="">-- Chọn nhóm --</option>
          {hierarchy.map(g => (
            <option key={g.workGroupId} value={g.workGroupId}>{g.groupName}</option>
          ))}
        </select>
      </div>

      {/* Work Type */}
      <div>
        <label className="label-sm">Loại công việc *</label>
        <select
          className="form-select"
          value={form.workTypeId || ''}
          onChange={e => setForm(f => ({ ...f, workTypeId: Number(e.target.value), detailActionId: undefined }))}
          required
          disabled={!form.workGroupId}
        >
          <option value="">-- Chọn loại --</option>
          {workTypes.map(t => (
            <option key={t.workTypeId} value={t.workTypeId}>{t.typeName}</option>
          ))}
        </select>
      </div>

      {/* Detail Action */}
      {detailActions.length > 0 && (
        <div>
          <label className="label-sm">Chi tiết hành động</label>
          <select
            className="form-select"
            value={form.detailActionId ?? ''}
            onChange={e => setForm(f => ({ ...f, detailActionId: e.target.value ? Number(e.target.value) : undefined }))}
          >
            <option value="">-- Chọn (tuỳ chọn) --</option>
            {detailActions.map(a => (
              <option key={a.detailActionId} value={a.detailActionId}>{a.actionName}</option>
            ))}
          </select>
        </div>
      )}

      {/* Project (only for project-related groups) */}
      {selectedGroup?.isProjectRelated && (
        <div>
          <label className="label-sm">Dự án</label>
          <select
            className="form-select"
            value={form.projectId ?? ''}
            onChange={e => setForm(f => ({ ...f, projectId: e.target.value ? Number(e.target.value) : undefined }))}
          >
            <option value="">-- Chọn dự án --</option>
            {projects?.data.map(p => (
              <option key={p.projectId} value={p.projectId}>{p.maDuAn} — {p.projectName}</option>
            ))}
          </select>
        </div>
      )}

      {/* Hours */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-sm">Giờ làm *</label>
          <input
            type="number"
            className="form-input"
            min={0.25} max={24} step={0.25}
            value={form.hours}
            onChange={e => setForm(f => ({ ...f, hours: parseFloat(e.target.value) || 0 }))}
            required
          />
        </div>
        <div>
          <label className="label-sm">Giờ OT</label>
          <input
            type="number"
            className="form-input"
            min={0} max={12} step={0.25}
            value={form.overtimeHours ?? 0}
            onChange={e => setForm(f => ({ ...f, overtimeHours: parseFloat(e.target.value) || 0 }))}
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="label-sm">Ghi chú</label>
        <textarea
          className="form-input resize-none"
          rows={2}
          maxLength={500}
          value={form.description ?? ''}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Mô tả công việc..."
        />
      </div>

      {/* Confirmed */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          className="rounded"
          checked={form.isConfirmed ?? false}
          onChange={e => setForm(f => ({ ...f, isConfirmed: e.target.checked }))}
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">Xác nhận hoàn thành</span>
      </label>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary flex-1"
        >
          {isPending ? 'Đang lưu...' : editing ? 'Cập nhật' : 'Thêm'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">
          Hủy
        </button>
      </div>
    </form>
  );
}

// ── Day Cell ──────────────────────────────────────────────────
interface DayCellProps {
  date: string;
  dayLabel: string;
  entry?: TimesheetEntry;
  isSelected: boolean;
  isToday: boolean;
  onSelect: (date: string) => void;
}

function DayCell({ date, dayLabel, entry, isSelected, isToday, onSelect }: DayCellProps) {
  const hasLogs = entry && (entry.totalHours ?? 0) > 0;
  return (
    <button
      onClick={() => onSelect(date)}
      className={cn(
        'flex flex-col items-center rounded-xl p-2 transition-all border',
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50'
          : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700',
        isToday && !isSelected && 'border-blue-300 dark:border-blue-700'
      )}
    >
      <span className={cn('text-xs font-medium', isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400')}>
        {dayLabel}
      </span>
      <span className={cn('text-sm font-semibold mt-0.5', isToday ? 'text-blue-600' : 'text-gray-800 dark:text-gray-200')}>
        {formatDateVN(date)}
      </span>
      {entry ? (
        <span className={cn('mt-1 rounded-full px-1.5 py-0.5 text-xs', STATUS_COLORS[entry.status])}>
          {hasLogs ? `${entry.totalHours}h` : STATUS_LABELS[entry.status]}
        </span>
      ) : (
        <span className="mt-1 h-4 w-4 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600" />
      )}
    </button>
  );
}

// ── Task Log Row ──────────────────────────────────────────────
interface TaskRowProps {
  log: TaskLog;
  onEdit: (log: TaskLog) => void;
  onDelete: (id: number) => void;
}

function TaskRow({ log, onEdit, onDelete }: TaskRowProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800 p-3 group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
            {log.workGroupName ?? `Nhóm ${log.workGroupId}`}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {log.workTypeName ?? `Loại ${log.workTypeId}`}
          </span>
          {log.detailActionName && (
            <span className="text-xs text-gray-400 dark:text-gray-500">• {log.detailActionName}</span>
          )}
        </div>
        {log.maDuAn && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Dự án: <span className="font-medium text-gray-700 dark:text-gray-300">{log.maDuAn}</span>
            {log.projectName && ` — ${log.projectName}`}
          </p>
        )}
        {log.description && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 truncate">{log.description}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {formatHours(log.hours)}
        </span>
        {log.overtimeHours > 0 && (
          <p className="text-xs text-orange-500">+{formatHours(log.overtimeHours)} OT</p>
        )}
        {log.isConfirmed && (
          <p className="text-xs text-green-500">✓ Đã xác nhận</p>
        )}
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => onEdit(log)}
          className="rounded p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30"
          title="Sửa"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(log.logId)}
          className="rounded p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
          title="Xóa"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function TimesheetPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const today = new Date().toISOString().slice(0, 10);

  const [weekStart, setWeekStart] = useState(getThisMonday());
  const [selectedDate, setSelectedDate] = useState(today);
  const [showForm, setShowForm] = useState(false);
  const [editingLog, setEditingLog] = useState<TaskLog | undefined>();

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { data: weekSummary, isLoading: weekLoading } = useQuery({
    queryKey: ['week-summary', weekStart],
    queryFn: () => timesheetApi.getWeek(weekStart),
    staleTime: 30_000,
  });

  const { data: taskLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['task-logs', selectedDate],
    queryFn: () => taskLogApi.list(selectedDate),
    staleTime: 10_000,
  });

  const { data: hierarchy = [] } = useQuery({
    queryKey: ['work-hierarchy'],
    queryFn: () => worktypeApi.getHierarchy(),
    staleTime: 600_000,
  });

  const deleteMut = useMutation({
    mutationFn: taskLogApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-logs', selectedDate] }),
  });

  const submitMut = useMutation({
    mutationFn: () => timesheetApi.submitWeek(weekStart),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['week-summary', weekStart] }),
  });

  const entryByDate = new Map<string, TimesheetEntry>();
  for (const entry of weekSummary?.entries ?? []) {
    entryByDate.set(entry.workDate, entry);
  }

  const selectedEntry = entryByDate.get(selectedDate);
  const canSubmit = weekSummary?.pendingCount && weekSummary.pendingCount > 0;
  const canAddLog = !selectedEntry || ['DRAFT', 'REJECTED'].includes(selectedEntry.status);

  const handleEdit = (log: TaskLog) => {
    setEditingLog(log);
    setShowForm(true);
  };

  const handleFormSaved = useCallback(() => {
    setShowForm(false);
    setEditingLog(undefined);
  }, []);

  const prevWeek = () => setWeekStart(addDays(weekStart, -7));
  const nextWeek = () => setWeekStart(addDays(weekStart, 7));

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Timesheet</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Nhật ký làm việc của {user?.firstName} {user?.lastName}
          </p>
        </div>
        {canSubmit && (
          <button
            onClick={() => submitMut.mutate()}
            disabled={submitMut.isPending}
            className="btn-primary"
          >
            {submitMut.isPending ? 'Đang nộp...' : `Nộp tuần (${weekSummary?.pendingCount} ngày)`}
          </button>
        )}
      </div>

      {/* Week Navigator */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevWeek} className="btn-icon">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {formatDateVN(weekStart)} – {formatDateVN(addDays(weekStart, 6))}
            </p>
            {weekSummary && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatHours(weekSummary.totalHours)} tổng •{' '}
                {weekSummary.overtimeHours > 0 && `${formatHours(weekSummary.overtimeHours)} OT • `}
                {weekSummary.approvedCount}/{weekSummary.entries.length} ngày đã duyệt
              </p>
            )}
          </div>
          <button onClick={nextWeek} className="btn-icon">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {weekDates.map((date, i) => (
            <DayCell
              key={date}
              date={date}
              dayLabel={DAYS_VN[i]}
              entry={entryByDate.get(date)}
              isSelected={date === selectedDate}
              isToday={date === today}
              onSelect={setSelectedDate}
            />
          ))}
        </div>
      </div>

      {/* Selected day panel */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-medium text-gray-900 dark:text-gray-100">
              {new Date(selectedDate).toLocaleDateString('vi-VN', {
                weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric',
              })}
            </h2>
            {selectedEntry && (
              <span className={cn('text-xs px-2 py-0.5 rounded-full', STATUS_COLORS[selectedEntry.status])}>
                {STATUS_LABELS[selectedEntry.status]}
                {selectedEntry.totalHours != null && ` • ${formatHours(selectedEntry.totalHours)}`}
              </span>
            )}
          </div>
          {canAddLog && !showForm && (
            <button onClick={() => { setEditingLog(undefined); setShowForm(true); }} className="btn-primary text-sm">
              + Thêm công việc
            </button>
          )}
        </div>

        {/* Task Form */}
        {showForm && (
          <div className="mb-4 rounded-xl border border-blue-100 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
              {editingLog ? 'Sửa công việc' : 'Thêm công việc mới'}
            </h3>
            <TaskForm
              workDate={selectedDate}
              hierarchy={hierarchy}
              onSaved={handleFormSaved}
              onCancel={() => { setShowForm(false); setEditingLog(undefined); }}
              editing={editingLog}
            />
          </div>
        )}

        {/* Task Logs */}
        {logsLoading ? (
          <div className="text-center py-8 text-gray-400">Đang tải...</div>
        ) : taskLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500">
            <svg className="h-10 w-10 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">Chưa có công việc nào ngày này</p>
          </div>
        ) : (
          <div className="space-y-2">
            {taskLogs.map(log => (
              <TaskRow
                key={log.logId}
                log={log}
                onEdit={handleEdit}
                onDelete={id => deleteMut.mutate(id)}
              />
            ))}
            <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Tổng: {formatHours(taskLogs.reduce((s, l) => s + l.hours, 0))}
                {taskLogs.some(l => l.overtimeHours > 0) && (
                  <span className="text-orange-500 ml-2">
                    +{formatHours(taskLogs.reduce((s, l) => s + l.overtimeHours, 0))} OT
                  </span>
                )}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
