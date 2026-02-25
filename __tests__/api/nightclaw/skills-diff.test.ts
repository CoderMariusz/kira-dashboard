/**
 * __tests__/api/nightclaw/skills-diff.test.ts
 * STORY-9.3 — Integration tests for GET /api/nightclaw/skills-diff endpoint.
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

// ─── Mock child_process ───────────────────────────────────────────────────────

const mockExecSync = jest.fn()

jest.mock('child_process', () => ({
  execSync: (...args: any[]) => mockExecSync(...args),
}))

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { GET } from '@/app/api/nightclaw/skills-diff/route'
import {
  mockUserSession,
  mockNoSession,
} from '@/__tests__/helpers/auth'
import { mockRequest } from '@/__tests__/helpers/fetch'

// ─── Fixture data ─────────────────────────────────────────────────────────────

// Simulates: git log --diff-filter=M --name-only -1 -- "*/SKILL.md"
const GIT_LOG_OUTPUT = `commit abc123def456
Author: NightClaw <nightclaw@kira.local>
Date:   2026-02-25 02:15:00 +0000

    NightClaw: skill evolution 2026-02-25

skills/kira-orchestrator/SKILL.md
skills/kira-implementor/SKILL.md
`

// Simulates: git diff HEAD~1 HEAD -- "*/SKILL.md"
const GIT_DIFF_OUTPUT = `diff --git a/skills/kira-orchestrator/SKILL.md b/skills/kira-orchestrator/SKILL.md
index abc123..def456 100644
--- a/skills/kira-orchestrator/SKILL.md
+++ b/skills/kira-orchestrator/SKILL.md
@@ -10,3 +10,5 @@ Some context line
 unchanged line
-old removed line
+new added line
+another added line
 another unchanged line
diff --git a/skills/kira-implementor/SKILL.md b/skills/kira-implementor/SKILL.md
index 111111..222222 100644
--- a/skills/kira-implementor/SKILL.md
+++ b/skills/kira-implementor/SKILL.md
@@ -5,2 +5,3 @@ Another context
-removed implementor line
+added implementor line A
+added implementor line B
`

// Simulates: git diff HEAD~1 HEAD -- "skills/kira-orchestrator/SKILL.md"
const GIT_DIFF_SINGLE_ORCHESTRATOR = `diff --git a/skills/kira-orchestrator/SKILL.md b/skills/kira-orchestrator/SKILL.md
index abc123..def456 100644
--- a/skills/kira-orchestrator/SKILL.md
+++ b/skills/kira-orchestrator/SKILL.md
@@ -10,3 +10,5 @@ Some context line
 unchanged line
-old removed line
+new added line
+another added line
 another unchanged line
`

// Simulates: git diff HEAD~1 HEAD -- "skills/kira-implementor/SKILL.md"
const GIT_DIFF_SINGLE_IMPLEMENTOR = `diff --git a/skills/kira-implementor/SKILL.md b/skills/kira-implementor/SKILL.md
index 111111..222222 100644
--- a/skills/kira-implementor/SKILL.md
+++ b/skills/kira-implementor/SKILL.md
@@ -5,2 +5,3 @@ Another context
-removed implementor line
+added implementor line A
+added implementor line B
`

