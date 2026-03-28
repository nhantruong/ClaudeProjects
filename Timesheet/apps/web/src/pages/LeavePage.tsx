import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveApi } from '../lib/api/leave.api';
import { cn } from '../lib/utils';
import type { LeaveRequest, LeaveBalance } from '@bim/shared-types';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  CANCELLED: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', CANCELLED: 'Đã hủy',
};

// ── Balance Card ──────────────────────────────────────────────
function BalanceCard({ balance }: { balance: LeaveBalance }) {
  const pct = balance.allowedDays > 0
    ? Math.round((balance.usedDays / balance.allowedDays) * 100)
    : 0;

  return (
    <div className="card">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
            {balance.leaveType?.typeName ?? `Loại ${balance.leaveTypeId}`}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {balance.leaveType?.isPaid ? 'Có lương' : 'Không lương'}
          </p>
        </div>
        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
          {balance.remainingDays}
        </span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        Đã dùng {balance.usedDays} / {balance.allowedDays} ngày
        {balance.pendingDays > 0 && ` • ${balance.pendingDays} ngày đang chờ`}
        {balance.carryOverDays > 0 && ` • +${balance.carryOverDays} ngày chuyển kỳ`}
      </p>
      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div
          className={cn('h-full rounded-full', pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-green-500')}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

// ── Request Form ──────────────────────────────────────────────
interface RequestFormProps {
  onSaved: () => void;
  onCancel: () => void;
}

function RequestForm({ onSaved, onCancel }: RequestFormProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    leaveTypeId: 0,
    startDate: '',
    endDate: '',
    reason: '',
  });

  const { data: types = [] } = useQuery({
    queryKey: ['leave-types'],
    queryFn: leaveApi.getTypes,
    staleTime: 600_000,
  });

  const createMut = useMutation({
    mutationFn: leaveApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-leave-requests'] });
      qc.invalidateQueries({ queryKey: ['leave-balance'] });
      onSaved();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.leaveTypeId || !form.startDate || !form.endDate) return;
    createMut.mutate({ ...form, reason: form.reason || undefined });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {createMut.error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
          {(createMut.error as any).response?.data?.error?.message ?? 'Có lỗi xảy ra'}
        </div>
      )}

      <div>
        <label className="label-sm">Loại nghỉ phép *</label>
        <select
          className="form-select"
          value={form.leaveTypeId || ''}
          onChange={e => setForm(f => ({ ...f, leaveTypeId: Number(e.target.value) }))}
          required
        >
          <option value="">-- Chọn loại nghỉ --</option>
          {types.map(t => (
            <option key={t.leaveTypeId} value={t.leaveTypeId}>
              {t.typeName} {t.isPaid ? '(có lương)' : '(không lương)'}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-sm">Ngày bắt đầu *</label>
          <input
            type="date"
            className="form-input"
            value={form.startDate}
            onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="label-sm">Ngày kết thúc *</label>
          <input
            type="date"
            className="form-input"
            value={form.endDate}
            min={form.startDate}
            onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
            required
          />
        </div>
      </div>

      <div>
        <label className="label-sm">Lý do</label>
        <textarea
          className="form-input resize-none"
          rows={2}
          maxLength={500}
          value={form.reason}
          onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
          placeholder="Nhập lý do nghỉ phép..."
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={createMut.isPending} className="btn-primary flex-1">
          {createMut.isPending ? 'Đang gửi...' : 'Gửi yêu cầu'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Hủy</button>
      </div>
    </form>
  );
}

// ── Request Row ───────────────────────────────────────────────
function RequestRow({ request, onCancel }: { request: LeaveRequest; onCancel?: (id: number) => void }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800 p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
            {request.leaveType?.typeName ?? `Loại ${request.leaveTypeId}`}
          </span>
          <span className={cn('badge', STATUS_STYLES[request.status])}>
            {STATUS_LABELS[request.status]}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {new Date(request.startDate).toLocaleDateString('vi-VN')}
          {' → '}
          {new Date(request.endDate).toLocaleDateString('vi-VN')}
          {' • '}
          <strong>{request.totalDays} ngày</strong>
        </p>
        {request.reason && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{request.reason}</p>
        )}
        {request.rejectionNote && (
          <p className="text-xs text-red-500 mt-0.5">Lý do từ chối: {request.rejectionNote}</p>
        )}
      </div>
      {request.status === 'PENDING' && onCancel && (
        <button
          onClick={() => onCancel(request.requestId)}
          className="shrink-0 text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          Hủy
        </button>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function LeavePage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [year] = useState(new Date().getFullYear());

  const { data: balances = [] } = useQuery({
    queryKey: ['leave-balance', year],
    queryFn: () => leaveApi.getBalance(year),
    staleTime: 60_000,
  });

  const { data: requestsData } = useQuery({
    queryKey: ['my-leave-requests', year],
    queryFn: () => leaveApi.listMyRequests({ year }),
    staleTime: 30_000,
  });

  const cancelMut = useMutation({
    mutationFn: leaveApi.cancel,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-leave-requests'] });
      qc.invalidateQueries({ queryKey: ['leave-balance'] });
    },
  });

  const requests = requestsData?.data ?? [];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Nghỉ phép</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Năm {year}</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Yêu cầu nghỉ phép
          </button>
        )}
      </div>

      {/* Balance cards */}
      {balances.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {balances.map(b => (
            <BalanceCard key={b.balanceId} balance={b} />
          ))}
        </div>
      )}

      {/* Request form */}
      {showForm && (
        <div className="card border-blue-100 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
            Yêu cầu nghỉ phép mới
          </h2>
          <RequestForm
            onSaved={() => setShowForm(false)}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Request history */}
      <div className="card">
        <h2 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
          Lịch sử yêu cầu
          {requestsData?.total ? <span className="text-sm text-gray-400 ml-2">({requestsData.total})</span> : null}
        </h2>
        {requests.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
            Chưa có yêu cầu nghỉ phép nào
          </p>
        ) : (
          <div className="space-y-2">
            {requests.map(req => (
              <RequestRow
                key={req.requestId}
                request={req}
                onCancel={id => cancelMut.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
