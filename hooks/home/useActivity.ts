'use client'

import { useState, useEffect } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/realtime-js'
import { createClient } from '@/lib/supabase/client'
import type { ActivityEvent } from '@/types/home'

// ──────────────────────────────────────────────────
// Return type
// ──────────────────────────────────────────────────
interface UseActivityReturn {
  events:  ActivityEvent[]
  loading: boolean
  error:   string | null
}

// ──────────────────────────────────────────────────
// Hook — AC-5: real-time activity feed
// ──────────────────────────────────────────────────
export function useActivity(householdId: string | undefined, limit = 20): UseActivityReturn {
  const [events, setEvents]   = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  // ────────────────────────────────────────────────
  // 1. INITIAL FETCH — direct Supabase client (read-only, no API route needed)
  // ────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true

    async function fetchEvents() {
      if (!householdId) {
        if (mounted) setLoading(false)
        return
      }

      const supabase = createClient()

      if (mounted) {
        setLoading(true)
        setError(null)
      }

      const { data, error: fetchError } = await supabase
        .from('activity_log')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (!mounted) return

      if (fetchError) {
        setError('Nie udało się załadować aktywności')
        console.error('[useActivity] fetch error:', fetchError)
      } else {
        setEvents((data ?? []) as ActivityEvent[])
      }
      setLoading(false)
    }

    void fetchEvents()

    return () => { mounted = false }
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
            // Prepend newest event, trim to limit — AC-5
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

  return { events, loading, error }
}
