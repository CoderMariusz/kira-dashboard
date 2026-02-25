// app/api/projects/switch/route.ts
// POST /api/projects/switch — set a project as current (is_current = 1) in Bridge DB
// Updates Bridge SQLite DB directly (same pattern as /api/projects/stats).

export const runtime = 'nodejs'

import { execSync } from 'child_process'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/utils/require-admin'

// ─── Constants ───────────────────────────────────────────────────────────────

const BRIDGE_DB =
  process.env.BRIDGE_DB_PATH ?? '/Users/mariuszkrawczyk/codermariusz/kira/data/bridge.db'
const CLI_TIMEOUT = 10_000

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeKey(key: string): string {
  // Only allow alphanumeric and hyphens (same as project_key validation in NewProjectWizard)
  if (!/^[a-z0-9-]+$/.test(key)) {
    throw new Error('Invalid project key format')
  }
  return key
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  // 1. AUTH CHECK
  const auth = await requireAdmin()
  if (!auth.success) {
    const body = await auth.response.json()
    return NextResponse.json(
      { error: body.error ?? 'Brak dostępu. Wymagana rola ADMIN.' },
      { status: auth.response.status },
    )
  }

  // 2. OFFLINE MODE
  if (process.env.NEXT_PUBLIC_BRIDGE_MODE === 'offline') {
    return NextResponse.json({ error: 'Bridge offline' }, { status: 503 })
  }

  // 3. PARSE BODY
  let project_key: string
  try {
    const body = (await request.json()) as { project_key?: unknown }
    if (!body.project_key || typeof body.project_key !== 'string') {
      return NextResponse.json({ error: 'Brak wymaganego pola: project_key' }, { status: 400 })
    }
    project_key = escapeKey(body.project_key)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Nieprawidłowy request body'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // 4. UPDATE Bridge DB via sqlite3 CLI
  try {
    // First check the project exists
    const checkRaw = execSync(
      `sqlite3 "${BRIDGE_DB}" "SELECT COUNT(*) FROM projects WHERE key='${project_key}'"`,
      { timeout: CLI_TIMEOUT, shell: '/bin/bash', encoding: 'utf-8' },
    ).trim()

    if (checkRaw === '0') {
      return NextResponse.json(
        { error: `Projekt '${project_key}' nie istnieje` },
        { status: 404 },
      )
    }

    // Set all projects to is_current=0, then set the selected one to 1
    const updateQuery = `
      UPDATE projects SET is_current = 0;
      UPDATE projects SET is_current = 1 WHERE key = '${project_key}';
    `.trim()

    execSync(
      `sqlite3 "${BRIDGE_DB}" "${updateQuery.replace(/\n/g, ' ').replace(/"/g, '\\"')}"`,
      { timeout: CLI_TIMEOUT, shell: '/bin/bash', encoding: 'utf-8' },
    )

    return NextResponse.json(
      { ok: true, project_key, switched_at: new Date().toISOString() },
      { status: 200 },
    )
  } catch (err) {
    console.error('[POST /api/projects/switch] error:', err)
    return NextResponse.json(
      { error: 'Bridge niedostępny lub błąd bazy danych' },
      { status: 503 },
    )
  }
}
