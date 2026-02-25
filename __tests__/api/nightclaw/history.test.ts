/**
 * __tests__/api/nightclaw/history.test.ts
 * STORY-9.2 — Integration tests for GET /api/nightclaw/history endpoint.
 * TDD: written before implementation (RED phase).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Mock next/server ─────────────────────────────────────────────────────────

class MockNextResponse extends Response {
  static override json(body: unknown, init?: ResponseInit): MockNextResponse {
    return new MockNextResponse(JSON.stringify(body), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers as Record<string, string>) },
    })
  }
}

jest.mock('next/server', () => ({
  NextResponse: MockNextResponse,
}))

// ─── Mock Supabase ────────────────────────────────────────────────────────────

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))

// ─── Mock fs/promises ─────────────────────────────────────────────────────────

const mockReaddir = jest.fn()
const mockReadFile = jest.fn()
const mockStat = jest.fn()

jest.mock('fs/promises', () => ({
  readdir: (...args: any[]) => mockReaddir(...args),
  readFile: (...args: any[]) => mockReadFile(...args),
  stat: (...args: any[]) => mockStat(...args),
}))

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { GET } from '@/app/api/nightclaw/history/route'
import {
  mockUserSession,
  mockNoSession,
} from '@/__tests__/helpers/auth'
import { mockRequest } from '@/__tests__/helpers/fetch'

// ─── Test fixtures ────────────────────────────────────────────────────────────

const DIGEST_OK = `# NightClaw Digest — 2026-02-25

## ✅ Co poszło dobrze
- EPIC-6 DONE

## 📊 Statystyki
Wszystko OK.
`

const DIGEST_WITH_OPEN_PROBLEMS = `# NightClaw Digest — 2026-02-24

## ✅ Co poszło dobrze
- Some good things

## 🔍 Otwarte problemy
- Problem 1: Gateway polling error
- Problem 2: Run.id=None bug

## 📊 Statystyki
Some stats.
`

const DIGEST_WITH_EMPTY_OPEN_PROBLEMS = `# NightClaw Digest — 2026-02-23

## ✅ Co poszło dobrze
- Good things

## 🔍 Otwarte problemy

## 📊 Statystyki
Stats here.
`

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate dates for the last N days (newest first)
 */
