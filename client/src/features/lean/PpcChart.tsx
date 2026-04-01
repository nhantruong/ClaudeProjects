import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { TrendingUpIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { PpcHistoryItem } from '@/lib/api/lean.api';

// ── Props ──────────────────────────────────────────────────────────────────────

interface PpcChartProps {
  data: PpcHistoryItem[];
}

// ── Component ──────────────────────────────────────────────────────────────────

export function PpcChart({ data }: PpcChartProps) {
  const chartData = data.map((d) => ({
    week: format(parseISO(d.weekStartDate), 'MMM d'),
    ppc: d.ppc,
  }));

  return (
    <div className="bg-surface-card border border-border rounded-lg p-5">
      {/* Heading */}
      <div className="flex items-center gap-2 mb-1">
        <TrendingUpIcon size={14} className="text-text-muted" aria-hidden="true" />
        <h2 className="text-heading-3 text-text-default">PPC Trend</h2>
      </div>
      <p className="text-small text-text-muted mb-5">
        Percent Plan Complete over the last {data.length} closed week
        {data.length !== 1 ? 's' : ''}. Target: 80%+.
      </p>

      {/* Chart or empty state */}
      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <TrendingUpIcon
            size={40}
            className="text-neutral-600 mb-3"
            aria-hidden="true"
          />
          <p className="text-heading-4 text-text-default mb-1">No PPC data yet</p>
          <p className="text-small text-text-muted">
            Close a weekly work plan to start tracking PPC.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 12, bottom: 0, left: -8 }}
          >
            <CartesianGrid stroke="#30363D" strokeDasharray="3 3" />
            <XAxis
              dataKey="week"
              tick={{ fill: '#8B949E', fontSize: 12, fontFamily: 'DM Mono, monospace' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fill: '#8B949E', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              label={{
                value: '%',
                position: 'insideTopLeft',
                fill: '#8B949E',
                fontSize: 12,
                offset: 8,
              }}
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
            {/* 80% target reference line */}
            <ReferenceLine
              y={80}
              stroke="#D29922"
              strokeDasharray="5 4"
              strokeWidth={1.5}
              label={{
                value: '80% target',
                position: 'insideTopRight',
                fill: '#D29922',
                fontSize: 11,
              }}
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
