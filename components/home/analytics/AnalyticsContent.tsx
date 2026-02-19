// components/home/analytics/AnalyticsContent.tsx
// Client component — zawartość strony analytics (wykresy + karty)

'use client';

import { useAnalytics } from '@/hooks/home/useAnalytics';
import { OverviewCards } from './OverviewCards';
import { ShoppingChart } from './ShoppingChart';
import { CompletionChart } from './CompletionChart';
import { PriorityChart } from './PriorityChart';
import { ActivityHeatmap } from './ActivityHeatmap';

function ChartSkeleton() {
  return <div className="animate-pulse h-[280px] bg-[#2a2540] rounded-lg" />;
}

export function AnalyticsContent() {
  const { data, isLoading, isError, refetch } = useAnalytics();

  if (isError) {
    return (
      <div className="flex flex-col items-center py-12 gap-4">
        <p className="text-[#f85149] text-sm">
          Nie udało się załadować danych analytics. Spróbuj ponownie.
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-[#2a2540] text-[#e6edf3] rounded-lg text-sm hover:bg-[#3a3560] transition-colors"
        >
          Odśwież
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-[#e6edf3] text-xl font-extrabold flex-1">📊 Analytics</h1>
        <span className="text-xs px-3 py-1 bg-[#2d1b4a] border border-[#5b21b6] text-[#c4b5fd] rounded-full font-semibold">
          👑 HELPER+ only
        </span>
      </div>

      {/* Overview Cards */}
      <OverviewCards data={isLoading ? null : (data?.overview ?? null)} />

      {/* Charts row 1: Shopping + Completion */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ShoppingChart data={data?.shopping ?? []} />
          <CompletionChart data={data?.completion ?? []} />
        </div>
      )}

      {/* Charts row 2: Priority + Heatmap */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PriorityChart data={data?.priority ?? []} />
          <ActivityHeatmap data={data?.heatmap ?? []} />
        </div>
      )}
    </div>
  );
}