function getLastNDates(n: number): string[] {
  const dates: string[] = []
  const today = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/nightclaw/history', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── AC-AUTH: 401 without session ────────────────────────────────────────────

  it('returns 401 when unauthenticated (AC-AUTH)', async () => {
    mockNoSession()
    const res = await GET(mockRequest())
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toHaveProperty('error')
  })

  // ── AC-1: Returns 90 entries ────────────────────────────────────────────────

  it('returns 90 entries for the last 90 days (AC-1)', async () => {
    mockUserSession()
    mockReaddir.mockResolvedValue([]) // Empty directory

    const res = await GET(mockRequest())
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.entries).toHaveLength(90)
    expect(json.total_runs).toBe(0)
    expect(json.total_errors).toBe(0)
  })

  // ── AC-2: Correct ok/error/missing statuses ─────────────────────────────────

  it('returns status "ok" when file exists without open problems (AC-2)', async () => {
    mockUserSession()
    const today = new Date().toISOString().split('T')[0]
    
    mockReaddir.mockResolvedValue([`${today}.md`])
    mockReadFile.mockResolvedValue(DIGEST_OK)

    const res = await GET(mockRequest())
    const json = await res.json()

    const todayEntry = json.entries.find((e: any) => e.date === today)
    expect(todayEntry).toBeDefined()
    expect(todayEntry.status).toBe('ok')
  })

  it('returns status "error" when file exists with open problems (AC-2)', async () => {
    mockUserSession()
    const today = new Date().toISOString().split('T')[0]
    
    mockReaddir.mockResolvedValue([`${today}.md`])
    mockReadFile.mockResolvedValue(DIGEST_WITH_OPEN_PROBLEMS)

    const res = await GET(mockRequest())
    const json = await res.json()

    const todayEntry = json.entries.find((e: any) => e.date === today)
    expect(todayEntry).toBeDefined()
    expect(todayEntry.status).toBe('error')
  })

  it('returns status "missing" when file does not exist (AC-2)', async () => {
    mockUserSession()
    mockReaddir.mockResolvedValue([]) // Empty directory

    const res = await GET(mockRequest())
    const json = await res.json()

    // All 90 days should be "missing"
    expect(json.entries.every((e: any) => e.status === 'missing')).toBe(true)
  })

  it('returns status "ok" when open problems section is empty (AC-2 edge case)', async () => {
    mockUserSession()
    const today = new Date().toISOString().split('T')[0]
    
    mockReaddir.mockResolvedValue([`${today}.md`])
    mockReadFile.mockResolvedValue(DIGEST_WITH_EMPTY_OPEN_PROBLEMS)

    const res = await GET(mockRequest())
    const json = await res.json()

    const todayEntry = json.entries.find((e: any) => e.date === today)
    expect(todayEntry).toBeDefined()
    expect(todayEntry.status).toBe('ok')
  })

  // ── AC-3: Empty directory → all "missing" ───────────────────────────────────

  it('returns all "missing" when directory is empty (AC-3)', async () => {
    mockUserSession()
    mockReaddir.mockResolvedValue([])

    const res = await GET(mockRequest())
    const json = await res.json()

    expect(json.entries).toHaveLength(90)
    expect(json.entries.every((e: any) => e.status === 'missing')).toBe(true)
    expect(json.total_runs).toBe(0)
    expect(json.total_errors).toBe(0)
  })

  // ── AC-4: Sorted chronologically descending (newest first) ───────────────────

  it('returns entries sorted chronologically descending (newest first) (AC-4)', async () => {
    mockUserSession()
    const dates = getLastNDates(90)
    
    // Simulate files for first 5 days (newest)
    const files = dates.slice(0, 5).map(d => `${d}.md`)
    mockReaddir.mockResolvedValue(files)
    mockReadFile.mockResolvedValue(DIGEST_OK)

    const res = await GET(mockRequest())
    const json = await res.json()

    expect(json.entries).toHaveLength(90)
    
    // Check that dates are in descending order
    for (let i = 0; i < json.entries.length - 1; i++) {
      const current = new Date(json.entries[i].date)
      const next = new Date(json.entries[i + 1].date)
      expect(current.getTime()).toBeGreaterThan(next.getTime())
    }

    // First entry should be today
    expect(json.entries[0].date).toBe(dates[0])
  })

  // ── AC-5: Correct total_runs and total_errors counts ────────────────────────

  it('counts total_runs correctly (files that exist)', async () => {
    mockUserSession()
    const dates = getLastNDates(90)
    
    // Files for days 0, 1, 2 (3 files total)
    const files = dates.slice(0, 3).map(d => `${d}.md`)
    mockReaddir.mockResolvedValue(files)
    
    // All ok
    mockReadFile.mockResolvedValue(DIGEST_OK)

    const res = await GET(mockRequest())
    const json = await res.json()

    expect(json.total_runs).toBe(3)
    expect(json.total_errors).toBe(0)
  })

  it('counts total_errors correctly (files with open problems)', async () => {
    mockUserSession()
    const dates = getLastNDates(90)
    
    // Files for days 0, 1, 2 (3 files total)
    const files = dates.slice(0, 3).map(d => `${d}.md`)
    mockReaddir.mockResolvedValue(files)
    
    // First 2 have errors, 3rd is ok
    mockReadFile
      .mockResolvedValueOnce(DIGEST_WITH_OPEN_PROBLEMS)
      .mockResolvedValueOnce(DIGEST_WITH_OPEN_PROBLEMS)
      .mockResolvedValue(DIGEST_OK)

    const res = await GET(mockRequest())
    const json = await res.json()

    expect(json.total_runs).toBe(3)
    expect(json.total_errors).toBe(2)
  })

  // ── AC-6: Response shape ────────────────────────────────────────────────────

  it('returns correct response shape (AC-6)', async () => {
    mockUserSession()
    mockReaddir.mockResolvedValue([])

    const res = await GET(mockRequest())
    const json = await res.json()

    expect(json).toMatchObject({
      entries: expect.any(Array),
      total_runs: expect.any(Number),
      total_errors: expect.any(Number),
    })

    expect(json.entries[0]).toMatchObject({
      date: expect.any(String),
      status: expect.stringMatching(/^(ok|error|missing)$/),
    })
  })

  // ── AC-7: Handles filesystem errors gracefully ──────────────────────────────

  it('handles readdir errors gracefully (AC-7)', async () => {
    mockUserSession()
    mockReaddir.mockRejectedValue(new Error('ENOENT: directory not found'))

    const res = await GET(mockRequest())
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json).toHaveProperty('error')
  })

  // ── AC-8: Only processes .md files ──────────────────────────────────────────

  it('ignores non-.md files in directory (AC-8)', async () => {
    mockUserSession()
    const today = new Date().toISOString().split('T')[0]
    
    mockReaddir.mockResolvedValue([
      `${today}.md`,
      'some-other-file.txt',
      '2026-02-25.json',
      'README',
    ])
    mockReadFile.mockResolvedValue(DIGEST_OK)

    const res = await GET(mockRequest())
    const json = await res.json()

    // Should still return 90 entries
    expect(json.entries).toHaveLength(90)
    
    // Should count only the .md file
    expect(json.total_runs).toBe(1)
  })
})
