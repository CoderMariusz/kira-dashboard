/**
 * app/api/lessons/route.ts
 * STORY-8.2 — POST /api/lessons
 *
 * Appends lesson entries to LESSONS_LEARNED.md in markdown format.
 *
 * Auth: requireAdmin — 401 for unauthenticated, 403 for non-admin.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { appendFile, writeFile, access } from 'fs/promises'
import { requireAdmin } from '@/lib/auth/requireRole'
import type { RequireAdminResult } from '@/lib/auth/requireRole'

// ─── File paths ───────────────────────────────────────────────────────────────

const KIRA_DIR = '/Users/mariuszkrawczyk/codermariusz/kira/.kira'
const LESSONS_FILE = `${KIRA_DIR}/LESSONS_LEARNED.md`

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Type guard: admin auth result is an error response */
function isAdminErrorResponse(result: RequireAdminResult): result is NextResponse {
  return result instanceof Response
}

interface PostLessonBody {
  id: string
  title: string
  severity: 'info' | 'warning' | 'critical'
  category: string
  body: string
  root_cause?: string
  fix?: string
  lesson: string
  tags?: string[]
  date?: string
}

// ─── POST /api/lessons ───────────────────────────────────────────────────────

export async function POST(req: Request): Promise<Response> {
  // 1. Admin auth check
  const authResult = await requireAdmin(req)
  if (isAdminErrorResponse(authResult)) return authResult

  // 2. Parse and validate body
  let body: PostLessonBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "Nieprawidłowy format JSON" },
      { status: 400 }
    )
  }

  // 3. Validate required fields
  if (!body.id) {
    return NextResponse.json(
      { error: "Pole 'id' jest wymagane" },
      { status: 400 }
    )
  }
  if (!body.title) {
    return NextResponse.json(
      { error: "Pole 'title' jest wymagane" },
      { status: 400 }
    )
  }
  if (body.title.length < 3) {
    return NextResponse.json(
      { error: "Pole 'title' musi mieć min. 3 znaki" },
      { status: 400 }
    )
  }
  if (body.title.length > 200) {
    return NextResponse.json(
      { error: "Pole 'title' może mieć max. 200 znaków" },
      { status: 400 }
    )
  }
  if (!body.severity) {
    return NextResponse.json(
      { error: "Pole 'severity' jest wymagane" },
      { status: 400 }
    )
  }
  if (!['info', 'warning', 'critical'].includes(body.severity)) {
    return NextResponse.json(
      { error: "Pole 'severity' musi być 'info', 'warning' lub 'critical'" },
      { status: 400 }
    )
  }
  if (!body.category) {
    return NextResponse.json(
      { error: "Pole 'category' jest wymagane" },
      { status: 400 }
    )
  }
  if (!body.body) {
    return NextResponse.json(
      { error: "Pole 'body' jest wymagane" },
      { status: 400 }
    )
  }
  if (!body.lesson) {
    return NextResponse.json(
      { error: "Pole 'lesson' jest wymagane" },
      { status: 400 }
    )
  }
  if (body.lesson.length < 10) {
    return NextResponse.json(
      { error: "Pole 'lesson' musi mieć min. 10 znaków" },
      { status: 400 }
    )
  }

  // 4. Generate date (default: today)
  const date = body.date || new Date().toISOString().split('T')[0]

  // 5. Build markdown block
  const tagsStr = body.tags && body.tags.length > 0 ? body.tags.join(', ') : ''

  const lessonBlock = `### ${body.id}: ${body.title}

**Severity:** ${body.severity}
**Tags:** ${tagsStr || 'none'}
**Date:** ${date}

${body.body}

**Root cause:** ${body.root_cause || 'TBD'}

**Fix:** ${body.fix || 'TBD'}

**Lesson:** ${body.lesson}

---
`

  // 6. Check if file exists, then append or create
  let fileExists = false
  try {
    await access(LESSONS_FILE)
    fileExists = true
  } catch {
    fileExists = false
  }

  try {
    if (fileExists) {
      await appendFile(LESSONS_FILE, '\n' + lessonBlock, 'utf-8')
    } else {
      // File doesn't exist - create it with header
      const header = `# LESSONS_LEARNED.md — Kira Bridge\n\n## 1. BUGS WE HIT\n\n`
      await writeFile(LESSONS_FILE, header + lessonBlock, 'utf-8')
    }
  } catch (err: unknown) {
    const fsErr = err as NodeJS.ErrnoException
    return NextResponse.json(
      { error: `Błąd zapisu pliku: ${fsErr.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { success: true },
    { status: 201 }
  )
}
