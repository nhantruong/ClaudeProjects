import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, MapPin, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { timesheetApi } from '../../lib/api/timesheet.api';
import { cn } from '../../lib/utils';
import type { TimesheetEntry } from '@bim/shared-types';

export function ClockInOutWidget() {
  const qc = useQueryClient();
  const [elapsed, setElapsed] = useState('00:00:00');
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const { data: entry, isLoading } = useQuery({
    queryKey: ['timesheet', 'today'],
    queryFn: timesheetApi.getToday,
    refetchInterval: 60_000,
  });

  const clockInMutation = useMutation({
    mutationFn: () => timesheetApi.clockIn({
      source: 'WEB',
      locationLat: coords?.lat,
      locationLng: coords?.lng,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timesheet'] }),
  });

  const clockOutMutation = useMutation({
    mutationFn: () => timesheetApi.clockOut({ breakMinutes: 60 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timesheet'] }),
  });

  // Live timer
  useEffect(() => {
    if (!entry?.clockInTime || entry.clockOutTime) return;

    const update = () => {
      const diff = Date.now() - new Date(entry.clockInTime!).getTime();
      const h = Math.floor(diff / 3_600_000).toString().padStart(2, '0');
      const m = Math.floor((diff % 3_600_000) / 60_000).toString().padStart(2, '0');
      const s = Math.floor((diff % 60_000) / 1_000).toString().padStart(2, '0');
      setElapsed(`${h}:${m}:${s}`);
    };

    update();
    const interval = setInterval(update, 1_000);
    return () => clearInterval(interval);
  }, [entry?.clockInTime, entry?.clockOutTime]);

  // GPS
  useEffect(() => {
    if (gpsEnabled && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  }, [gpsEnabled]);

  const isClockedIn = Boolean(entry?.clockInTime && !entry?.clockOutTime);
  const isClockedOut = Boolean(entry?.clockInTime && entry?.clockOutTime);
  const isLoading2 = clockInMutation.isPending || clockOutMutation.isPending;

  const getStatusColor = () => {
    if (!entry?.clockInTime) return 'border-gray-600 bg-surface-hover';
    if (isClockedIn) return 'border-green-500 bg-green-500/10';
    if (isClockedOut) return 'border-brand-500 bg-brand-500/10';
    return 'border-gray-600 bg-surface-hover';
  };

  return (
    <div className={cn(
      'rounded-2xl border-2 p-6 transition-all duration-300',
      getStatusColor()
    )}>
      {/* Status indicator */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-3 h-3 rounded-full',
            isClockedIn ? 'bg-green-400 animate-pulse' : isClockedOut ? 'bg-brand-400' : 'bg-gray-500'
          )} />
          <span className="text-sm font-medium text-gray-300">
            {!entry?.clockInTime && 'Chưa chấm công'}
            {isClockedIn && 'Đang làm việc'}
            {isClockedOut && 'Đã kết thúc'}
          </span>
        </div>

        <button
          onClick={() => setGpsEnabled(p => !p)}
          className={cn(
            'flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors',
            gpsEnabled ? 'bg-green-500/20 text-green-400' : 'bg-surface-hover text-gray-400'
          )}
        >
          <MapPin size={12} />
          GPS
        </button>
      </div>

      {/* Timer display */}
      <div className="text-center mb-6">
        <div className="text-5xl font-mono font-bold text-white tracking-wider mb-1">
          {isClockedIn ? elapsed : (isClockedOut
            ? `${entry!.netHoursWorked?.toFixed(1)} giờ`
            : '--:--:--'
          )}
        </div>
        {entry?.clockInTime && (
          <div className="text-sm text-gray-400">
            Vào: {new Date(entry.clockInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            {entry.clockOutTime && (
              <> · Ra: {new Date(entry.clockOutTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</>
            )}
          </div>
        )}
        {entry?.overtimeHours != null && entry.overtimeHours > 0 && (
          <div className="mt-1 text-xs text-amber-400">
            ⚡ OT: {entry.overtimeHours.toFixed(1)} giờ
          </div>
        )}
      </div>

      {/* Action button */}
      {isLoading ? (
        <div className="flex justify-center">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {!entry?.clockInTime && (
            <button
              onClick={() => clockInMutation.mutate()}
              disabled={isLoading2}
              className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold text-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading2 ? <Loader2 size={20} className="animate-spin" /> : <Clock size={20} />}
              Chấm công vào
            </button>
          )}

          {isClockedIn && (
            <button
              onClick={() => clockOutMutation.mutate()}
              disabled={isLoading2}
              className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading2 ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
              Chấm công ra
            </button>
          )}

          {isClockedOut && (
            <div className="flex items-center justify-center gap-2 text-brand-400 font-medium">
              <CheckCircle size={18} />
              Đã hoàn thành ngày làm việc
            </div>
          )}
        </>
      )}

      {/* Status badge */}
      {entry?.status && (
        <div className="mt-4 flex justify-center">
          <StatusBadge status={entry.status} />
        </div>
      )}

      {/* Errors */}
      {(clockInMutation.isError || clockOutMutation.isError) && (
        <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle size={14} />
          {(clockInMutation.error as any)?.response?.data?.error?.message ?? 'Đã xảy ra lỗi'}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: TimesheetEntry['status'] }) {
  const MAP: Record<string, { label: string; class: string }> = {
    DRAFT:     { label: 'Nháp', class: 'bg-gray-700 text-gray-300' },
    SUBMITTED: { label: 'Đã nộp', class: 'bg-blue-500/20 text-blue-300' },
    APPROVED:  { label: 'Đã duyệt', class: 'bg-green-500/20 text-green-300' },
    REJECTED:  { label: 'Từ chối', class: 'bg-red-500/20 text-red-300' },
    LOCKED:    { label: 'Đã khóa', class: 'bg-purple-500/20 text-purple-300' },
  };
  const cfg = MAP[status] ?? MAP['DRAFT'];
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${cfg.class}`}>
      {cfg.label}
    </span>
  );
}
