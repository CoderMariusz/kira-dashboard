/**
 * ActivityHeatmap — CSS grid heatmap aktywności rodziny
 */

'use client';

import { ChartCard } from './ChartCard';

interface HeatmapData {
  date: string;
  count: number;
  intensity: 0 | 1 | 2 | 3 | 4;
}

interface ActivityHeatmapProps {
  data: HeatmapData[];
}

const INTENSITY_COLORS: Record<number, string> = {
  0: '#EBEDF0',
  1: '#C6E48B',
  2: '#7BC96F',
  3: '#239A3B',
  4: '#196127',
};

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  // fallback gdy brak danych
  if (!data || data.length < 7) {
    return (
      <ChartCard title="🔥 Aktywność rodziny">
        <p className="text-[#4b4569] text-sm text-center py-8">
          Brak danych aktywności za ostatnie tygodnie
        </p>
      </ChartCard>
    );
  }

  const weeks = Math.ceil(data.length / 7);

  return (
    <ChartCard
      title="🔥 Aktywność rodziny"
      subtitle="Dzienna aktywność household · ostatnie tygodnie"
      extra={
        <div className="flex items-center gap-1 text-[10px] text-[#4b4569]">
          <span>Mniej</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: INTENSITY_COLORS[level] }}
            />
          ))}
          <span>Więcej</span>
        </div>
      }
    >
      <div className="flex gap-1 overflow-x-auto pb-2 mt-1">
        {Array.from({ length: weeks }, (_, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {Array.from({ length: 7 }, (_, dayIndex) => {
              const dataIndex = weekIndex * 7 + dayIndex;
              const day = data[dataIndex];
              if (!day) return <div key={dayIndex} className="w-4 h-4" />;

              return (
                <div
                  key={day.date}
                  data-testid={`heatmap-cell-${dataIndex}`}
                  data-intensity={day.intensity}
                  className="w-4 h-4 rounded-sm"
                  style={{ backgroundColor: INTENSITY_COLORS[day.intensity] }}
                  title={`${day.date}: ${day.count} aktywności`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </ChartCard>
  );
}
