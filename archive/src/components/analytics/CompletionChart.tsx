/**
 * CompletionChart Component
 * Kira Dashboard - Line chart showing task completion trend
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
import { format } from 'date-fns';
import { ChartCard } from './ChartCard';

interface CompletionData {
  date: string;
  completed: number;
}

interface CompletionChartProps {
  data: CompletionData[];
}

export function CompletionChart({ data }: CompletionChartProps) {
  const isEmpty = !data || data.length === 0;

  const formattedData = isEmpty ? [] : data.map(item => ({
    ...item,
    formattedDate: format(new Date(item.date), 'MMM dd'),
  }));

  return (
    <ChartCard
      title="Completion Trend"
      empty={isEmpty}
      emptyMessage="No data"
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="formattedDate"
              tick={{ fontSize: 12 }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white p-2 border rounded shadow">
                      <p className="text-sm">{label}</p>
                      <p className="text-sm font-semibold">
                        Completed: {payload[0].value}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="completed"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              // @ts-ignore - for test compatibility
              data-testid="line"
              style={{ stroke: '#3B82F6' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
