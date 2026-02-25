/**
 * __tests__/api/patterns.test.ts
 * STORY-8.1 — Integration tests for GET /api/patterns endpoint.
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

jest.mock('fs/promises', () => ({
  readFile: (...args: any[]) => mockReadFile(...args),
}))

// ─── Mock crypto (SHA256) ─────────────────────────────────────────────────────

// We leave crypto unmocked — Node's built-in crypto works in jest (jsdom env)

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { GET } from '@/app/api/patterns/route'
import {
  mockUserSession,
  mockNoSession,
} from '@/__tests__/helpers/auth'
import { mockRequest } from '@/__tests__/helpers/fetch'

// ─── Sample fixture data ──────────────────────────────────────────────────────

const PATTERNS_MD = `# Patterns — Co działa ✅

## Pipeline
- [2026-02-17] [GLM-5] [frontend] — Parallel execution pattern works
- [2026-02-17] [Kimi K2.5] [backend] — Fast on easy stories

## Skille
- Model profiles help with deep thinking
`

const ANTI_PATTERNS_MD = `# Anti-patterns — Czego nie robić ❌

## Pipeline
- [2026-02-16] NIE zmieniaj modelu samodzielnie

## Ogólne
- [2026-02-17] "Mental notes" nie przetrwają sesji
`

const LESSONS_LEARNED_MD = `# LESSONS_LEARNED.md — Kira Bridge

## 1. BUGS WE HIT

### BUG-001: Epic Suite Failed Despite Passing

**What went wrong:**
Full suite showed 37 failed tests despite individual epic passing.

**Root cause:**
Pre-existing failure outside epic scope.

**Fix:**
Epic-scoped + full-suite gate both required.

**Lesson:**
Epic passing does not mean pipeline is clean.

---

### LESSON-001: Always Check Migration Numbers

**What went wrong:**
Duplicate migration v15 caused UNIQUE constraint violation.

**Root cause:**
Parallel stories without coordination.

**Fix:**
Assign numbers sequentially after checking full list.

---

### OBS-001: Pydantic Schema Field Naming

**What went wrong:**
Field named schema shadows BaseModel.schema() method.

**Root cause:**
Reserved Pydantic name conflict.

**Fix:**
Avoid reserved names in Pydantic models.

`

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/patterns', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── AC-AUTH: 401 without session ──────────────────────────────────────────

  it('returns 401 when unauthenticated (AC-AUTH)', async () => {
    mockNoSession()
    const res = await GET(mockRequest())
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toHaveProperty('error')
  })

  // ── AC-1: Happy path — all 3 files present ────────────────────────────────

  it('returns 200 with { patterns, lessons, meta } when all files exist (AC-1)', async () => {
    mockUserSession()
    mockReadFile
      .mockResolvedValueOnce(PATTERNS_MD)
      .mockResolvedValueOnce(ANTI_PATTERNS_MD)
      .mockResolvedValueOnce(LESSONS_LEARNED_MD)

    const res = await GET(mockRequest())
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json).toHaveProperty('patterns')
    expect(json).toHaveProperty('lessons')
    expect(json).toHaveProperty('meta')
    expect(Array.isArray(json.patterns)).toBe(true)
    expect(Array.isArray(json.lessons)).toBe(true)
    expect(typeof json.meta).toBe('object')
  })

  it('meta has total_patterns, total_lessons, sources, generated_at (AC-1)', async () => {
    mockUserSession()
    mockReadFile
      .mockResolvedValueOnce(PATTERNS_MD)
      .mockResolvedValueOnce(ANTI_PATTERNS_MD)
      .mockResolvedValueOnce(LESSONS_LEARNED_MD)

    const res = await GET(mockRequest())
    const json = await res.json()

    expect(json.meta).toMatchObject({
      total_patterns: expect.any(Number),
      total_lessons: expect.any(Number),
      sources: expect.any(Array),
      generated_at: expect.any(String),
    })
    expect(json.meta.total_patterns).toBe(json.patterns.length)
    expect(json.meta.total_lessons).toBe(json.lessons.length)
  })

  // ── AC-2: Missing file does not crash ─────────────────────────────────────

  it('returns 200 (not 500) when a source file is missing (AC-2)', async () => {
    mockUserSession()
    const enoent = Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    mockReadFile
      .mockResolvedValueOnce(PATTERNS_MD)
      .mockRejectedValueOnce(enoent)   // anti-patterns.md missing
      .mockResolvedValueOnce(LESSONS_LEARNED_MD)

    const res = await GET(mockRequest())
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(Array.isArray(json.patterns)).toBe(true)
    expect(Array.isArray(json.lessons)).toBe(true)
  })

  it('meta.sources only contains files that were successfully read (AC-2)', async () => {
    mockUserSession()
    const enoent = Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    mockReadFile
      .mockResolvedValueOnce(PATTERNS_MD)
      .mockRejectedValueOnce(enoent)
      .mockResolvedValueOnce(LESSONS_LEARNED_MD)

    const res = await GET(mockRequest())
    const json = await res.json()

    // Only 2 of 3 files succeed → meta.sources has 2 entries
    expect(json.meta.sources).toHaveLength(2)
    expect(json.meta.sources.some((s: string) => s.includes('patterns.md'))).toBe(true)
    expect(json.meta.sources.some((s: string) => s.includes('LESSONS_LEARNED.md'))).toBe(true)
    expect(json.meta.sources.some((s: string) => s.includes('anti-patterns.md'))).toBe(false)
  })

  // ── AC-3: Category header parsing ─────────────────────────────────────────

  it('sets category from ## headers (AC-3)', async () => {
    mockUserSession()
    mockReadFile
      .mockResolvedValueOnce(PATTERNS_MD)
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('')

    const res = await GET(mockRequest())
    const json = await res.json()

    const pipelinePatterns = json.patterns.filter((p: any) => p.category === 'Pipeline')
    const skillePatterns = json.patterns.filter((p: any) => p.category === 'Skille')

    expect(pipelinePatterns.length).toBeGreaterThan(0)
    expect(skillePatterns.length).toBeGreaterThan(0)
  })

  it('entries before first ## header get category "Ogólne" (AC-3)', async () => {
    mockUserSession()
    const mdWithPreamble = `# Title\n- Entry before any category header\n\n## SomeCategory\n- [2026-01-01] — another entry\n`
    mockReadFile
      .mockResolvedValueOnce(mdWithPreamble)
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('')

    const res = await GET(mockRequest())
    const json = await res.json()

    const general = json.patterns.filter((p: any) => p.category === 'Ogólne')
    expect(general.length).toBeGreaterThan(0)
    expect(general[0].text).toContain('Entry before any category header')
  })

  // ── AC-4: Parsing date/model/domain from pattern lines ───────────────────

  it('extracts date from anti-pattern line without em-dash separator (Bug 1 fix)', async () => {
    mockUserSession()
    const md = `## Pipeline
- [2026-02-16] NIE używaj expired API keys
`
    mockReadFile
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce(md)
      .mockResolvedValueOnce('')

    const res = await GET(mockRequest())
    const json = await res.json()

    expect(json.patterns).toHaveLength(1)
    const p = json.patterns[0]
    expect(p.date).toBe('2026-02-16')
    expect(p.text).toBe('NIE używaj expired API keys')
    expect(p.type).toBe('ANTI_PATTERN')
  })

  it('extracts date, model, domain, text from a full pattern line (AC-4)', async () => {
    mockUserSession()
    const md = `## Pipeline\n- [2026-02-17] [GLM-5] [frontend] — Parallel execution pattern works\n`
    mockReadFile
      .mockResolvedValueOnce(md)
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('')

    const res = await GET(mockRequest())
    const json = await res.json()

    expect(json.patterns).toHaveLength(1)
    const p = json.patterns[0]
    expect(p.date).toBe('2026-02-17')
    expect(p.model).toBe('GLM-5')
    expect(p.domain).toBe('frontend')
    expect(p.text).toBe('Parallel execution pattern works')
  })

  it('handles pattern line without date/model/domain (AC-4 edge case)', async () => {
    mockUserSession()
    const md = `## Skille\n- Model profiles help with deep thinking\n`
    mockReadFile
      .mockResolvedValueOnce(md)
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('')

    const res = await GET(mockRequest())
    const json = await res.json()

    expect(json.patterns).toHaveLength(1)
    const p = json.patterns[0]
    expect(p.date).toBeNull()
    expect(p.model).toBeNull()
    expect(p.domain).toBeNull()
    expect(p.text).toBeTruthy()
  })

  it('auto-generates tags from [model, domain, category] (AC-4)', async () => {
    mockUserSession()
    const md = `## Pipeline\n- [2026-02-17] [GLM-5] [frontend] — Some pattern\n`
    mockReadFile
      .mockResolvedValueOnce(md)
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('')

    const res = await GET(mockRequest())
    const json = await res.json()

    const p = json.patterns[0]
    expect(p.tags).toContain('glm-5')
    expect(p.tags).toContain('frontend')
    expect(p.tags).toContain('pipeline')
  })

  it('patterns.md entries have type PATTERN, anti-patterns.md have type ANTI_PATTERN (AC-1)', async () => {
    mockUserSession()
    mockReadFile
      .mockResolvedValueOnce(PATTERNS_MD)
      .mockResolvedValueOnce(ANTI_PATTERNS_MD)
      .mockResolvedValueOnce('')

    const res = await GET(mockRequest())
    const json = await res.json()

    const patterns = json.patterns.filter((p: any) => p.type === 'PATTERN')
    const antiPatterns = json.patterns.filter((p: any) => p.type === 'ANTI_PATTERN')

    expect(patterns.length).toBeGreaterThan(0)
    expect(antiPatterns.length).toBeGreaterThan(0)
  })

  // ── AC-5: LESSONS_LEARNED.md parsing ─────────────────────────────────────

  it('parses BUG-XXX sections with severity=critical (AC-5)', async () => {
    mockUserSession()
    mockReadFile
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce(LESSONS_LEARNED_MD)

    const res = await GET(mockRequest())
    const json = await res.json()

    const bug = json.lessons.find((l: any) => l.id === 'BUG-001')
    expect(bug).toBeDefined()
    expect(bug.severity).toBe('critical')
    expect(bug.title).toContain('Epic Suite Failed')
  })

  it('parses LESSON-XXX sections with severity=warning (AC-5)', async () => {
    mockUserSession()
    mockReadFile
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce(LESSONS_LEARNED_MD)

    const res = await GET(mockRequest())
    const json = await res.json()

    const lesson = json.lessons.find((l: any) => l.id === 'LESSON-001')
    expect(lesson).toBeDefined()
    expect(lesson.severity).toBe('warning')
  })

  it('parses OBS-XXX sections with severity=info (AC-5)', async () => {
    mockUserSession()
    mockReadFile
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce(LESSONS_LEARNED_MD)

    const res = await GET(mockRequest())
    const json = await res.json()

    const obs = json.lessons.find((l: any) => l.id === 'OBS-001')
    expect(obs).toBeDefined()
    expect(obs.severity).toBe('info')
  })

  it('extracts body, root_cause, fix, lesson from lesson sections (AC-5)', async () => {
    mockUserSession()
    mockReadFile
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce(LESSONS_LEARNED_MD)

    const res = await GET(mockRequest())
    const json = await res.json()

    const bug = json.lessons.find((l: any) => l.id === 'BUG-001')
    expect(bug.body).toBeTruthy()
    expect(bug.root_cause).toBeTruthy()
    expect(bug.fix).toBeTruthy()
    expect(bug.lesson).toBeTruthy()
  })

  it('extracts multiline "What went wrong" section fully (Bug 2 fix)', async () => {
    mockUserSession()
    const mdWithMultiline = `### BUG-099: Multiline Test

**What went wrong:**
First line of the problem.
Second line with more details.
Third line explaining the impact.

**Root cause:**
Single line cause.

**Fix:**
The fix.

**Lesson:**
Learned.
`
    mockReadFile
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce(mdWithMultiline)

    const res = await GET(mockRequest())
    const json = await res.json()

    const bug = json.lessons.find((l: any) => l.id === 'BUG-099')
    expect(bug).toBeDefined()
    expect(bug.body).toContain('First line of the problem')
    expect(bug.body).toContain('Second line with more details')
    expect(bug.body).toContain('Third line explaining the impact')
  })

  it('falls back to title when lesson field is missing (EC-2)', async () => {
    mockUserSession()
    const mdNoLesson = `### BUG-099: Some Bug Title\n\n**What went wrong:**\nSomething bad.\n\n**Root cause:**\nA mistake.\n\n**Fix:**\nFixed it.\n\n`
    mockReadFile
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce(mdNoLesson)

    const res = await GET(mockRequest())
    const json = await res.json()

    const bug = json.lessons.find((l: any) => l.id === 'BUG-099')
    expect(bug).toBeDefined()
    expect(bug.lesson).toBe('Some Bug Title')
  })

  // ── AC-6: Deterministic IDs ───────────────────────────────────────────────

  it('generates deterministic SHA256-based IDs (AC-6)', async () => {
    mockUserSession()
    mockReadFile
      .mockResolvedValueOnce(PATTERNS_MD)
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('')

    const res1 = await GET(mockRequest())
    const json1 = await res1.json()

    mockUserSession()
    mockReadFile
      .mockResolvedValueOnce(PATTERNS_MD)
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('')

    const res2 = await GET(mockRequest())
    const json2 = await res2.json()

    expect(json1.patterns[0].id).toBe(json2.patterns[0].id)
  })

  it('IDs are 8 characters long (AC-6)', async () => {
    mockUserSession()
    mockReadFile
      .mockResolvedValueOnce(PATTERNS_MD)
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('')

    const res = await GET(mockRequest())
    const json = await res.json()

    for (const p of json.patterns) {
      expect(p.id).toHaveLength(8)
    }
  })

  // ── PatternCard shape ─────────────────────────────────────────────────────

  it('PatternCard has all required fields (AC-1)', async () => {
    mockUserSession()
    const md = `## Pipeline\n- [2026-02-17] [GLM-5] [frontend] — Some pattern\n`
    mockReadFile
      .mockResolvedValueOnce(md)
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('')

    const res = await GET(mockRequest())
    const json = await res.json()

    const p = json.patterns[0]
    expect(p).toMatchObject({
      id: expect.any(String),
      source: expect.stringMatching(/patterns\.md/),
      type: expect.stringMatching(/^(PATTERN|ANTI_PATTERN)$/),
      category: expect.any(String),
      text: expect.any(String),
      tags: expect.any(Array),
      related_stories: expect.any(Array),
      occurrences: 1,
    })
  })
})
