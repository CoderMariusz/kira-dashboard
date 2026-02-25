/**
 * app/api/system/status/route.ts
 * STORY-10.4 — GET /api/system/status
 *
 * Polls OpenClaw and Bridge health endpoints, returns aggregated status.
 * Auth: requireAdmin
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireRole'

const TIMEOUT_MS = 5000

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timeoutId)
    return res
  } catch {
    clearTimeout(timeoutId)
    throw new Error('timeout')
  }
}

export async function GET(request: Request) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const OPENCLAW_API_URL = process.env.OPENCLAW_API_URL ?? 'http://localhost:3001'
  const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN ?? ''
  const BRIDGE_URL = process.env.BRIDGE_URL ?? 'http://localhost:8000'
  const BRIDGE_TOKEN = process.env.BRIDGE_TOKEN ?? ''

  const [openclawResult, bridgeResult] = await Promise.allSettled([
    fetchWithTimeout(`${OPENCLAW_API_URL}/api/status`, {
      headers: { Authorization: `Bearer ${OPENCLAW_TOKEN}` },
    }, TIMEOUT_MS).then(r => r.json()),
    fetchWithTimeout(`${BRIDGE_URL}/api/health`, {
      headers: { Authorization: `Bearer ${BRIDGE_TOKEN}` },
    }, TIMEOUT_MS).then(r => r.json()),
  ])

  const openclaw = openclawResult.status === 'fulfilled' ? {
    version: openclawResult.value?.version ?? 'unknown',
    uptime: openclawResult.value?.uptime ?? 0,
    channels: openclawResult.value?.channels ?? { whatsapp: false, telegram: false },
  } : { version: 'unknown', uptime: 0, channels: { whatsapp: false, telegram: false } }

  const bridge = bridgeResult.status === 'fulfilled' ? {
    status: 'UP' as const,
    version: bridgeResult.value?.version ?? null,
    lastError: bridgeResult.value?.lastError ?? null,
  } : { status: 'DOWN' as const, version: null, lastError: null }

  return NextResponse.json({ openclaw, bridge })
}
