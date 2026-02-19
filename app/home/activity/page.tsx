'use client';

import { useState } from 'react';
import { useHousehold } from '@/hooks/home/useHousehold';
import { ActivityFeed, type ActivityFilter } from '@/components/home/activity/ActivityFeed';
import { ActivityFilterChips } from '@/components/home/activity/ActivityFilterChips';

// ══════════════════════════════════════════════════════════
// COMPONENT: ActivityPage
// ══════════════════════════════════════════════════════════

/**
 * AC-1: Strona /home/activity renderuje się bez błędów
 * AC-7: ActivityFilters — filter chips horizontal scroll
 */
export default function ActivityPage() {
  const [activeFilter, setActiveFilter] = useState<ActivityFilter>('all');
  const { household, loading, error } = useHousehold();

  // Household loading state
  if (loading) {
    return (
      <div className="p-[18px]">
        <div className="flex items-center gap-[10px] mb-[16px]">
          <h2 className="text-[18px] font-extrabold text-[#e6edf3] flex-1">📡 Feed aktywności</h2>
        </div>
        <div className="animate-pulse space-y-[12px]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[80px] bg-[#1a1730] border border-[#2a2540] rounded-[10px]" />
          ))}
        </div>
      </div>
    );
  }

  // Household error state
  if (error || !household) {
    return (
      <div className="p-[18px]">
        <div className="flex items-center gap-[10px] mb-[16px]">
          <h2 className="text-[18px] font-extrabold text-[#e6edf3] flex-1">📡 Feed aktywności</h2>
        </div>
        <div className="text-center py-[48px]">
          <p className="text-[#f87171] mb-[12px]">Nie udało się załadować danych household</p>
          <p className="text-[12px] text-[#6b7280]">{error || 'Sprawdź połączenie i spróbuj ponownie'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-[18px]">
      {/* Header */}
      <div className="flex items-center gap-[10px] mb-[16px]">
        <h2 className="text-[18px] font-extrabold text-[#e6edf3] flex-1">📡 Feed aktywności</h2>
      </div>

      {/* Filter chips (AC-7) */}
      <ActivityFilterChips
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {/* Activity feed (AC-3, AC-8, AC-9) */}
      <ActivityFeed 
        householdId={household.id}
        filter={activeFilter}
      />
    </div>
  );
}
