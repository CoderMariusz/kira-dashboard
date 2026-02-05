/**
 * ChartCard Component
 * Kira Dashboard - Shared card wrapper for charts
 */

'use client';

import { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  children: ReactNode;
  empty?: boolean;
  emptyMessage?: string;
  extra?: ReactNode;
  className?: string;
  'data-testid'?: string;
}

export function ChartCard({ title, children, empty = false, emptyMessage = 'No data', extra, className, 'data-testid': testId }: ChartCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className || ''}`} data-testid={testId}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        {extra}
      </div>
      {empty ? (
        <div className="h-64 flex items-center justify-center text-gray-500">
          {emptyMessage}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
