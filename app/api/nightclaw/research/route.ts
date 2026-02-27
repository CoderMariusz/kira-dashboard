/**
 * app/api/nightclaw/research/route.ts
 * STORY-12.10 — GET /api/nightclaw/research migrated to Supabase
 *
 * Returns ResearchResponse: { files: ResearchFile[] }
 * Maps nightclaw_research rows to ResearchFile shape.
 * Auth: requireAuth — 401 for unauthenticated requests.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/requireRole'
import type { ResearchFile, ResearchResponse } from '@/types/nightclaw'

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request?: { nextUrl?: URL; url?: string }): Promise<Response> {
  // Auth check
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  // Parse optional status filter
  const url = request?.nextUrl ?? new URL(request?.url ?? 'http://localhost')
  const status = url.searchParams.get('status')

  const supabase = await createClient()

  let query = supabase
    .from('nightclaw_research')
    .select('slug, title, problem, solution, updated_at')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data } = await query

  const rows = data ?? []

  const files: ResearchFile[] = rows.map(row => ({
    filename: row.slug as string,
    title: row.title as string,
    preview: row.problem as string,
    content: row.solution
      ? `## Problem\n\n${row.problem}\n\n## Solution\n\n${row.solution}`
      : `## Problem\n\n${row.problem}`,
    modified_at: row.updated_at as string,
  }))

  const body: ResearchResponse = { files }

  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } })
}
