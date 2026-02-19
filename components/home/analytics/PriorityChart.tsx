/**
 * PriorityChart — doughnut chart rozkład zadań per priorytet
 */

'use client';

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import type { TooltipContentProps } from 'recharts/types/component/Tooltip';
import { ChartCard } from './ChartCard';

interface PriorityDataPoint {
  name: string;
  value: number;
  color: string;
}

interface PriorityChartProps {
  data: PriorityDataPoint[];
}

const TOOLTIP_STYLE = {
  background: '#13111c',
  border: '1px solid #2a2540',
  borderRadius: '6px',
  color: '#e6edf3',
  fontSize: '12px',
};

function PriorityTooltip({ active, payload }: TooltipContentProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  if (!entry) return null;
  const item = entry.payload as PriorityDataPoint;
  return (
    <div style={TOOLTIP_STYLE} className="px-2 py-1">
      <p className="font-semibold">{item.name}</p>
      <p>{item.value} zadań</p>
    </div>
  );
}

interface PieLabelProps {
  name?: string;
  percent?: number;
}

function renderLabel({ name, percent }: PieLabelProps): string {
  if (!name || percent === undefined || percent === 0) return '';
  return `${name}: ${(percent * 100).toFixed(1)}%`;
}

export function PriorityChart({ data }: PriorityChartProps) {
  const isEmpty = !data || data.length === 0 || data.every(d => d.value === 0);

  return (
    <ChartCard
      title="📊 Podział zadań wg priorytetu"
      empty={isEmpty}
      emptyMessage="Brak aktywnych zadań"
    >
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              dataKey="value"
              labelLine={false}
              label={renderLabel}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={PriorityTooltip} />
            <Legend wrapperStyle={{ fontSize: '11px', color: '#6b7280' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
