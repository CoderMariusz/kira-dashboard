'use client'
import { useState } from 'react'
import { ActivityFeed } from '@/components/home/activity/ActivityFeed'
import { ActivityFilterChips, type ActivityFilter } from '@/components/home/activity/ActivityFilterChips'
import { useHousehold } from '@/hooks/home/useHousehold'

export default function ActivityPage() {
  const { household, loading } = useHousehold()
  const [filter, setFilter] = useState<ActivityFilter>('all')

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-[#4b4569] text-sm animate-pulse">
      Ładowanie…
    </div>
  )

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold" style={{ color: '#e6edf3' }}>📋 Aktywność</h1>
      <ActivityFilterChips activeFilter={filter} onFilterChange={setFilter} />
      <ActivityFeed householdId={household?.id} filter={filter} />
    </div>
  )
}
