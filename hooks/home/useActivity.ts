'use client'

import { useState, useEffect } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/realtime-js'
import { createClient } from '@/lib/supabase/client'
import type { ActivityEvent } from '@/types/home'

// ──────────────────────────────────────────────────
// Return type
// ──────────────────────────────────────────────────
interface UseActivityReturn {
  events:       ActivityEvent[]
  loading:      boolean
  error:        string | null
  hasNextPage:  boolean
  fetchNextPage: () => Promise<void>
  refetch:      () => void
}

// ──────────────────────────────────────────────────
// Hook — AC-5: real-time activity feed
// ──────────────────────────────────────────────────
export function useActivity(householdId: string | undefined, limit = 20): UseActivityReturn {
  const [events, setEvents]   = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  // v1 stub — pagination not present in Supabase realtime (AC-11)
  const hasNextPage = false
  const fetchNextPage = async (): Promise<void> => {}

  // ────────────────────────────────────────────────
  // 1. INITIAL FETCH — direct Supabase client (read-only, no API route needed)
  // ────────────────────────────────────────────────
  const fetchItems = async (mounted: { current: boolean }) => {
    if (!householdId) {
      if (mounted.current) setLoading(false)
      return
    }

    const supabase = createClient()

    if (mounted.current) {
      setLoading(true)
      setError(null)
    }

    const { data, error: fetchError } = await supabase
      .from('activity_log')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (!mounted.current) return

    if (fetchError) {
      setError('Nie udało się załadować aktywności')
      console.warn('[useActivity] fetch error:', fetchError)
    } else {
      setEvents((data ?? []) as ActivityEvent[])
    }
    setLoading(false)
  }

  const refetch = () => {
    const mounted = { current: true }
    void fetchItems(mounted)
  }

  useEffect(() => {
    const mounted = { current: true }
    void fetchItems(mounted)
    return () => { mounted.current = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId, limit])

  // ────────────────────────────────────────────────
  // 2. REALTIME SUBSCRIPTION — INSERT only (old events never change)
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (!householdId) return
    const supabase = createClient()
    let mounted = true

    const channel = supabase
      .channel(`activity:${householdId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'activity_log',
          filter: `household_id=eq.${householdId}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          if (!mounted) return
          const newEvent = payload.new as unknown as ActivityEvent
          setEvents(prev => {
            // Deduplicate by id, prepend newest event, trim to limit — AC-5
            if (prev.some(e => e.id === newEvent.id)) return prev
            const updated = [newEvent, ...prev]
            return updated.slice(0, limit)
          })
        }
      )
      .subscribe()

    // AC-7: cleanup on unmount
    return () => {
      mounted = false
      void supabase.removeChannel(channel)
    }
  }, [householdId, limit])

  return { events, loading, error, hasNextPage, fetchNextPage, refetch }
}
