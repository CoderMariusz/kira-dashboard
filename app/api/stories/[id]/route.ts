// app/api/stories/[id]/route.ts
// GET /api/stories/[id] — returns story detail + runs from Supabase.
// STORY-12.7: Supabase Migration - Story detail endpoint

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/requireRole'
import type { ApiErrorResponse } from '@/types/api'
import type { BridgeSyncRun } from '@/types/api'

/**
 * Full story detail response including associated runs.
 */
export interface StoryDetailResponse {
  id: string
  epic_id: string
  title: string
  status: string
  difficulty: string | null
  recommended_model: string | null
  assigned_model: string | null
  domain: string | null
  priority: string | null
  estimated_effort: string | null
  depends_on: string[]
  blocks: string[]
  project_id: string
  file_path: string | null
  size: string | null
  definition_of_done: string | null
  created_at: string | null
  updated_at: string | null
  started_at: string | null
  synced_at: string | null
  runs: BridgeSyncRun[]
}

/**
 * GET /api/stories/[id]
 *
 * Query params:
 *   - project: project_id filter (default: 'kira-dashboard')
 *
 * Response: StoryDetailResponse (story fields + runs array)
 * Requires: authenticated session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  // Auth required
  const auth = await requireAuth()
  if (auth instanceof NextResponse) {
    return auth
  }

  const { id } = await params
  const project = request.nextUrl.searchParams.get('project') ?? 'kira-dashboard'

  try {
    const supabase = await createClient()

    // Fetch story from bridge_stories
    const { data: story, error: storyError } = await supabase
      .from('bridge_stories')
      .select('*')
      .eq('id', id)
      .eq('project_id', project)
      .single()

    if (storyError || !story) {
      const errorResponse: ApiErrorResponse = { error: 'Story not found' }
      return NextResponse.json(errorResponse, { status: 404 })
    }

    // Fetch runs for this story (most recent first, limit 50)
    const { data: runs } = await supabase
      .from('bridge_runs')
      .select('*')
      .eq('story_id', id)
      .order('started_at', { ascending: false })
      .limit(50)

    const response: StoryDetailResponse = {
      ...story,
      depends_on: story.depends_on ?? [],
      blocks:     story.blocks ?? [],
      runs:       runs ?? [],
    }

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    console.error('[stories/[id]] Unexpected error:', err)
    const errorResponse: ApiErrorResponse = { error: 'Błąd serwera' }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
