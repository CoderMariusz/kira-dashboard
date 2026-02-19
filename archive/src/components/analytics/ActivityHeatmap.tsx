/**
 * ActivityHeatmap Component
 * Kira Dashboard - CSS grid heatmap showing activity over time
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
  const isEmpty = !data || data.length === 0;

  return (
    <ChartCard
      title="Activity Heatmap"
      empty={isEmpty}
      emptyMessage="No activity data"
      className="lg:col-span-2"
      data-testid="activity-heatmap"
      extra={
        !isEmpty && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className="w-4 h-4 rounded-sm"
                style={{ backgroundColor: INTENSITY_COLORS[level] }}
              />
            ))}
            <span>More</span>
          </div>
        )
      }
    >
      {!isEmpty && (
        <div className="flex gap-1 overflow-x-auto pb-2">
          {Array.from({ length: Math.ceil(data.length / 7) }, (_, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {Array.from({ length: 7 }, (_, dayIndex) => {
                const dataIndex = weekIndex * 7 + dayIndex;
                const day = data[dataIndex];
                if (!day) return null;

                return (
                  <div
                    key={day.date}
                    data-testid={`heatmap-cell-${dataIndex}`}
                    data-intensity={day.intensity}
                    className="w-4 h-4 rounded-sm"
                    style={{ backgroundColor: INTENSITY_COLORS[day.intensity] }}
                    title={`${day.date}: activities: ${day.count}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}
    </ChartCard>
  );
}
