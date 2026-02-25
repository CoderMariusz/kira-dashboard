/**
 * app/api/system/restart-bridge/route.ts
 * STORY-10.4 — POST /api/system/restart-bridge
 *
 * Sends restart command to Bridge. Returns 503 if Bridge unreachable.
 * Auth: requireAdmin
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireRole'

export async function POST(request: Request) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const BRIDGE_URL = process.env.BRIDGE_URL ?? 'http://localhost:8000'
  const BRIDGE_TOKEN = process.env.BRIDGE_TOKEN ?? ''

  try {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 10000)
    const res = await fetch(`${BRIDGE_URL}/api/system/restart`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${BRIDGE_TOKEN}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return NextResponse.json({ success: true, message: 'Bridge restart zainicjowany — usługa wróci za chwilę' })
  } catch {
    return NextResponse.json({ success: false, error: 'Bridge jest niedostępny' }, { status: 503 })
  }
}
