import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell
} from 'recharts';
import { analyticsApi } from '../../lib/api/analytics.api';
import { TrendingUp, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { BudgetBurnData } from '@bim/shared-types';

const RISK_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  ON_TRACK:    { icon: CheckCircle2,  color: '#22c55e', bg: 'bg-green-500/10 border-green-500/30'  },
  AT_RISK:     { icon: AlertTriangle, color: '#f59e0b', bg: 'bg-yellow-500/10 border-yellow-500/30'},
  OVER_BUDGET: { icon: XCircle,       color: '#ef4444', bg: 'bg-red-500/10 border-red-500/30'      },
};

export function BudgetBurnChart() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['analytics', 'budget-burn'],
    queryFn: analyticsApi.getBudgetBurn,
  });

  if (isLoading) return <div className="animate-pulse h-64 bg-surface-card rounded-xl" />;

  const chartData = data.map((p: BudgetBurnData) => ({
    name: p.projectCode,
    burnPct: Math.min(Math.round(p.burnRate * 100), 150),
    actual: p.actualHours,
    budget: p.budgetHours,
    risk: p.riskLevel,
    project: p.projectName,
  }));

  const stats = {
    onTrack: data.filter((p: BudgetBurnData) => p.riskLevel === 'ON_TRACK').length,
    atRisk: data.filter((p: BudgetBurnData) => p.riskLevel === 'AT_RISK').length,
    over: data.filter((p: BudgetBurnData) => p.riskLevel === 'OVER_BUDGET').length,
  };

  return (
    <div className="bg-surface-card rounded-xl border border-surface-border p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-white flex items-center gap-2">
            <TrendingUp size={18} className="text-brand-400" />
            Tỷ lệ đốt ngân sách dự án
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Giờ thực tế / Giờ ngân sách (%)</p>
        </div>

        {/* Summary pills */}
        <div className="flex gap-2">
          {[
            { label: 'Đúng tiến độ', count: stats.onTrack, color: 'text-green-400' },
            { label: 'Cảnh báo', count: stats.atRisk, color: 'text-yellow-400' },
            { label: 'Vượt ngân sách', count: stats.over, color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className={`text-lg font-bold ${s.color}`}>{s.count}</div>
              <div className="text-xs text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}%`}
            domain={[0, 150]}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '80%', fill: '#f59e0b', fontSize: 10 }} />
          <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '100%', fill: '#ef4444', fontSize: 10 }} />
          <Bar dataKey="burnPct" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={RISK_CONFIG[entry.risk]?.color ?? '#3b82f6'}
                fillOpacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Project cards */}
      <div className="mt-4 grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
        {data.filter((p: BudgetBurnData) => p.riskLevel !== 'ON_TRACK').map((p: BudgetBurnData) => {
          const cfg = RISK_CONFIG[p.riskLevel];
          const Icon = cfg.icon;
          return (
            <div key={p.projectId} className={`flex items-center gap-3 p-3 rounded-lg border ${cfg.bg}`}>
              <Icon size={16} style={{ color: cfg.color }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{p.projectName}</div>
                <div className="text-xs text-gray-400">
                  {p.actualHours.toFixed(0)}h / {p.budgetHours.toFixed(0)}h
                  ({Math.round(p.burnRate * 100)}%)
                  {p.projectedOverrun > 0 && <span className="text-red-400 ml-2">+{p.projectedOverrun.toFixed(0)}h vượt</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-3 text-xs shadow-xl">
      <div className="font-semibold text-white mb-1">{d.project}</div>
      <div className="text-gray-300">Đốt: <span className="text-white">{d.burnPct}%</span></div>
      <div className="text-gray-300">Thực tế: <span className="text-white">{d.actual?.toFixed(0)}h</span></div>
      <div className="text-gray-300">Ngân sách: <span className="text-white">{d.budget?.toFixed(0)}h</span></div>
    </div>
  );
}
