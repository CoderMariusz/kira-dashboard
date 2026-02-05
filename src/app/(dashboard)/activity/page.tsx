'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ActivityFilters } from '@/components/activity/ActivityFilters';
import { ActivityFeed } from '@/components/activity/ActivityFeed';
import { useHousehold } from '@/lib/hooks/useHousehold';
import { useActivityRealtime } from '@/lib/hooks/useActivity';

/**
 * Activity Page Inner
 * Uses useSearchParams which requires Suspense boundary.
 */
function ActivityPageInner() {
  const searchParams = useSearchParams();
  const { data: household, isLoading, error } = useHousehold();

  // Read filter state from URL params
  const entityType = searchParams.get('type') as 'task' | 'shopping' | 'reminder' | 'board' | null;
  const actorId = searchParams.get('actor') || undefined;

  // Only pass filters if at least one is set
  const hasFilters = entityType || actorId;
  const filters = hasFilters ? {
    entityType: entityType || undefined,
    actorId,
  } : undefined;

  // Enable real-time updates (always call hook, use enabled internally)
  useActivityRealtime(household?.id);

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton data-testid="skeleton-title" className="h-8 w-48" />
          <Skeleton data-testid="skeleton-desc" className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton data-testid="skeleton-item-1" className="h-16 w-full" />
          <Skeleton data-testid="skeleton-item-2" className="h-16 w-full" />
          <Skeleton data-testid="skeleton-item-3" className="h-16 w-full" />
          <Skeleton data-testid="skeleton-item-4" className="h-16 w-full" />
          <Skeleton data-testid="skeleton-item-5" className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error || !household) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">📊 Aktywność</CardTitle>
          <CardDescription>Historia zmian i aktywności</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold mb-2">
              {error ? 'Error loading household' : 'No household found'}
            </h2>
            <p className="text-muted-foreground">
              {error
                ? 'Please check your connection and try again'
                : 'Please set up your household first'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">📊 Aktywność</CardTitle>
        <CardDescription>Historia zmian i aktywności</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <ActivityFilters householdId={household.id} />
          <ActivityFeed householdId={household.id} filters={filters} />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Activity Page — wraps inner component in Suspense for useSearchParams
 */
export default function ActivityPage() {
  return (
    <div className="container mx-auto p-6">
      <Suspense
        fallback={
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        }
      >
        <ActivityPageInner />
      </Suspense>
    </div>
  );
}
