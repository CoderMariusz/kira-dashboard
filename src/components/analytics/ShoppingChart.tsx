/**
 * ShoppingChart Component
 * Kira Dashboard - Bar chart showing shopping categories
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
import { ChartCard } from './ChartCard';

interface ShoppingData {
  category: string;
  count: number;
}

interface ShoppingChartProps {
  data: ShoppingData[];
}

export function ShoppingChart({ data }: ShoppingChartProps) {
  const isEmpty = !data || data.length === 0;
  const topData = isEmpty ? [] : data.slice(0, 10);

  return (
    <ChartCard
      title="Shopping Categories"
      empty={isEmpty}
      emptyMessage="No shopping items"
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="category"
              tick={{ fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as ShoppingData;
                  return (
                    <div className="bg-white p-2 border rounded shadow">
                      <p className="text-sm font-semibold">{data.category}</p>
                      <p className="text-sm">Items: {data.count}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="count"
              fill="#10B981"
              // @ts-ignore - for test compatibility
              data-testid="bar"
              style={{ fill: '#10B981' }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
