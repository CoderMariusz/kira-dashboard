/**
 * ChartCard — dark-theme wrapper card dla wykresów analytics
 */

'use client';

import { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  empty?: boolean;
  emptyMessage?: string;
  extra?: ReactNode;
  className?: string;
  'data-testid'?: string;
}

export function ChartCard({
  title,
  subtitle,
  children,
  empty = false,
  emptyMessage = 'Brak danych',
  extra,
  className,
  'data-testid': testId,
}: ChartCardProps) {
  return (
    <div
      className={`bg-[#1a1730] border border-[#2a2540] rounded-[10px] p-4 ${className ?? ''}`}
      data-testid={testId}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-[#e6edf3] text-[13px] font-bold">{title}</h3>
          {subtitle && (
            <p className="text-[#4b4569] text-[11px] mt-0.5">{subtitle}</p>
          )}
        </div>
        {extra}
      </div>
      {empty ? (
        <div className="h-44 flex items-center justify-center text-[#4b4569] text-sm text-center">
          {emptyMessage}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
