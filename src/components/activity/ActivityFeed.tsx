'use client';

import { ActivityItem, ActivityItemSkeleton } from './ActivityItem';
import { useActivity, useActivityRealtime, type ActivityFilters } from '@/lib/hooks/useActivity';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { UI_TEXT } from '@/lib/constants/activity';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface ActivityFeedProps {
  householdId: string | undefined;
  filters?: ActivityFilters;
}

// ═══════════════════════════════════════════════════════════
// COMPONENT: ActivityFeedSkeleton
// ═══════════════════════════════════════════════════════════

function ActivityFeedSkeleton() {
  return (
    <div className="space-y-3" data-testid="activity-feed-loading">
      {Array.from({ length: 5 }).map((_, index) => (
        <ActivityItemSkeleton key={index} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// COMPONENT: EmptyState
// ═══════════════════════════════════════════════════════════

function EmptyState() {
  return (
    <div className="text-center py-12 text-gray-500" data-testid="empty-state">
      <p className="text-lg">{UI_TEXT.noActivity}</p>
      <p className="text-sm mt-2">{UI_TEXT.noActivitySubtitle}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// COMPONENT: ErrorState
// ═══════════════════════════════════════════════════════════

interface ErrorStateProps {
  error: Error | null;
  onRetry: () => void;
}

function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="text-center py-12" data-testid="error-state">
      <p className="text-red-500 mb-4">{UI_TEXT.errorLoading}</p>
      <p className="text-sm text-gray-500 mb-4">{error?.message || UI_TEXT.retry}</p>
      <Button
        onClick={onRetry}
        variant="outline"
        className="gap-2"
        aria-label={UI_TEXT.retry}
      >
        <RefreshCw className="w-4 h-4" />
        {UI_TEXT.retry}
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// COMPONENT: LoadMoreButton
// ═══════════════════════════════════════════════════════════

interface LoadMoreButtonProps {
  onClick: () => void;
  isLoading: boolean;
  disabled: boolean;
}

function LoadMoreButton({ onClick, isLoading, disabled }: LoadMoreButtonProps) {
  return (
    <div className="text-center pt-4">
      <Button
        onClick={onClick}
        disabled={disabled}
        variant="outline"
        className="w-full sm:w-auto gap-2"
        aria-label={UI_TEXT.loadMore}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" role="status" />
            <span>{UI_TEXT.loading}</span>
          </>
        ) : (
          UI_TEXT.loadMore
        )}
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// COMPONENT: ActivityFeed
// ═══════════════════════════════════════════════════════════

export function ActivityFeed({ householdId, filters }: ActivityFeedProps) {
  // Set up realtime subscription
  useActivityRealtime(householdId);

  const {
    activities,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useActivity(householdId, filters);

  const isError = !!error;

  // Loading state
  if (isLoading) {
    return <ActivityFeedSkeleton />;
  }

  // Error state
  if (isError) {
    return <ErrorState error={error} onRetry={() => fetchNextPage()} />;
  }

  // Empty state
  if (activities.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-3" data-testid="activity-feed">
      {/* Activity list */}
      <div className="space-y-3">
        {activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>

      {/* Load More button */}
      {hasNextPage && (
        <LoadMoreButton
          onClick={() => fetchNextPage()}
          isLoading={isFetchingNextPage}
          disabled={isFetchingNextPage}
        />
      )}
    </div>
  );
}
