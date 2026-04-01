import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { DashboardData } from '@/lib/api/dashboard.api';

// ── Types ──────────────────────────────────────────────────────────────────────

interface PpcTrendChartProps {
  data: DashboardData['ppcTrend'];
}

// ── Component ──────────────────────────────────────────────────────────────────

export function PpcTrendChart({ data }: PpcTrendChartProps) {
  const chartData = data.map((d) => ({
    week: format(parseISO(d.weekStartDate), 'MMM d'),
    ppc: d.ppc ?? 0,
  }));

  return (
    <div className="bg-surface-card border border-border rounded-lg p-5">
      {/* Heading */}
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={14} className="text-text-muted" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-text-default">PPC Trend</h2>
      </div>

      {/* Chart or empty state */}
      {data.length === 0 ? (
        <p className="text-text-muted text-sm text-center py-8">
          No weekly work plan data yet.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart
            data={chartData}
            margin={{ top: 4, right: 8, bottom: 0, left: -8 }}
          >
            <CartesianGrid stroke="#30363D" strokeDasharray="3 3" />
            <XAxis
              dataKey="week"
              tick={{ fill: '#8B949E', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fill: '#8B949E', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: '#22272E',
                border: '1px solid #30363D',
                borderRadius: 6,
                color: '#E6EDF3',
              }}
              formatter={(value: number) => [`${value.toFixed(1)}%`, 'PPC']}
              labelStyle={{ color: '#8B949E', marginBottom: 4 }}
              cursor={{ stroke: '#30363D' }}
            />
            <Line
              type="monotone"
              dataKey="ppc"
              stroke="#14B8A6"
              strokeWidth={2}
              dot={{ fill: '#14B8A6', r: 3, strokeWidth: 0 }}
              activeDot={{ fill: '#39D2C0', r: 5, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
