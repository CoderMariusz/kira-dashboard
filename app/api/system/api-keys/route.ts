/**
 * app/api/system/api-keys/route.ts
 * STORY-10.4 — GET /api/system/api-keys
 *
 * Returns masked API key status for configured providers.
 * Auth: requireAdmin
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireRole'

export function maskApiKey(value: string | undefined): string {
  if (!value || value.length < 8) return '••••••••'
  return value.slice(0, 3) + '••••••' + value.slice(-4)
}

const API_KEY_DEFS = [
  { envKey: 'ANTHROPIC_API_KEY', name: 'Anthropic API Key' },
  { envKey: 'MOONSHOT_API_KEY', name: 'Moonshot (Kimi) API Key' },
  { envKey: 'ZAI_API_KEY', name: 'Z.AI (GLM) API Key' },
  { envKey: 'OPENROUTER_API_KEY', name: 'OpenRouter API Key' },
]

export async function GET(request: Request) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const keys = API_KEY_DEFS.map(({ envKey, name }) => {
    const value = process.env[envKey]
    return {
      name,
      maskedValue: maskApiKey(value),
      status: value ? 'active' as const : 'unknown' as const,
      expiresAt: null,
    }
  })

  return NextResponse.json({ keys })
}
