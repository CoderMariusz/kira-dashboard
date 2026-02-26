'use client'

// hooks/useRealtimePipeline.ts
// STORY-12.13 — Supabase Realtime live updates for stories + runs.
// Replaces SSE (/api/events) with WebSocket-based Supabase Realtime subscriptions.
//
// Strategy:
// - SWR for initial data load (+ fallback polling when RT offline)
// - Supabase Realtime (postgres_changes) for push updates
// - realtimeConnected flag disables polling when WebSocket is active
// - Cleanup on unmount via supabase.removeChannel()

import { useEffect, useState, useCallback } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

/** Interval (ms) used for SWR polling when Realtime is disconnected. */
const FALLBACK_POLL_INTERVAL_MS = 30_000

/** Generic JSON fetcher for SWR. */
async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`[useRealtimePipeline] fetch error ${res.status}: ${url}`)
  }
  return res.json() as Promise<T>
}

export interface UseRealtimePipelineOptions {
  /**
   * Project ID passed to /api/stories and /api/runs endpoints.
   * Defaults to NEXT_PUBLIC_BRIDGE_PROJECT env var or 'kira-dashboard'.
   */
  project?: string
  /**
   * When false the hook is paused (no subscriptions, no fetches).
   * Defaults to true.
   */
  enabled?: boolean
}

export interface UseRealtimePipelineReturn {
  /** Raw data returned by GET /api/stories?project=... */
  stories: unknown
  /** Raw data returned by GET /api/runs?project=... */
  runs: unknown
  /** true when Supabase Realtime WebSocket is actively SUBSCRIBED. */
  realtimeConnected: boolean
  /** Re-fetch stories immediately (also called on Realtime INSERT/UPDATE events). */
  mutateStories: () => Promise<unknown>
  /** Re-fetch runs immediately (also called on Realtime INSERT events). */
  mutateRuns: () => Promise<unknown>
}

/**
 * Hook combining SWR data fetching with Supabase Realtime subscriptions.
 *
 * AC-1: bridge_stories INSERT/UPDATE triggers story list refresh.
 * AC-2: bridge_runs INSERT triggers runs list refresh.
 * AC-3: When Realtime disconnected, SWR falls back to polling every 30s.
 * AC-4: Supabase JS client auto-reconnects on connection loss.
 * AC-5: Channel is unsubscribed on component unmount (no memory leaks).
 *
 * EC-2: mutateStories/mutateRuns wrapped in useCallback to stabilise
 *       dependency array — avoids spurious effect re-runs.
 * EC-3: Multiple rapid changes → multiple mutate() calls → SWR deduplicates
 *       (only 1 actual fetch within dedupingInterval window).
 */
export function useRealtimePipeline(
  opts: UseRealtimePipelineOptions = {}
): UseRealtimePipelineReturn {
  const project =
    opts.project ??
    process.env.NEXT_PUBLIC_BRIDGE_PROJECT ??
    'kira-dashboard'
  const enabled = opts.enabled ?? true

  const [realtimeConnected, setRealtimeConnected] = useState(false)

  // ─── SWR: initial load + fallback polling ────────────────────────────────
  // refreshInterval is 0 when Realtime is active (no polling needed).
  // When Realtime drops, it flips to FALLBACK_POLL_INTERVAL_MS (AC-3).
  const {
    data: stories,
    mutate: _mutateStories,
  } = useSWR(
    enabled ? `/api/stories?project=${project}` : null,
    fetcher,
    {
      refreshInterval: realtimeConnected ? 0 : FALLBACK_POLL_INTERVAL_MS,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  const {
    data: runs,
    mutate: _mutateRuns,
  } = useSWR(
    enabled ? `/api/runs?project=${project}&limit=50` : null,
    fetcher,
    {
      refreshInterval: realtimeConnected ? 0 : FALLBACK_POLL_INTERVAL_MS,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  // EC-2: stable mutate references → prevent useEffect dependency loop
  const mutateStories = useCallback(
    () => _mutateStories(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )
  const mutateRuns = useCallback(
    () => _mutateRuns(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  // ─── Supabase Realtime subscription ──────────────────────────────────────
  useEffect(() => {
    if (!enabled) return

    // Singleton client — realtime requires the same client instance.
    const supabase = createClient()

    // Single channel for both tables (reduces connections — EC-1 free tier).
    const channel: RealtimeChannel = supabase
      .channel('pipeline-changes')
      // AC-1: Story INSERT or UPDATE → refresh story list
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bridge_stories',
          filter: `project_id=eq.${project}`,
        },
        () => {
          void mutateStories()
        }
      )
      // AC-2: Run INSERT → refresh runs list
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bridge_runs',
        },
        () => {
          void mutateRuns()
        }
      )
      .subscribe((status: string) => {
        // AC-3: flip polling on/off based on connection status
        setRealtimeConnected(status === 'SUBSCRIBED')
      })

    // AC-5: cleanup on unmount — removes channel and closes WebSocket
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [project, enabled, mutateStories, mutateRuns])

  return {
    stories,
    runs,
    realtimeConnected,
    mutateStories,
    mutateRuns,
  }
}
