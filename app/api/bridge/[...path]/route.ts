// app/api/bridge/[...path]/route.ts
// Next.js catch-all proxy dla Bridge API.
// Przeglądarka wywołuje /api/bridge/... → Next.js (server-side) → Bridge :8199
// Rozwiązuje CORS: przeglądarka rozmawia tylko z :3000 (same origin).

import { type NextRequest, NextResponse } from 'next/server'

const BRIDGE_URL = process.env.BRIDGE_URL ?? 'http://localhost:8199'

async function proxyToBridge(
  request: NextRequest,
  params: { path: string[] },
): Promise<NextResponse> {
  const bridgePath = '/' + params.path.join('/')
  const search = request.nextUrl.search
  const url = `${BRIDGE_URL}${bridgePath}${search}`

  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }

    const init: RequestInit = {
      method: request.method,
      headers,
      cache: 'no-store',
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = await request.text()
    }

    const response = await fetch(url, init)
    const data = await response.text()

    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') ?? 'application/json',
      },
    })
  } catch (err) {
    console.error('[bridge-proxy] error:', err)
    return NextResponse.json({ error: 'Bridge unreachable' }, { status: 503 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxyToBridge(request, await params)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxyToBridge(request, await params)
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
