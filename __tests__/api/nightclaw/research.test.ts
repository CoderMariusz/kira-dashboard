/**
 * __tests__/api/nightclaw/research.test.ts
 * STORY-9.4 — Integration tests for GET /api/nightclaw/research endpoint.
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

import { GET } from '@/app/api/nightclaw/research/route'
import {
  mockUserSession,
  mockNoSession,
} from '@/__tests__/helpers/auth'
import { mockRequest } from '@/__tests__/helpers/fetch'

// ─── Test fixtures ────────────────────────────────────────────────────────────

const FILE_COST_RESEARCH = `# Research: AI Coding Agents Cost Optimization

## Problem
Kimi K2.5 costs money and we need to optimize.

## Solution
Use cheaper models for simple tasks.
`

const FILE_MODEL_ROUTING = `# Research: Model Routing

First non-header line.
Second non-header line.
Third non-header line with more text to test preview truncation.
`

const FILE_NO_TITLE = `This file has no header.
Just some text content.
`

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockDirent(name: string, isFile = true) {
  return {
    name,
    isFile: () => isFile,
    isDirectory: () => !isFile,
  }
}

function mockStats(mtime: Date) {
  return {
    mtime,
    isFile: () => true,
    isDirectory: () => false,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/nightclaw/research', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── AC-AUTH: 401 without session ────────────────────────────────────────────

  it('returns 401 when unauthenticated (AC-AUTH)', async () => {
    mockNoSession()
    const res = await GET(mockRequest())
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toHaveProperty('error')
  })

  // ── AC-1: Returns all .md files from solutions/ (except _pending-apply.md) ──

  it('returns list of .md files from solutions/ (AC-1)', async () => {
    mockUserSession()
    
    mockReaddir.mockResolvedValue([
      mockDirent('cost-optimization-research.md'),
      mockDirent('model-routing-research.md'),
      mockDirent('_pending-apply.md'), // should be excluded
    ])
    
    mockReadFile
      .mockResolvedValueOnce(FILE_COST_RESEARCH)
      .mockResolvedValueOnce(FILE_MODEL_ROUTING)
    
    mockStat
      .mockResolvedValueOnce(mockStats(new Date('2026-02-20T10:00:00Z')))
      .mockResolvedValueOnce(mockStats(new Date('2026-02-19T10:00:00Z')))

    const res = await GET(mockRequest())
    expect(res.status).toBe(200)
    
    const json = await res.json()
    expect(json.files).toHaveLength(2)
    expect(json.files.map((f: any) => f.filename)).toContain('cost-optimization-research.md')
    expect(json.files.map((f: any) => f.filename)).toContain('model-routing-research.md')
    expect(json.files.map((f: any) => f.filename)).not.toContain('_pending-apply.md')
  })

  it('excludes _pending-apply.md from results (AC-1)', async () => {
    mockUserSession()
    
    mockReaddir.mockResolvedValue([
      mockDirent('some-research.md'),
      mockDirent('_pending-apply.md'),
    ])
    
    mockReadFile.mockResolvedValueOnce('# Some Research\n\nContent.')
    mockStat.mockResolvedValueOnce(mockStats(new Date()))

    const res = await GET(mockRequest())
    const json = await res.json()
    
    expect(json.files).toHaveLength(1)
    expect(json.files[0].filename).toBe('some-research.md')
  })

  it('excludes non-.md files (AC-1)', async () => {
    mockUserSession()
    
    mockReaddir.mockResolvedValue([
      mockDirent('research.md'),
      mockDirent('notes.txt'),
      mockDirent('data.json'),
    ])
    
    mockReadFile.mockResolvedValueOnce('# Research\n\nContent.')
    mockStat.mockResolvedValueOnce(mockStats(new Date()))

    const res = await GET(mockRequest())
    const json = await res.json()
    
    expect(json.files).toHaveLength(1)
    expect(json.files[0].filename).toBe('research.md')
  })

  // ── AC-2: Sorted by modified_at descending (newest first) ───────────────────

  it('sorts files by modified_at descending (newest first) (AC-2)', async () => {
    mockUserSession()
    
    mockReaddir.mockResolvedValue([
      mockDirent('oldest.md'),
      mockDirent('middle.md'),
      mockDirent('newest.md'),
    ])
    
    mockReadFile
      .mockResolvedValueOnce('# Oldest')
      .mockResolvedValueOnce('# Middle')
      .mockResolvedValueOnce('# Newest')
    
    mockStat
      .mockResolvedValueOnce(mockStats(new Date('2026-02-10T10:00:00Z')))
      .mockResolvedValueOnce(mockStats(new Date('2026-02-15T10:00:00Z')))
      .mockResolvedValueOnce(mockStats(new Date('2026-02-20T10:00:00Z')))

    const res = await GET(mockRequest())
    const json = await res.json()
    
    expect(json.files[0].filename).toBe('newest.md')
    expect(json.files[1].filename).toBe('middle.md')
    expect(json.files[2].filename).toBe('oldest.md')
  })

  // ── AC-3: Empty dir → { files: [] } ─────────────────────────────────────────

  it('returns { files: [] } when directory is empty (AC-3)', async () => {
    mockUserSession()
    mockReaddir.mockResolvedValue([])

    const res = await GET(mockRequest())
    expect(res.status).toBe(200)
    
    const json = await res.json()
    expect(json.files).toEqual([])
  })

  // ── AC-4: Missing dir → { files: [] } (not 500) ─────────────────────────────

  it('returns { files: [] } when directory does not exist (AC-4)', async () => {
    mockUserSession()
    const enoent = Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    mockReaddir.mockRejectedValueOnce(enoent)

    const res = await GET(mockRequest())
    expect(res.status).toBe(200)
    
    const json = await res.json()
    expect(json.files).toEqual([])
  })

  // ── AC-5: Response shape ────────────────────────────────────────────────────

  it('returns correct response shape for each file (AC-5)', async () => {
    mockUserSession()
    
    mockReaddir.mockResolvedValue([mockDirent('test-research.md')])
    mockReadFile.mockResolvedValueOnce(FILE_COST_RESEARCH)
    mockStat.mockResolvedValueOnce(mockStats(new Date('2026-02-20T10:00:00Z')))

    const res = await GET(mockRequest())
    const json = await res.json()
    
    expect(json.files[0]).toMatchObject({
      filename: expect.any(String),
      title: expect.any(String),
      preview: expect.any(String),
      content: expect.any(String),
      modified_at: expect.any(String),
    })
  })

  // ── AC-6: Title extraction ──────────────────────────────────────────────────

  it('extracts title from first # header (AC-6)', async () => {
    mockUserSession()
    
    mockReaddir.mockResolvedValue([mockDirent('cost-research.md')])
    mockReadFile.mockResolvedValueOnce(FILE_COST_RESEARCH)
    mockStat.mockResolvedValueOnce(mockStats(new Date()))

    const res = await GET(mockRequest())
    const json = await res.json()
    
    expect(json.files[0].title).toBe('Research: AI Coding Agents Cost Optimization')
  })

  it('uses filename without .md as title when no # header (AC-6)', async () => {
    mockUserSession()
    
    mockReaddir.mockResolvedValue([mockDirent('no-title.md')])
    mockReadFile.mockResolvedValueOnce(FILE_NO_TITLE)
    mockStat.mockResolvedValueOnce(mockStats(new Date()))

    const res = await GET(mockRequest())
    const json = await res.json()
    
    expect(json.files[0].title).toBe('no-title')
  })

  // ── AC-7: Preview (first 3 non-header lines, max 200 chars) ─────────────────

  it('extracts preview from first 3 non-header lines (AC-7)', async () => {
    mockUserSession()
    
    mockReaddir.mockResolvedValue([mockDirent('routing-research.md')])
    mockReadFile.mockResolvedValueOnce(FILE_MODEL_ROUTING)
    mockStat.mockResolvedValueOnce(mockStats(new Date()))

    const res = await GET(mockRequest())
    const json = await res.json()
    
    // Should have first 3 non-header lines
    expect(json.files[0].preview).toContain('First non-header line')
    expect(json.files[0].preview).toContain('Second non-header line')
    expect(json.files[0].preview).toContain('Third non-header line')
  })

  it('limits preview to max 200 chars (AC-7)', async () => {
    mockUserSession()
    
    const longContent = `# Title\n\n${'a'.repeat(300)}`
    
    mockReaddir.mockResolvedValue([mockDirent('long.md')])
    mockReadFile.mockResolvedValueOnce(longContent)
    mockStat.mockResolvedValueOnce(mockStats(new Date()))

    const res = await GET(mockRequest())
    const json = await res.json()
    
    expect(json.files[0].preview.length).toBeLessThanOrEqual(200)
  })

  it('preview is empty when file has only headers (AC-7 edge case)', async () => {
    mockUserSession()
    
    mockReaddir.mockResolvedValue([mockDirent('headers-only.md')])
    mockReadFile.mockResolvedValueOnce('# Header 1\n## Header 2\n### Header 3')
    mockStat.mockResolvedValueOnce(mockStats(new Date()))

    const res = await GET(mockRequest())
    const json = await res.json()
    
    expect(json.files[0].preview).toBe('')
  })

  // ── AC-8: Content (full file content) ───────────────────────────────────────

  it('returns full file content in content field (AC-8)', async () => {
    mockUserSession()
    
    mockReaddir.mockResolvedValue([mockDirent('full-content.md')])
    mockReadFile.mockResolvedValueOnce(FILE_COST_RESEARCH)
    mockStat.mockResolvedValueOnce(mockStats(new Date()))

    const res = await GET(mockRequest())
    const json = await res.json()
    
    expect(json.files[0].content).toBe(FILE_COST_RESEARCH)
  })

  // ── AC-9: modified_at as ISO 8601 ───────────────────────────────────────────

  it('returns modified_at as ISO 8601 string (AC-9)', async () => {
    mockUserSession()
    
    const modDate = new Date('2026-02-20T10:30:45Z')
    
    mockReaddir.mockResolvedValue([mockDirent('dated.md')])
    mockReadFile.mockResolvedValueOnce('# Dated')
    mockStat.mockResolvedValueOnce(mockStats(modDate))

    const res = await GET(mockRequest())
    const json = await res.json()
    
    expect(json.files[0].modified_at).toBe(modDate.toISOString())
  })

  // ── Error handling ───────────────────────────────────────────────────────────

  it('handles individual file read errors gracefully', async () => {
    mockUserSession()
    
    mockReaddir.mockResolvedValue([
      mockDirent('readable.md'),
      mockDirent('unreadable.md'),
    ])
    
    mockReadFile
      .mockResolvedValueOnce('# Readable')
      .mockRejectedValueOnce(new Error('Permission denied'))
    
    mockStat
      .mockResolvedValueOnce(mockStats(new Date()))
      .mockResolvedValueOnce(mockStats(new Date()))

    const res = await GET(mockRequest())
    expect(res.status).toBe(200)
    
    const json = await res.json()
    // Should still return the readable file
    expect(json.files).toHaveLength(1)
    expect(json.files[0].filename).toBe('readable.md')
  })

  it('handles stat errors gracefully for individual files', async () => {
    mockUserSession()
    
    mockReaddir.mockResolvedValue([
      mockDirent('good.md'),
      mockDirent('nostat.md'),
    ])
    
    mockReadFile
      .mockResolvedValueOnce('# Good')
      .mockResolvedValueOnce('# No stat')
    
    mockStat
      .mockResolvedValueOnce(mockStats(new Date('2026-02-20T10:00:00Z')))
      .mockRejectedValueOnce(new Error('Stat failed'))

    const res = await GET(mockRequest())
    expect(res.status).toBe(200)
    
    const json = await res.json()
    // Should include file even if stat fails (using current date as fallback)
    expect(json.files).toHaveLength(2)
  })
})
