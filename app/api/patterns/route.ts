/**
 * app/api/patterns/route.ts
 * STORY-12.11 — GET + POST /api/patterns (Supabase migration)
 *
 * GET: reads patterns + lessons from kira_patterns / kira_lessons tables
 * POST: inserts a new pattern into kira_patterns (ADMIN only)
 *
 * Auth: requireAuth for GET, requireAdmin for POST.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireAdmin } from '@/lib/auth/requireRole'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HEADERS = { 'Cache-Control': 'no-store' } as const

// ─── GET /api/patterns ────────────────────────────────────────────────────────

export async function GET(request: Request): Promise<Response> {
  // AC-5: Auth check
  const auth = await requireAuth()
  if (auth instanceof Response) return auth

  const url     = new URL(request.url)
  const project = url.searchParams.get('project') ?? 'kira-dashboard'
  const type    = url.searchParams.get('type')    // PATTERN | ANTI_PATTERN
  const search  = url.searchParams.get('search')

  const supabase = await createClient()

  // Patterns query
  let pQuery = supabase.from('kira_patterns').select('*').eq('project_id', project)
  if (type)   pQuery = pQuery.eq('type', type)
  if (search) pQuery = pQuery.or(`text.ilike.%${search}%,category.ilike.%${search}%`)
  const { data: patterns } = await pQuery.order('created_at', { ascending: false })

  // Lessons query
  let lQuery = supabase.from('kira_lessons').select('*').eq('project_id', project)
  if (search) lQuery = lQuery.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
  const { data: lessons } = await lQuery.order('date', { ascending: false })

  return NextResponse.json(
    {
      patterns: patterns ?? [],
      lessons: lessons ?? [],
      meta: {
        total_patterns: patterns?.length ?? 0,
        total_lessons:  lessons?.length ?? 0,
        source: 'supabase',
      },
    },
    { headers: HEADERS }
  )
}

// ─── POST /api/patterns ──────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  // AC-5: Admin auth check
  const auth = await requireAdmin()
  if (auth instanceof Response) return auth

  const body = await request.json()
  const { type, category, text, tags, model, domain } = body

  // Validation
  if (!type || !category || !text) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400, headers: HEADERS }
    )
  }

  const id = `pat-${Date.now().toString(36)}`
  const supabase = await createClient()

  const { error } = await supabase.from('kira_patterns').insert({
    id,
    project_id: 'kira-dashboard',
    source: type === 'ANTI_PATTERN' ? 'anti-patterns.md' : 'patterns.md',
    type,
    category,
    text,
    tags: tags ?? [],
    model: model ?? null,
    domain: domain ?? null,
    date: new Date().toISOString().split('T')[0],
  })

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: HEADERS }
    )
  }

  return NextResponse.json(
    { id, ok: true },
    { status: 201, headers: HEADERS }
  )
}
