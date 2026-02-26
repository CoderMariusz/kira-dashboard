// app/api/epics/route.ts
// GET /api/epics — returns epics with progress from Supabase bridge_epics table.
// STORY-12.8: Supabase Migration - Epics endpoint

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/requireRole'
import type { ApiErrorResponse, ApiResponse, EpicWithProgress } from '@/types/api'

/**
 * GET /api/epics?project={projectId}
 * 
 * Returns list of epics from bridge_epics table with calculated progress.
 * Requires authentication.
 * 
 * Query params:
 *   - project: project_id to filter by (default: 'kira-dashboard')
 * 
 * Response: { data: EpicWithProgress[] }
 * Sorting: numerically by EPIC number (1, 2, 3... not 1, 10, 2)
 */
export async function GET(request: NextRequest): Promise<Response> {
  // AC-4: Auth required
  const auth = await requireAuth()
  if (auth instanceof NextResponse) {
    return auth
  }

  // Get project from query params
  const project = request.nextUrl.searchParams.get('project') ?? 'kira-dashboard'

  try {
    const supabase = await createClient()

    // AC-1: Fetch epics from Supabase
    const { data, error } = await supabase
      .from('bridge_epics')
      .select('*')
      .eq('project_id', project)

    if (error) {
      console.error('[epics] Failed to fetch bridge_epics:', error.message)
      const errorResponse: ApiErrorResponse = { error: error.message }
      return NextResponse.json(errorResponse, { status: 500 })
    }

    // AC-2: Calculate progress, AC-3: Sort numerically
    const epics: EpicWithProgress[] = (data ?? [])
      .map((e) => ({
        project_id: e.project_id,
        id: e.id,
        title: e.title,
        file_path: e.file_path,
        status: e.status,
        total_stories: e.total_stories ?? 0,
        done_stories: e.done_stories ?? 0,
        created_at: e.created_at,
        synced_at: e.synced_at,
        // EC-1: Avoid division by zero
        progress: e.total_stories > 0
          ? Math.round((e.done_stories / e.total_stories) * 100)
          : 0,
      }))
      .sort((a, b) => {
        // AC-3: Sort numerically by EPIC number (extract number from 'EPIC-N')
        const numA = parseInt(a.id.replace('EPIC-', ''), 10)
        const numB = parseInt(b.id.replace('EPIC-', ''), 10)
        return numA - numB
      })

    const response: ApiResponse<EpicWithProgress> = { data: epics }
    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    console.error('[epics] Unexpected error:', err)
    const errorResponse: ApiErrorResponse = { error: 'Błąd serwera' }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
