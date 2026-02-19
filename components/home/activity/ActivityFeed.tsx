'use client';

import { useMemo } from 'react';
import { useActivity } from '@/hooks/home/useActivity';
import type { ActivityEvent } from '@/types/home';
import { ActivityItem, ActivityItemSkeleton } from './ActivityItem';
import type { ActivityFilter } from './ActivityFilterChips';
import { RefreshCw } from 'lucide-react';

// ══════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════

export interface ActivityFeedProps {
  householdId: string | undefined;
  filter: ActivityFilter;
}

// Re-export for page usage
export type { ActivityFilter } from './ActivityFilterChips';

// ══════════════════════════════════════════════════════════
// COMPONENT: ActivityFeedSkeleton
// ══════════════════════════════════════════════════════════

/**
 * AC-2: Stan ładowania — skeleton (5 kart)
 */
function ActivityFeedSkeleton() {
  return (
    <div 
      className="space-y-[12px]" 
      aria-label="Ładowanie aktywności" 
      data-testid="activity-feed-loading"
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <ActivityItemSkeleton key={i} />
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// COMPONENT: EmptyState
// ══════════════════════════════════════════════════════════

/**
 * AC-10: Empty state — brak aktywności
 */
function EmptyState() {
  return (
    <div className="text-center py-[48px]" data-testid="activity-empty-state">
      <div className="text-[48px] mb-[12px]">📡</div>
      <p className="text-[16px] font-bold text-[#e6edf3] mb-[6px]">Brak aktywności</p>
      <p className="text-[12px] text-[#6b7280]">Zacznij zarządzać domem!</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// COMPONENT: ErrorState
// ══════════════════════════════════════════════════════════

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="text-center py-[48px]" data-testid="activity-error-state">
      <p className="text-[#f87171] mb-[12px]">Nie udało się załadować aktywności</p>
      <p className="text-[12px] text-[#6b7280] mb-[16px]">{error || 'Sprawdź połączenie i spróbuj ponownie'}</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-[6px] mx-auto px-[16px] py-[8px] bg-[#2a2540] hover:bg-[#3b3d7a] text-[#e6edf3] text-[12px] rounded-[8px] transition-colors"
        aria-label="Spróbuj ponownie"
      >
        <RefreshCw className="w-[14px] h-[14px]" />
        Spróbuj ponownie
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// COMPONENT: ActivityFeed
// ══════════════════════════════════════════════════════════

/**
 * AC-1: Strona renderuje się bez błędów
 * AC-3: Feed wyświetla ostatnie 20 aktywności w porządku chronologicznym
 * AC-8: Filtrowanie — zmiana filtru przeładowuje feed
 * AC-9: Real-time update — nowe zdarzenie pojawia się bez odświeżania
 */
export function ActivityFeed({ householdId, filter }: ActivityFeedProps) {
  const {
    events,
    loading,
    error,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useActivity(householdId, 20);

  // Map UI filter keys to DB entity_type values (AC-8)
  const FILTER_MAP: Record<string, string> = {
    shopping: 'shopping_item',
    task:     'task',
    household: 'household',
  };

  // Client-side filtering (AC-8)
  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events;
    const mapped = FILTER_MAP[filter] ?? filter;
    return events.filter((event: ActivityEvent) => event.entity_type === mapped);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, filter]);

  // Loading state (AC-2)
  if (loading) {
    return <ActivityFeedSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <ErrorState 
        error={error} 
        onRetry={refetch} 
      />
    );
  }

  // Empty state (AC-10, EC-4)
  if (!filteredEvents || filteredEvents.length === 0) {
    return <EmptyState />;
  }

  // Filled state (AC-3)
  return (
    <div 
      className="bg-[#1a1730] border border-[#2a2540] rounded-[10px] p-[16px]" 
      data-testid="activity-feed"
    >
      <div className="flex flex-col">
        {filteredEvents.map((activity, index) => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            isLast={index === filteredEvents.length - 1}
          />
        ))}
      </div>

      {/* AC-11: "Załaduj więcej" — zawsze w DOM, ukryty gdy hasNextPage=false (v1 stub) */}
      <button
        onClick={fetchNextPage}
        className={`mt-[12px] w-full py-[8px] text-[12px] text-[#c4b5fd] bg-[#2a2540] hover:bg-[#3b3d7a] rounded-[8px] transition-colors${hasNextPage ? '' : ' hidden'}`}
        aria-label="Załaduj więcej aktywności"
      >
        Załaduj więcej
      </button>
    </div>
  );
}
