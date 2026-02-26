// app/api/stories/route.ts
// GET /api/stories — returns stories from bridge_stories Supabase table.
// STORY-12.7: Supabase Migration - Stories list endpoint

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/requireRole'
import type { ApiErrorResponse } from '@/types/api'

/**
 * Story row as returned by this endpoint.
 * Compatible with frontend BridgeStory / Story types.
 */
export interface StoriesApiStory {
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
}

/** Response from GET /api/stories */
export interface StoriesListResponse {
  data: StoriesApiStory[]
  meta: {
    total: number
  }
}

/**
 * GET /api/stories
 *
 * Query params:
 *   - project: project_id filter (default: 'kira-dashboard')
 *   - epic:    epic_id filter (optional)
 *   - status:  story status filter (optional)
 *   - limit:   max rows, capped at 1000 (default: 500)
 *
 * Response: { data: StoriesApiStory[], meta: { total: number } }
 * Requires: authenticated session
 */
export async function GET(request: NextRequest): Promise<Response> {
  // AC-4: Auth required
  const auth = await requireAuth()
  if (auth instanceof NextResponse) {
    return auth
  }

  const project = request.nextUrl.searchParams.get('project') ?? 'kira-dashboard'
  const epic    = request.nextUrl.searchParams.get('epic')
  const status  = request.nextUrl.searchParams.get('status')
  const limit   = Math.min(
    parseInt(request.nextUrl.searchParams.get('limit') ?? '500', 10),
    1000
  )

  try {
    const supabase = await createClient()

    // Build query — apply optional filters BEFORE ordering (Supabase builder pattern)
    let query = supabase
      .from('bridge_stories')
      .select('*', { count: 'exact' })
      .eq('project_id', project)

    // Apply optional filters (AC-2)
    if (epic)   query = query.eq('epic_id', epic)
    if (status) query = query.eq('status', status)

    // Apply ordering and limit last
    const { data, error, count } = await query
      .order('epic_id')
      .order('id')
      .limit(limit)

    if (error) {
      console.error('[stories] Failed to fetch bridge_stories:', error.message)
      const errorResponse: ApiErrorResponse = { error: error.message }
      return NextResponse.json(errorResponse, { status: 500 })
    }

    // Map to API-stable shape — EC-1: null → []
    const stories: StoriesApiStory[] = (data ?? []).map((row) => ({
      id:                row.id,
      epic_id:           row.epic_id,
      title:             row.title,
      status:            row.status,
      difficulty:        row.difficulty ?? null,
      recommended_model: row.recommended_model ?? null,
      assigned_model:    row.assigned_model ?? null,
      domain:            row.domain ?? null,
      priority:          row.priority ?? null,
      estimated_effort:  row.estimated_effort ?? null,
      depends_on:        row.depends_on ?? [],
      blocks:            row.blocks ?? [],
    }))

    const response: StoriesListResponse = {
      data: stories,
      meta: { total: count ?? stories.length },
    }

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    console.error('[stories] Unexpected error:', err)
    const errorResponse: ApiErrorResponse = { error: 'Błąd serwera' }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
