import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../lib/api/analytics.api';
import type { OvertimeData } from '@bim/shared-types';

const RISK_COLOR: Record<string, string> = {
  LOW:      'bg-green-500/20 text-green-300 border-green-500/30',
  MEDIUM:   'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  HIGH:     'bg-orange-500/20 text-orange-300 border-orange-500/30',
  CRITICAL: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const OT_CELL_COLOR = (hours: number) => {
  if (hours === 0) return 'bg-gray-800';
  if (hours < 1) return 'bg-yellow-900';
  if (hours < 2) return 'bg-yellow-700';
  if (hours < 3) return 'bg-orange-700';
  return 'bg-red-700';
};

export function OvertimeHeatmap() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['analytics', 'overtime'],
    queryFn: () => analyticsApi.getOvertime(6),
  });

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-surface-card rounded-xl" />;
  }

  const weeks = data[0]?.weeklyData.map(w => w.weekStart) ?? [];

  return (
    <div className="bg-surface-card rounded-xl border border-surface-border p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-white">Heatmap Làm Thêm Giờ</h3>
          <p className="text-xs text-gray-400 mt-0.5">6 tuần gần nhất · theo nhân viên</p>
        </div>
        <Legend />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left text-gray-400 font-medium pb-2 pr-4 min-w-[140px]">Nhân viên</th>
              <th className="text-left text-gray-400 font-medium pb-2 pr-3 min-w-[80px]">Phòng ban</th>
              <th className="text-center text-gray-400 font-medium pb-2 px-2 w-20">Rủi ro</th>
              {weeks.map(w => (
                <th key={w} className="text-center text-gray-400 font-normal pb-2 px-1 min-w-[56px]">
                  {formatWeek(w)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((emp: OvertimeData) => (
              <tr key={emp.employeeId} className="border-t border-surface-border/50">
                <td className="py-2 pr-4 text-white font-medium truncate max-w-[140px]">
                  {emp.employeeName}
                </td>
                <td className="py-2 pr-3 text-gray-400 truncate max-w-[80px]">
                  {emp.department}
                </td>
                <td className="py-2 px-2 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded border text-xs font-medium ${RISK_COLOR[emp.riskLevel]}`}>
                    {emp.riskLevel}
                  </span>
                </td>
                {emp.weeklyData.map(week => (
                  <td key={week.weekStart} className="py-2 px-1">
                    <div
                      className={`w-12 h-8 mx-auto rounded flex items-center justify-center text-white text-xs font-mono font-bold ${OT_CELL_COLOR(week.overtimeHours)}`}
                      title={`${week.totalHours.toFixed(1)}h total · ${week.overtimeHours.toFixed(1)}h OT`}
                    >
                      {week.overtimeHours > 0 ? `+${week.overtimeHours.toFixed(0)}h` : ''}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <p className="text-center text-gray-500 py-8">Không có dữ liệu làm thêm giờ</p>
      )}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <span>OT:</span>
      <div className="flex gap-1 items-center">
        {[
          { color: 'bg-gray-800', label: '0h' },
          { color: 'bg-yellow-900', label: '<1h' },
          { color: 'bg-orange-700', label: '2h' },
          { color: 'bg-red-700', label: '3h+' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1">
            <div className={`w-4 h-4 rounded ${l.color}`} />
            <span>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatWeek(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}
