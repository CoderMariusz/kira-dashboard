/**
 * AnalyticsContent Component
 * Kira Dashboard - Client-side analytics content wrapper
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAnalyticsOverview, useCompletionTrend, usePriorityDistribution, useShoppingCategories, useActivityHeatmap } from '@/lib/hooks/useAnalytics';
import { OverviewCards } from '@/components/analytics/OverviewCards';
import { CompletionChart } from '@/components/analytics/CompletionChart';
import { PriorityChart } from '@/components/analytics/PriorityChart';
import { ShoppingChart } from '@/components/analytics/ShoppingChart';
import { ActivityHeatmap } from '@/components/analytics/ActivityHeatmap';
import { ExportButton } from '@/components/analytics/ExportButton';
import { useState } from 'react';

function AnalyticsContentInner() {
  const { data: overviewData, isLoading: overviewLoading } = useAnalyticsOverview();
  const { data: completionData, isLoading: completionLoading } = useCompletionTrend(30);
  const { data: priorityData, isLoading: priorityLoading } = usePriorityDistribution();
  const { data: shoppingData, isLoading: shoppingLoading } = useShoppingCategories();
  const { data: heatmapData, isLoading: heatmapLoading } = useActivityHeatmap(90);

  const isLoading = overviewLoading || completionLoading || priorityLoading || shoppingLoading || heatmapLoading;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <ExportButton tasks={[]} />
      </div>

      {isLoading && <div data-testid="loading-skeleton">Loading...</div>}

      <OverviewCards data={overviewData ?? null} />

      <div data-testid="charts-grid" className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {!isLoading && (
          <>
            <CompletionChart data={completionData ?? []} />
            <PriorityChart data={priorityData ?? []} />
            <ShoppingChart data={shoppingData ?? []} />
            <ActivityHeatmap data={heatmapData ?? []} />
          </>
        )}
      </div>
    </div>
  );
}

export function AnalyticsContent() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <AnalyticsContentInner />
    </QueryClientProvider>
  );
}
