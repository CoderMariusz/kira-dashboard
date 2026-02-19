/**
 * CompletionChart — line chart % ukończonych zadań (ostatnie 14 dni)
 */

'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { TooltipContentProps } from 'recharts/types/component/Tooltip';
import { ChartCard } from './ChartCard';

interface CompletionDataPoint {
  date: string;
  label: string;
  percentage: number;
}

interface CompletionChartProps {
  data: CompletionDataPoint[];
}

const TOOLTIP_STYLE = {
  background: '#13111c',
  border: '1px solid #2a2540',
  borderRadius: '6px',
  color: '#e6edf3',
  fontSize: '12px',
};

function CompletionTooltip({ active, payload }: TooltipContentProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  if (!entry) return null;
  const item = entry.payload as CompletionDataPoint;
  return (
    <div style={TOOLTIP_STYLE} className="px-2 py-1">
      <p>{item.label}: {item.percentage}%</p>
    </div>
  );
}

export function CompletionChart({ data }: CompletionChartProps) {
  const isEmpty = !data || data.length === 0;

  // clamp percentages per spec (EC-4)
  const safeData = data.map(item => ({
    ...item,
    percentage: Math.min(100, Math.max(0, item.percentage)),
  }));

  return (
    <ChartCard
      title="✅ Task completion rate"
      subtitle="% ukończonych zadań · ostatnie 14 dni"
      empty={isEmpty}
      emptyMessage="Brak danych zadań za ostatnie 14 dni"
    >
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={safeData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2540" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip content={CompletionTooltip} />
            <Line
              type="monotone"
              dataKey="percentage"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              name="Ukończone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
