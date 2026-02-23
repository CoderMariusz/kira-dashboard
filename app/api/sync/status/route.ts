// app/api/sync/status/route.ts
// GET /api/sync/status — returns epics + stories from Supabase bridge_* tables.
// Used as fallback when Bridge API (localhost) is unavailable (Hybrid Mode / Vercel).
// STORY-5.9: Hybrid Mode

export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/utils/require-admin'
import type {
  SyncStatusResponse,
  BridgeSyncProject,
  BridgeSyncEpic,
  BridgeSyncStory,
} from '@/types/api'

export async function GET(): Promise<Response> {
  // ALWAYS check auth BEFORE calling any service
  const auth = await requireAdmin()
  if (!auth.success) {
    return auth.response
  }

  try {
    const supabase = await createClient()

    // Fetch projects
    const { data: projects, error: projectsError } = await supabase
      .from('bridge_projects')
      .select('*')
      .order('name', { ascending: true })

    if (projectsError) {
      console.error('[sync/status] Failed to fetch bridge_projects:', projectsError.message)
      return NextResponse.json(
        { error: 'Błąd pobierania projektów z Supabase' },
        { status: 500 }
      )
    }

    // Fetch epics
    const { data: epics, error: epicsError } = await supabase
      .from('bridge_epics')
      .select('*')
      .order('project_id', { ascending: true })
      .order('id', { ascending: true })

    if (epicsError) {
      console.error('[sync/status] Failed to fetch bridge_epics:', epicsError.message)
      return NextResponse.json(
        { error: 'Błąd pobierania epiców z Supabase' },
        { status: 500 }
      )
    }

    // Fetch stories
    const { data: stories, error: storiesError } = await supabase
      .from('bridge_stories')
      .select('*')
      .order('project_id', { ascending: true })
      .order('id', { ascending: true })

    if (storiesError) {
      console.error('[sync/status] Failed to fetch bridge_stories:', storiesError.message)
      return NextResponse.json(
        { error: 'Błąd pobierania stories z Supabase' },
        { status: 500 }
      )
    }

    // Build epics with nested stories
    const storiesMap = new Map<string, BridgeSyncStory[]>()
    for (const story of (stories ?? []) as BridgeSyncStory[]) {
      const key = `${story.project_id}::${story.epic_id}`
      const existing = storiesMap.get(key) ?? []
      existing.push(story)
      storiesMap.set(key, existing)
    }

    const epicsWithStories: BridgeSyncEpic[] = ((epics ?? []) as BridgeSyncEpic[]).map(
      (epic) => ({
        ...epic,
        stories: storiesMap.get(`${epic.project_id}::${epic.id}`) ?? [],
      })
    )

    // Determine synced_at from the most recent synced_at across all tables
    const allSyncedAt = [
      ...((projects ?? []) as BridgeSyncProject[]).map((p) => p.synced_at),
      ...((epics ?? []) as BridgeSyncEpic[]).map((e) => e.synced_at),
    ].filter(Boolean)

    const synced_at: string | null =
      allSyncedAt.length > 0
        ? (allSyncedAt.sort().reverse()[0] ?? null)
        : null

    const body: SyncStatusResponse = {
      source: 'supabase',
      synced_at,
      projects: (projects ?? []) as BridgeSyncProject[],
      epics: epicsWithStories,
    }

    return NextResponse.json(body)
  } catch (err) {
    console.error('[sync/status] Unexpected error:', err)
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 })
  }
}
