/**
 * __tests__/api/system/api-keys.test.ts
 * STORY-10.4 — Unit tests for maskApiKey and GET /api/system/api-keys
 */

import { maskApiKey, GET } from '@/app/api/system/api-keys/route'
import { mockRequest } from '@/__tests__/helpers/fetch'

// Mock requireAdmin — allow
jest.mock('@/lib/auth/requireRole', () => ({
  requireAdmin: jest.fn().mockResolvedValue({ user: { id: 'test-user' }, role: 'ADMIN' }),
}))

// Mock next/server NextResponse
jest.mock('next/server', () => {
  class MockNextResponse extends Response {
    static override json(body: unknown, init?: ResponseInit): MockNextResponse {
      return new MockNextResponse(JSON.stringify(body), {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init?.headers as Record<string, string>) },
      })
    }
  }
  return { NextResponse: MockNextResponse }
})

describe('maskApiKey', () => {
  it('masks a typical API key preserving prefix and last 4 chars', () => {
    const masked = maskApiKey('sk-abc123456789')
    expect(masked).toMatch(/^sk-/)
    expect(masked).toMatch(/6789$/)
    expect(masked).toContain('••••')
  })

  it('never exposes more than 3-char prefix + 4-char suffix', () => {
    const value = 'sk-ant-api03-verylongapikey12345678'
    const masked = maskApiKey(value)
    // Total visible chars = 3 (prefix) + 4 (suffix) = 7 max
    const visible = masked.replace(/[•]/g, '')
    expect(visible.length).toBeLessThanOrEqual(7)
  })

  it('returns placeholder for undefined value', () => {
    expect(maskApiKey(undefined)).toBe('••••••••')
  })

  it('returns placeholder for empty string', () => {
    expect(maskApiKey('')).toBe('••••••••')
  })

  it('returns placeholder for short key (< 8 chars)', () => {
    expect(maskApiKey('abc123')).toBe('••••••••')
  })

  it('masks a key of exactly 8 chars correctly', () => {
    const masked = maskApiKey('abcdefgh')
    expect(masked).toMatch(/^abc/)
    expect(masked).toMatch(/efgh$/)
    expect(masked).toContain('••••••')
  })
})

describe('GET /api/system/api-keys', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('returns active status for set keys and unknown for missing keys', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-api-key-12345678'
    delete process.env.MOONSHOT_API_KEY
    delete process.env.ZAI_API_KEY
    delete process.env.OPENROUTER_API_KEY

    const req = mockRequest({ url: 'http://localhost/api/system/api-keys' })
    const res = await GET(req as unknown as Request)
    const body = await res.json()

    expect(body.keys).toHaveLength(4)
    const anthropic = body.keys.find((k: { name: string }) => k.name === 'Anthropic API Key')
    expect(anthropic.status).toBe('active')
    expect(anthropic.maskedValue).not.toContain('sk-ant-api-key')

    const moonshot = body.keys.find((k: { name: string }) => k.name === 'Moonshot (Kimi) API Key')
    expect(moonshot.status).toBe('unknown')
    expect(moonshot.maskedValue).toBe('••••••••')
  })

  it('returns expiresAt as null for all keys', async () => {
    const req = mockRequest({ url: 'http://localhost/api/system/api-keys' })
    const res = await GET(req as unknown as Request)
    const body = await res.json()

    for (const key of body.keys) {
      expect(key.expiresAt).toBeNull()
    }
  })
})
