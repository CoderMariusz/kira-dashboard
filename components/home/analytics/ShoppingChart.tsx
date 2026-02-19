/**
 * ShoppingChart — bar chart zakupów per dzień (ostatnie 7 dni)
 */

'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { TooltipContentProps } from 'recharts/types/component/Tooltip';
import { ChartCard } from './ChartCard';

interface ShoppingDataPoint {
  date: string;
  label: string;
  count: number;
}

interface ShoppingChartProps {
  data: ShoppingDataPoint[];
}

const POLISH_DAYS: Record<string, string> = {
  Pn: 'Poniedziałek',
  Wt: 'Wtorek',
  Śr: 'Środa',
  Czw: 'Czwartek',
  Pt: 'Piątek',
  So: 'Sobota',
  Nd: 'Niedziela',
};

const TOOLTIP_STYLE = {
  background: '#13111c',
  border: '1px solid #2a2540',
  borderRadius: '6px',
  color: '#e6edf3',
  fontSize: '12px',
};

function ShoppingTooltip({ active, payload }: TooltipContentProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  if (!entry) return null;
  const item = entry.payload as ShoppingDataPoint;
  const fullDay = POLISH_DAYS[item.label] ?? item.label;
  return (
    <div style={TOOLTIP_STYLE} className="px-2 py-1">
      <p>{fullDay}: {item.count} produktów</p>
    </div>
  );
}

export function ShoppingChart({ data }: ShoppingChartProps) {
  const isEmpty = !data || data.length === 0;

  return (
    <ChartCard
      title="🛒 Zakupy — częstotliwość"
      subtitle="Liczba zakupionych produktów per dzień · ostatnie 7 dni"
      empty={isEmpty}
      emptyMessage="Brak danych zakupów za ostatnie 7 dni"
    >
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2540" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} />
            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
            <Tooltip content={ShoppingTooltip} />
            <Bar dataKey="count" fill="#10B981" radius={[3, 3, 0, 0]} name="produktów" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
