/**
 * app/api/system/cron-jobs/route.ts
 * STORY-10.4 — GET /api/system/cron-jobs
 *
 * Proxies OpenClaw cron job list. Returns empty array if OpenClaw offline.
 * Auth: requireAdmin
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireRole'

export async function GET(request: Request) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const OPENCLAW_API_URL = process.env.OPENCLAW_API_URL ?? 'http://localhost:3001'
  const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN ?? ''

  try {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 5000)
    const res = await fetch(`${OPENCLAW_API_URL}/api/cron/jobs`, {
      headers: { Authorization: `Bearer ${OPENCLAW_TOKEN}` },
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return NextResponse.json({ jobs: data.jobs ?? data })
  } catch {
    return NextResponse.json({ jobs: [], error: 'OpenClaw offline' })
  }
}
