/**
 * app/api/lessons/route.ts
 * STORY-12.11 — POST /api/lessons (Supabase migration)
 *
 * Inserts a new lesson into kira_lessons table with auto-generated OPS-XXX id.
 *
 * Auth: requireAdmin — 401 for unauthenticated, 403 for non-admin.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/requireRole'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HEADERS = { 'Cache-Control': 'no-store' } as const

// ─── POST /api/lessons ───────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  // AC-5: Admin auth check
  const auth = await requireAdmin()
  if (auth instanceof Response) return auth

  const body = await request.json()
  const { title, severity, description, root_cause, fix, story_id, tags } = body

  // Validation
  if (!title || !description) {
    return NextResponse.json(
      { error: 'Missing title or description' },
      { status: 400, headers: HEADERS }
    )
  }

  const supabase = await createClient()

  // Auto-generate next OPS-XXX id
  const { data: lastLesson } = await supabase
    .from('kira_lessons')
    .select('id')
    .like('id', 'OPS-%')
    .order('id', { ascending: false })
    .limit(1)
    .single()

  const lastNum = lastLesson ? parseInt(lastLesson.id.replace('OPS-', '')) : 0
  const nextId = `OPS-${String(lastNum + 1).padStart(3, '0')}`

  const { error } = await supabase.from('kira_lessons').insert({
    id: nextId,
    project_id: 'kira-dashboard',
    title,
    severity: severity ?? 'MEDIUM',
    description,
    root_cause: root_cause ?? null,
    fix: fix ?? null,
    story_id: story_id ?? null,
    tags: tags ?? [],
    date: new Date().toISOString().split('T')[0],
  })

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: HEADERS }
    )
  }

  return NextResponse.json(
    { id: nextId, ok: true },
    { status: 201, headers: HEADERS }
  )
}