// Simulates: git log output for modified_at per file
const GIT_LOG_DATE_ORCHESTRATOR = `2026-02-25T02:15:00+00:00`
const GIT_LOG_DATE_IMPLEMENTOR = `2026-02-25T02:18:00+00:00`

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/nightclaw/skills-diff', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── AC-AUTH: 401 without session ──────────────────────────────────────────

  it('returns 401 when unauthenticated (AC-AUTH)', async () => {
    mockNoSession()
    const res = await GET(mockRequest({ url: 'http://localhost/api/nightclaw/skills-diff' }))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toHaveProperty('error')
  })

  it('does not call git when unauthenticated (AC-AUTH)', async () => {
    mockNoSession()
    await GET(mockRequest({ url: 'http://localhost/api/nightclaw/skills-diff' }))
    expect(mockExecSync).not.toHaveBeenCalled()
  })

  // ── AC-1: Happy path — changes exist ─────────────────────────────────────

  it('returns 200 with skills array when SKILL.md files were modified (AC-1)', async () => {
    mockUserSession()
    // execSync calls: first git log (list changed files), then per-file diff and date
    mockExecSync
      .mockReturnValueOnce(GIT_LOG_OUTPUT)                  // git log --diff-filter=M
      .mockReturnValueOnce(GIT_DIFF_SINGLE_ORCHESTRATOR)    // diff for kira-orchestrator
      .mockReturnValueOnce(GIT_LOG_DATE_ORCHESTRATOR)       // date for kira-orchestrator
      .mockReturnValueOnce(GIT_DIFF_SINGLE_IMPLEMENTOR)     // diff for kira-implementor
      .mockReturnValueOnce(GIT_LOG_DATE_IMPLEMENTOR)        // date for kira-implementor

    const res = await GET(mockRequest({ url: 'http://localhost/api/nightclaw/skills-diff' }))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json).toHaveProperty('skills')
    expect(json).toHaveProperty('total_modified')
    expect(Array.isArray(json.skills)).toBe(true)
    expect(json.skills.length).toBe(2)
    expect(json.total_modified).toBe(2)
  })

  it('each skill entry has required fields (AC-1)', async () => {
    mockUserSession()
    mockExecSync
      .mockReturnValueOnce(GIT_LOG_OUTPUT)
      .mockReturnValueOnce(GIT_DIFF_SINGLE_ORCHESTRATOR)
      .mockReturnValueOnce(GIT_LOG_DATE_ORCHESTRATOR)
      .mockReturnValueOnce(GIT_DIFF_SINGLE_IMPLEMENTOR)
      .mockReturnValueOnce(GIT_LOG_DATE_IMPLEMENTOR)

    const res = await GET(mockRequest({ url: 'http://localhost/api/nightclaw/skills-diff' }))
    const json = await res.json()

    for (const skill of json.skills) {
      expect(skill).toHaveProperty('name')
      expect(skill).toHaveProperty('path')
      expect(skill).toHaveProperty('diff')
      expect(skill).toHaveProperty('lines_added')
      expect(skill).toHaveProperty('lines_removed')
      expect(skill).toHaveProperty('modified_at')
      expect(typeof skill.name).toBe('string')
      expect(typeof skill.path).toBe('string')
      expect(typeof skill.diff).toBe('string')
      expect(typeof skill.lines_added).toBe('number')
      expect(typeof skill.lines_removed).toBe('number')
      expect(typeof skill.modified_at).toBe('string')
    }
  })

  it('extracts skill name from path (e.g. "kira-orchestrator" from "skills/kira-orchestrator/SKILL.md") (AC-1)', async () => {
    mockUserSession()
    mockExecSync
      .mockReturnValueOnce(GIT_LOG_OUTPUT)
      .mockReturnValueOnce(GIT_DIFF_SINGLE_ORCHESTRATOR)
      .mockReturnValueOnce(GIT_LOG_DATE_ORCHESTRATOR)
      .mockReturnValueOnce(GIT_DIFF_SINGLE_IMPLEMENTOR)
      .mockReturnValueOnce(GIT_LOG_DATE_IMPLEMENTOR)

    const res = await GET(mockRequest({ url: 'http://localhost/api/nightclaw/skills-diff' }))
    const json = await res.json()

    const names = json.skills.map((s: any) => s.name)
    expect(names).toContain('kira-orchestrator')
    expect(names).toContain('kira-implementor')
  })

  it('path field matches the file path from git log (AC-1)', async () => {
    mockUserSession()
    mockExecSync
      .mockReturnValueOnce(GIT_LOG_OUTPUT)
      .mockReturnValueOnce(GIT_DIFF_SINGLE_ORCHESTRATOR)
      .mockReturnValueOnce(GIT_LOG_DATE_ORCHESTRATOR)
      .mockReturnValueOnce(GIT_DIFF_SINGLE_IMPLEMENTOR)
      .mockReturnValueOnce(GIT_LOG_DATE_IMPLEMENTOR)

    const res = await GET(mockRequest({ url: 'http://localhost/api/nightclaw/skills-diff' }))
    const json = await res.json()

    const paths = json.skills.map((s: any) => s.path)
    expect(paths).toContain('skills/kira-orchestrator/SKILL.md')
    expect(paths).toContain('skills/kira-implementor/SKILL.md')
  })

  it('counts lines_added correctly from diff output (AC-1)', async () => {
    mockUserSession()
    mockExecSync
      .mockReturnValueOnce(GIT_LOG_OUTPUT)
      .mockReturnValueOnce(GIT_DIFF_SINGLE_ORCHESTRATOR)
      .mockReturnValueOnce(GIT_LOG_DATE_ORCHESTRATOR)
      .mockReturnValueOnce(GIT_DIFF_SINGLE_IMPLEMENTOR)
      .mockReturnValueOnce(GIT_LOG_DATE_IMPLEMENTOR)

    const res = await GET(mockRequest({ url: 'http://localhost/api/nightclaw/skills-diff' }))
    const json = await res.json()

    // kira-orchestrator diff has 2 lines starting with "+"
    const orchestrator = json.skills.find((s: any) => s.name === 'kira-orchestrator')
    expect(orchestrator.lines_added).toBe(2)
    // kira-implementor diff has 2 lines starting with "+"
    const implementor = json.skills.find((s: any) => s.name === 'kira-implementor')
    expect(implementor.lines_added).toBe(2)
  })

  it('counts lines_removed correctly from diff output (AC-1)', async () => {
    mockUserSession()
    mockExecSync
      .mockReturnValueOnce(GIT_LOG_OUTPUT)
      .mockReturnValueOnce(GIT_DIFF_SINGLE_ORCHESTRATOR)
      .mockReturnValueOnce(GIT_LOG_DATE_ORCHESTRATOR)
      .mockReturnValueOnce(GIT_DIFF_SINGLE_IMPLEMENTOR)
      .mockReturnValueOnce(GIT_LOG_DATE_IMPLEMENTOR)

    const res = await GET(mockRequest({ url: 'http://localhost/api/nightclaw/skills-diff' }))
    const json = await res.json()

    // kira-orchestrator diff has 1 line starting with "-"
    const orchestrator = json.skills.find((s: any) => s.name === 'kira-orchestrator')
    expect(orchestrator.lines_removed).toBe(1)
    // kira-implementor diff has 1 line starting with "-"
    const implementor = json.skills.find((s: any) => s.name === 'kira-implementor')
    expect(implementor.lines_removed).toBe(1)
  })

  it('includes ISO 8601 modified_at from git log (AC-1)', async () => {
    mockUserSession()
    mockExecSync
      .mockReturnValueOnce(GIT_LOG_OUTPUT)
      .mockReturnValueOnce(GIT_DIFF_SINGLE_ORCHESTRATOR)
      .mockReturnValueOnce(GIT_LOG_DATE_ORCHESTRATOR)
      .mockReturnValueOnce(GIT_DIFF_SINGLE_IMPLEMENTOR)
      .mockReturnValueOnce(GIT_LOG_DATE_IMPLEMENTOR)

    const res = await GET(mockRequest({ url: 'http://localhost/api/nightclaw/skills-diff' }))
    const json = await res.json()

    const orchestrator = json.skills.find((s: any) => s.name === 'kira-orchestrator')
    expect(orchestrator.modified_at).toBe(GIT_LOG_DATE_ORCHESTRATOR.trim())
  })

  it('diff field contains raw diff string (AC-1)', async () => {
    mockUserSession()
    mockExecSync
      .mockReturnValueOnce(GIT_LOG_OUTPUT)
      .mockReturnValueOnce(GIT_DIFF_SINGLE_ORCHESTRATOR)
      .mockReturnValueOnce(GIT_LOG_DATE_ORCHESTRATOR)
      .mockReturnValueOnce(GIT_DIFF_SINGLE_IMPLEMENTOR)
      .mockReturnValueOnce(GIT_LOG_DATE_IMPLEMENTOR)

    const res = await GET(mockRequest({ url: 'http://localhost/api/nightclaw/skills-diff' }))
    const json = await res.json()

    const orchestrator = json.skills.find((s: any) => s.name === 'kira-orchestrator')
    expect(orchestrator.diff).toContain('@@')
    expect(orchestrator.diff).toContain('+new added line')
    expect(orchestrator.diff).toContain('-old removed line')
  })

  // ── AC-2: No changes ──────────────────────────────────────────────────────

  it('returns { skills: [], total_modified: 0 } when no SKILL.md changes (AC-2)', async () => {
    mockUserSession()
    // git log returns empty output (no modified SKILL.md files)
    mockExecSync.mockReturnValueOnce('')

    const res = await GET(mockRequest({ url: 'http://localhost/api/nightclaw/skills-diff' }))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json).toEqual({ skills: [], total_modified: 0 })
  })

  it('returns { skills: [], total_modified: 0 } when git log output has no SKILL.md paths (AC-2)', async () => {
    mockUserSession()
    // git log output with no file paths
    mockExecSync.mockReturnValueOnce(`commit abc123\nAuthor: NightClaw\nDate: 2026-02-25\n\n    NightClaw: some commit\n`)

    const res = await GET(mockRequest({ url: 'http://localhost/api/nightclaw/skills-diff' }))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.skills).toEqual([])
    expect(json.total_modified).toBe(0)
  })

  // ── AC-3: Git error / no repo → graceful fallback ─────────────────────────

  it('returns graceful fallback when execSync throws (git unavailable) (AC-3)', async () => {
    mockUserSession()
    mockExecSync.mockImplementation(() => {
      throw new Error('git: command not found')
    })

    const res = await GET(mockRequest({ url: 'http://localhost/api/nightclaw/skills-diff' }))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.skills).toEqual([])
    expect(json.total_modified).toBe(0)
    expect(json).toHaveProperty('error')
  })

  it('error field says "git unavailable" when git throws (AC-3)', async () => {
    mockUserSession()
    mockExecSync.mockImplementation(() => {
      throw new Error('not a git repository')
    })

    const res = await GET(mockRequest({ url: 'http://localhost/api/nightclaw/skills-diff' }))
    const json = await res.json()

    expect(json.error).toBe('git unavailable')
  })

  it('does not return 500 when git repo does not exist (AC-3)', async () => {
    mockUserSession()
    mockExecSync.mockImplementation(() => {
      const err = new Error('fatal: not a git repository')
      throw err
    })

    const res = await GET(mockRequest({ url: 'http://localhost/api/nightclaw/skills-diff' }))
    expect(res.status).not.toBe(500)
    expect(res.status).toBe(200)
  })

  // ── Timeout ───────────────────────────────────────────────────────────────

  it('calls execSync with a timeout option (DoD: 10s timeout)', async () => {
    mockUserSession()
    mockExecSync.mockReturnValueOnce('')

    await GET(mockRequest({ url: 'http://localhost/api/nightclaw/skills-diff' }))

    // Check that at least one call included a timeout option
    const firstCall = mockExecSync.mock.calls[0]
    const options = firstCall?.[1] as any
    expect(options).toBeDefined()
    expect(options.timeout).toBeDefined()
    expect(options.timeout).toBeGreaterThanOrEqual(10000)
  })

  // ── Single skill change ───────────────────────────────────────────────────

  it('handles single skill change correctly (AC-1, edge case)', async () => {
    mockUserSession()
    const singleFileLog = `commit abc123
Author: NightClaw <nightclaw@kira.local>
Date: 2026-02-25 02:00:00 +0000

    NightClaw: single skill update

skills/kira-orchestrator/SKILL.md
`
    mockExecSync
      .mockReturnValueOnce(singleFileLog)
      .mockReturnValueOnce(GIT_DIFF_SINGLE_ORCHESTRATOR)
      .mockReturnValueOnce(GIT_LOG_DATE_ORCHESTRATOR)

    const res = await GET(mockRequest({ url: 'http://localhost/api/nightclaw/skills-diff' }))
    const json = await res.json()

    expect(json.skills.length).toBe(1)
    expect(json.total_modified).toBe(1)
    expect(json.skills[0].name).toBe('kira-orchestrator')
  })

  // ── Per-file git error graceful handling ──────────────────────────────────

  it('skips a skill file gracefully if its per-file diff throws (AC-3 variant)', async () => {
    mockUserSession()
    mockExecSync
      .mockReturnValueOnce(GIT_LOG_OUTPUT)             // git log → 2 files
      .mockImplementationOnce(() => {                  // diff for first file → throws
        throw new Error('diff error')
      })
      .mockReturnValueOnce(GIT_DIFF_SINGLE_IMPLEMENTOR) // diff for second file → ok
      .mockReturnValueOnce(GIT_LOG_DATE_IMPLEMENTOR)    // date for second file

    const res = await GET(mockRequest({ url: 'http://localhost/api/nightclaw/skills-diff' }))
    expect(res.status).toBe(200)

    const json = await res.json()
    // At least the implementor file should be returned (or none — depends on strategy)
    // Key: must not crash
    expect(Array.isArray(json.skills)).toBe(true)
    expect(typeof json.total_modified).toBe('number')
  })
})
