import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, Users, FolderOpen, AlertTriangle, TrendingUp, CheckSquare } from 'lucide-react';
import { analyticsApi } from '../lib/api/analytics.api';
import { ClockInOutWidget } from '../components/timesheet/ClockInOutWidget';
import { OvertimeHeatmap } from '../components/analytics/OvertimeHeatmap';
import { BudgetBurnChart } from '../components/analytics/BudgetBurnChart';
import { AIInsightsFeed } from '../components/analytics/AIInsightsFeed';
import { useAuthStore } from '../lib/stores/auth.store';

function KPICard({ icon: Icon, label, value, sub, color = 'text-brand-400' }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-surface-card rounded-xl border border-surface-border p-4 flex items-start gap-4">
      <div className={`p-2.5 rounded-lg bg-surface-hover ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-sm text-gray-400">{label}</div>
        {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const user = useAuthStore(s => s.user);
  const level = user?.hierarchyLevel ?? 1;

  const { data: summary } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: analyticsApi.getDashboard,
    staleTime: 60_000,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Xin chào, {user?.firstName}! 👋
        </h1>
        <p className="text-gray-400 mt-1">
          {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={Clock}
          label="Giờ tuần này"
          value={`${summary?.myHoursThisWeek?.toFixed(1) ?? '–'}h`}
          sub={summary?.myOvertimeThisWeek ? `+${summary.myOvertimeThisWeek.toFixed(1)}h OT` : undefined}
          color="text-brand-400"
        />
        {level >= 2 && (
          <KPICard
            icon={CheckSquare}
            label="Chờ duyệt"
            value={summary?.pendingApprovals ?? '–'}
            sub="timesheet"
            color="text-yellow-400"
          />
        )}
        {level >= 3 && (
          <>
            <KPICard
              icon={Users}
              label="Nhân viên"
              value={summary?.totalActiveEmployees ?? '–'}
              sub="đang làm việc"
              color="text-green-400"
            />
            <KPICard
              icon={AlertTriangle}
              label="Rủi ro OT"
              value={summary?.overtimeRiskCount ?? '–'}
              sub="nhân viên"
              color="text-orange-400"
            />
          </>
        )}
        {level < 3 && (
          <KPICard
            icon={FolderOpen}
            label="Dự án hoạt động"
            value="–"
            sub="của bạn"
            color="text-purple-400"
          />
        )}
      </div>

      {/* Main layout */}
      <div className={`grid gap-6 ${level >= 3 ? 'grid-cols-1 xl:grid-cols-3' : 'grid-cols-1 lg:grid-cols-2'}`}>
        {/* Clock-in widget — always first */}
        <div className={level >= 3 ? 'xl:col-span-1' : ''}>
          <ClockInOutWidget />
        </div>

        {/* Charts — PM and above */}
        {level >= 3 && (
          <>
            <div className="xl:col-span-2">
              <BudgetBurnChart />
            </div>
            <div className="xl:col-span-2">
              <OvertimeHeatmap />
            </div>
            <div className="xl:col-span-1">
              <AIInsightsFeed />
            </div>
          </>
        )}

        {/* Team lead view */}
        {level === 2 && (
          <div>
            <OvertimeHeatmap />
          </div>
        )}
      </div>

      {/* Weekly hours trend for admins */}
      {level >= 4 && summary?.weeklyHoursTrend && summary.weeklyHoursTrend.length > 0 && (
        <div className="bg-surface-card rounded-xl border border-surface-border p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-brand-400" />
            Xu hướng giờ làm việc (8 tuần)
          </h3>
          <div className="flex items-end gap-2 h-20">
            {summary.weeklyHoursTrend.map((w, i) => {
              const max = Math.max(...summary.weeklyHoursTrend!.map(x => x.hours));
              const pct = max > 0 ? (w.hours / max) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-brand-600/60 rounded-t transition-all hover:bg-brand-500"
                    style={{ height: `${pct}%`, minHeight: 4 }}
                    title={`${w.hours.toFixed(0)}h`}
                  />
                  <span className="text-xs text-gray-500">
                    {new Date(w.week).getDate()}/{new Date(w.week).getMonth() + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
