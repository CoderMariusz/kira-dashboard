/**
 * __tests__/api/patterns-post.test.ts
 * STORY-8.2 — Integration tests for POST /api/patterns and POST /api/lessons endpoints.
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

const mockReadFile = jest.fn()
const mockWriteFile = jest.fn()
const mockAppendFile = jest.fn()
const mockAccess = jest.fn()

jest.mock('fs/promises', () => ({
  readFile: (...args: any[]) => mockReadFile(...args),
  writeFile: (...args: any[]) => mockWriteFile(...args),
  appendFile: (...args: any[]) => mockAppendFile(...args),
  access: (...args: any[]) => mockAccess(...args),
}))

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks()
  // Default: file exists for access check
  mockAccess.mockResolvedValue(undefined)
})

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { POST as postPatterns, GET as getPatterns } from '@/app/api/patterns/route'
import { POST as postLessons } from '@/app/api/lessons/route'
import { mockAdminSession, mockUserSession, mockNoSession } from '@/__tests__/helpers/auth'
import { mockRequest } from '@/__tests__/helpers/fetch'

// ─── Sample fixture data ──────────────────────────────────────────────────────

const PATTERNS_MD = `# Patterns — Co działa ✅

## Pipeline
- [2026-02-17] [GLM-5] [frontend] — Parallel execution pattern works
`

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/patterns', () => {
  // ── AC-AUTH: 401 without session ──────────────────────────────────────────

  it('returns 401 when unauthenticated (AC-AUTH)', async () => {
    mockNoSession()
    const res = await postPatterns(mockRequest({
      method: 'POST',
      body: { type: 'PATTERN', category: 'Test', text: 'Test pattern' }
    }))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toHaveProperty('error')
  })

  // ── AC-AUTH: 403 for non-admin user ──────────────────────────────────────

  it('returns 403 when user is not admin (AC-AUTH)', async () => {
    mockUserSession()
    const res = await postPatterns(mockRequest({
      method: 'POST',
      body: { type: 'PATTERN', category: 'Test', text: 'Test pattern' }
    }))
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json).toHaveProperty('error')
  })

  // ── AC-1: POST with type=PATTERN appends to patterns.md ───────────────────

  it('appends PATTERN to patterns.md (AC-1)', async () => {
    mockAdminSession()
    mockReadFile.mockResolvedValueOnce(PATTERNS_MD)
    mockWriteFile.mockResolvedValueOnce(undefined)

    const res = await postPatterns(mockRequest({
      method: 'POST',
      body: {
        type: 'PATTERN',
        category: 'Pipeline',
        text: 'Kimi działa świetnie na medium tasks',
        model: 'Kimi K2.5',
        domain: 'backend',
        date: '2026-02-25',
        related_stories: ['STORY-8.1']
      }
    }))

    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.entry).toContain('[2026-02-25]')
    expect(json.entry).toContain('Kimi K2.5')
    expect(json.entry).toContain('backend')
    expect(json.entry).toContain('Kimi działa świetnie na medium tasks')

    // Verify writeFile was called with correct file path and content
    expect(mockWriteFile).toHaveBeenCalled()
    const [filePath, content] = mockWriteFile.mock.calls[0]
    expect(filePath).toContain('patterns.md')
    expect(content).toContain('Related: STORY-8.1')
  })

  // ── AC-2: POST with type=ANTI_PATTERN appends to anti-patterns.md ─────────

  it('appends ANTI_PATTERN to anti-patterns.md (AC-2)', async () => {
    mockAdminSession()
    mockReadFile.mockResolvedValueOnce('# Anti-patterns\n\n## Pipeline\n')
    mockWriteFile.mockResolvedValueOnce(undefined)

    const res = await postPatterns(mockRequest({
      method: 'POST',
      body: {
        type: 'ANTI_PATTERN',
        category: 'Pipeline',
        text: 'NIE używaj GLM na complex backend tasks'
      }
    }))

    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.success).toBe(true)

    // Verify writeFile was called with anti-patterns.md path
    expect(mockWriteFile).toHaveBeenCalled()
    const [filePath] = mockWriteFile.mock.calls[0]
    expect(filePath).toContain('anti-patterns.md')
  })

  // ── AC-4: Validation - missing required fields returns 400 ────────────────

  it('returns 400 when text is missing (AC-4)', async () => {
    mockAdminSession()
    const res = await postPatterns(mockRequest({
      method: 'POST',
      body: { type: 'PATTERN', category: 'Test' }  // missing text
    }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json).toHaveProperty('error')
    expect(mockAppendFile).not.toHaveBeenCalled()
  })

  it('returns 400 when type is missing (AC-4)', async () => {
    mockAdminSession()
    const res = await postPatterns(mockRequest({
      method: 'POST',
      body: { category: 'Test', text: 'Some text' }  // missing type
    }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json).toHaveProperty('error')
    expect(mockAppendFile).not.toHaveBeenCalled()
  })

  it('returns 400 when category is missing (AC-4)', async () => {
    mockAdminSession()
    const res = await postPatterns(mockRequest({
      method: 'POST',
      body: { type: 'PATTERN', text: 'Some text' }  // missing category
    }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json).toHaveProperty('error')
    expect(mockAppendFile).not.toHaveBeenCalled()
  })

  // ── EC-1: Creates file if it doesn't exist ────────────────────────────────

  it('creates file if it does not exist (EC-1)', async () => {
    mockAdminSession()
    const enoent = Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    mockReadFile.mockRejectedValueOnce(enoent)
    mockWriteFile.mockResolvedValueOnce(undefined)

    const res = await postPatterns(mockRequest({
      method: 'POST',
      body: {
        type: 'PATTERN',
        category: 'NewCategory',
        text: 'New pattern entry'
      }
    }))

    expect(res.status).toBe(201)
    expect(mockWriteFile).toHaveBeenCalled()
    const [filePath, content] = mockWriteFile.mock.calls[0]
    expect(filePath).toContain('patterns.md')
    expect(content).toContain('# Patterns')
    expect(content).toContain('## NewCategory')
    expect(content).toContain('New pattern entry')
  })

  // ── Format tests ──────────────────────────────────────────────────────────

  it('formats entry without model and domain correctly', async () => {
    mockAdminSession()
    mockReadFile.mockResolvedValueOnce(PATTERNS_MD)
    mockAppendFile.mockResolvedValueOnce(undefined)

    const res = await postPatterns(mockRequest({
      method: 'POST',
      body: {
        type: 'PATTERN',
        category: 'Pipeline',
        text: 'Simple entry without model/domain',
        date: '2026-02-25'
      }
    }))

    expect(res.status).toBe(201)
    const json = await res.json()
    // Should not have empty brackets for missing model/domain
    expect(json.entry).not.toMatch(/\[\]/)
    expect(json.entry).toContain('[2026-02-25]')
    expect(json.entry).toContain('Simple entry without model/domain')
  })

  it('uses current date when date not provided', async () => {
    mockAdminSession()
    mockReadFile.mockResolvedValueOnce(PATTERNS_MD)
    mockAppendFile.mockResolvedValueOnce(undefined)

    const today = new Date().toISOString().split('T')[0]

    const res = await postPatterns(mockRequest({
      method: 'POST',
      body: {
        type: 'PATTERN',
        category: 'Pipeline',
        text: 'Entry with default date'
      }
    }))

    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.entry).toContain(`[${today}]`)
  })
})

describe('POST /api/lessons', () => {
  // ── AC-AUTH: 401 without session ──────────────────────────────────────────

  it('returns 401 when unauthenticated (AC-AUTH)', async () => {
    mockNoSession()
    const res = await postLessons(mockRequest({
      method: 'POST',
      body: {
        id: 'BUG-004',
        title: 'Test lesson',
        severity: 'critical',
        category: 'Pipeline',
        body: 'What went wrong',
        lesson: 'What we learned'
      }
    }))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toHaveProperty('error')
  })

  // ── AC-3: POST /api/lessons appends to LESSONS_LEARNED.md ────────────────

  it('appends lesson to LESSONS_LEARNED.md (AC-3)', async () => {
    mockAdminSession()
    mockAppendFile.mockResolvedValueOnce(undefined)

    const res = await postLessons(mockRequest({
      method: 'POST',
      body: {
        id: 'BUG-004',
        title: 'Review agent nie pushuje',
        severity: 'critical',
        category: 'Pipeline',
        body: 'Full description of what went wrong',
        root_cause: 'Root cause analysis',
        fix: 'The fix applied',
        lesson: 'Always verify push succeeded',
        tags: ['pipeline', 'git'],
        date: '2026-02-25'
      }
    }))

    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.success).toBe(true)

    // Verify appendFile was called with correct format
    expect(mockAppendFile).toHaveBeenCalled()
    const [filePath, content] = mockAppendFile.mock.calls[0]
    expect(filePath).toContain('LESSONS_LEARNED.md')
    expect(content).toContain('### BUG-004: Review agent nie pushuje')
    expect(content).toContain('**Severity:** critical')
    expect(content).toContain('**Tags:** pipeline, git')
    expect(content).toContain('Full description of what went wrong')
    expect(content).toContain('Root cause analysis')
    expect(content).toContain('The fix applied')
    expect(content).toContain('Always verify push succeeded')
    expect(content).toContain('---')
  })

  // ── AC-4: Validation - missing required fields returns 400 ────────────────

  it('returns 400 when id is missing', async () => {
    mockAdminSession()
    const res = await postLessons(mockRequest({
      method: 'POST',
      body: {
        title: 'Test lesson',
        severity: 'critical',
        category: 'Pipeline',
        body: 'What went wrong',
        lesson: 'What we learned'
      }  // missing id
    }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json).toHaveProperty('error')
    expect(mockAppendFile).not.toHaveBeenCalled()
  })

  it('returns 400 when title is missing', async () => {
    mockAdminSession()
    const res = await postLessons(mockRequest({
      method: 'POST',
      body: {
        id: 'BUG-005',
        severity: 'critical',
        category: 'Pipeline',
        body: 'What went wrong',
        lesson: 'What we learned'
      }  // missing title
    }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json).toHaveProperty('error')
    expect(mockAppendFile).not.toHaveBeenCalled()
  })

  it('returns 400 when severity is missing', async () => {
    mockAdminSession()
    const res = await postLessons(mockRequest({
      method: 'POST',
      body: {
        id: 'BUG-006',
        title: 'Test lesson',
        category: 'Pipeline',
        body: 'What went wrong',
        lesson: 'What we learned'
      }  // missing severity
    }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json).toHaveProperty('error')
    expect(mockAppendFile).not.toHaveBeenCalled()
  })

  it('returns 400 when body is missing', async () => {
    mockAdminSession()
    const res = await postLessons(mockRequest({
      method: 'POST',
      body: {
        id: 'BUG-007',
        title: 'Test lesson',
        severity: 'critical',
        category: 'Pipeline',
        lesson: 'What we learned'
      }  // missing body
    }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json).toHaveProperty('error')
    expect(mockAppendFile).not.toHaveBeenCalled()
  })

  it('returns 400 when lesson is missing', async () => {
    mockAdminSession()
    const res = await postLessons(mockRequest({
      method: 'POST',
      body: {
        id: 'BUG-008',
        title: 'Test lesson',
        severity: 'critical',
        category: 'Pipeline',
        body: 'What went wrong'
      }  // missing lesson
    }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json).toHaveProperty('error')
    expect(mockAppendFile).not.toHaveBeenCalled()
  })

  it('returns 400 when category is missing', async () => {
    mockAdminSession()
    const res = await postLessons(mockRequest({
      method: 'POST',
      body: {
        id: 'BUG-009',
        title: 'Test lesson',
        severity: 'critical',
        body: 'What went wrong',
        lesson: 'What we learned'
      }  // missing category
    }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json).toHaveProperty('error')
    expect(mockAppendFile).not.toHaveBeenCalled()
  })

  // ── EC-1: Creates file if it doesn't exist ────────────────────────────────

  it('creates LESSONS_LEARNED.md if it does not exist (EC-1)', async () => {
    mockAdminSession()
    // File doesn't exist (access throws ENOENT)
    const enoent = Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    mockAccess.mockRejectedValueOnce(enoent)
    mockWriteFile.mockResolvedValueOnce(undefined)

    const res = await postLessons(mockRequest({
      method: 'POST',
      body: {
        id: 'BUG-010',
        title: 'New lesson in new file',
        severity: 'info',
        category: 'Test',
        body: 'Test body',
        lesson: 'Test lesson'
      }
    }))

    expect(res.status).toBe(201)
    expect(mockWriteFile).toHaveBeenCalled()
    const [filePath, content] = mockWriteFile.mock.calls[0]
    expect(filePath).toContain('LESSONS_LEARNED.md')
    expect(content).toContain('# LESSONS_LEARNED')
    expect(content).toContain('### BUG-010: New lesson in new file')
  })

  // ── Format tests ──────────────────────────────────────────────────────────

  it('uses TBD for optional fields when not provided', async () => {
    mockAdminSession()
    mockAppendFile.mockResolvedValueOnce(undefined)

    const res = await postLessons(mockRequest({
      method: 'POST',
      body: {
        id: 'BUG-011',
        title: 'Lesson without optional fields',
        severity: 'warning',
        category: 'Test',
        body: 'What went wrong',
        lesson: 'Learned this'
        // root_cause, fix, tags not provided
      }
    }))

    expect(res.status).toBe(201)
    expect(mockAppendFile).toHaveBeenCalled()
    const [, content] = mockAppendFile.mock.calls[0]
    expect(content).toContain('**Root cause:** TBD')
    expect(content).toContain('**Fix:** TBD')
  })

  it('uses current date when date not provided', async () => {
    mockAdminSession()
    mockAppendFile.mockResolvedValueOnce(undefined)

    const today = new Date().toISOString().split('T')[0]

    const res = await postLessons(mockRequest({
      method: 'POST',
      body: {
        id: 'BUG-012',
        title: 'Lesson with default date',
        severity: 'info',
        category: 'Test',
        body: 'What went wrong',
        lesson: 'Learned this'
      }
    }))

    expect(res.status).toBe(201)
    expect(mockAppendFile).toHaveBeenCalled()
    const [, content] = mockAppendFile.mock.calls[0]
    expect(content).toContain(`**Date:** ${today}`)
  })
})
