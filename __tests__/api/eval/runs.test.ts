/**
 * __tests__/api/eval/runs.test.ts
 * STORY-7.4 — Tests for /api/eval/runs and /api/eval/runs/[runId] API routes.
 *
 * TC-1: 401 if not authenticated
 * TC-2: GET /runs returns paginated list
 * TC-3: GET /runs/[runId] returns run + taskResults + diff
 * TC-4: 404 for non-existent runId
 */

import { NextResponse } from 'next/server'
import { GET as getRuns } from '@/app/api/eval/runs/route'
import { GET as getRunById } from '@/app/api/eval/runs/[runId]/route'
import {
  mockAdminSession,
  mockUserSession,
  mockNoSession,
} from '@/__tests__/helpers/auth'
import { mockRequest } from '@/__tests__/helpers/fetch'

jest.mock('@/lib/bridge/eval-runs-bridge', () => ({
  findEvalRuns: jest.fn(),
  findEvalRunById: jest.fn(),
  findEvalRunTaskResults: jest.fn(),
}))

import {
  findEvalRuns as mockFindRuns,
  findEvalRunById as mockFindById,
  findEvalRunTaskResults as mockFindTaskResults,
} from '@/lib/bridge/eval-runs-bridge'

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function parseStatus(response: NextResponse | Response): Promise<number> {
  return response.status
}

async function parseBody(response: NextResponse | Response): Promise<Record<string, unknown>> {
  const text = await response.text()
  return JSON.parse(text) as Record<string, unknown>
}

function mockRun(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return { id: 'run-abc-123', run_type: 'manual', status: 'completed', started_at: '2026-01-01T10:00:00Z', finished_at: '2026-01-01T10:05:00Z', overall_score: 0.85, task_count: 10, passed_count: 8, failed_count: 2, ...overrides }
}

function mockTaskResult(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return { id: 'tr-001', run_id: 'run-abc-123', task_id: 'task-001', actual_output: 'some output', passed: true, diff_score: 1.0, created_at: '2026-01-01T10:01:00Z', task_prompt: 'What is 2 + 2?', task_category: 'Reasoning', ...overrides }
}

// ─── TC-1 ─────────────────────────────────────────────────────────────────────

describe('TC-1: 401 if not authenticated', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('GET /api/eval/runs returns 401 without session', async () => {
    mockNoSession()
    const req = mockRequest({ url: 'http://localhost/api/eval/runs' })
    const res = await getRuns(req)
    expect(await parseStatus(res)).toBe(401)
    const body = await parseBody(res)
    expect(body).toHaveProperty('error')
  })

  it('GET /api/eval/runs/[runId] returns 401 without session', async () => {
    mockNoSession()
    const req = mockRequest({ url: 'http://localhost/api/eval/runs/run-abc-123' })
    const res = await getRunById(req, { params: Promise.resolve({ runId: 'run-abc-123' }) })
    expect(await parseStatus(res)).toBe(401)
    const body = await parseBody(res)
    expect(body).toHaveProperty('error')
  })
})

// ─── TC-2 ─────────────────────────────────────────────────────────────────────

describe('TC-2: GET /api/eval/runs returns paginated list', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('returns 200 with runs array and pagination for authenticated user', async () => {
    mockUserSession()
    const runs = [mockRun(), mockRun({ id: 'run-xyz-456' })]
    ;(mockFindRuns as jest.Mock).mockReturnValue({ runs, total: 2 })
    const req = mockRequest({ url: 'http://localhost/api/eval/runs?page=1&pageSize=20' })
    const res = await getRuns(req)
    expect(await parseStatus(res)).toBe(200)
    const body = await parseBody(res)
    expect(body).toHaveProperty('runs')
    expect(body).toHaveProperty('total', 2)
    expect(body).toHaveProperty('page', 1)
    expect(body).toHaveProperty('pageSize', 20)
    expect(Array.isArray(body.runs)).toBe(true)
    expect((body.runs as unknown[]).length).toBe(2)
  })

  it('respects page and pageSize params', async () => {
    mockAdminSession()
    ;(mockFindRuns as jest.Mock).mockReturnValue({ runs: [], total: 50 })
    const req = mockRequest({ url: 'http://localhost/api/eval/runs?page=3&pageSize=10' })
    const res = await getRuns(req)
    expect(await parseStatus(res)).toBe(200)
    const body = await parseBody(res)
    expect(body).toHaveProperty('page', 3)
    expect(body).toHaveProperty('pageSize', 10)
    expect(mockFindRuns).toHaveBeenCalledWith({ limit: 10, offset: 20 })
  })

  it('caps pageSize at 100', async () => {
    mockUserSession()
    ;(mockFindRuns as jest.Mock).mockReturnValue({ runs: [], total: 0 })
    const req = mockRequest({ url: 'http://localhost/api/eval/runs?pageSize=999' })
    const res = await getRuns(req)
    expect(await parseStatus(res)).toBe(200)
    const body = await parseBody(res)
    expect(body).toHaveProperty('pageSize', 100)
    expect(mockFindRuns).toHaveBeenCalledWith({ limit: 100, offset: 0 })
  })

  it('defaults page=1, pageSize=20 when params absent', async () => {
    mockUserSession()
    ;(mockFindRuns as jest.Mock).mockReturnValue({ runs: [], total: 0 })
    const req = mockRequest({ url: 'http://localhost/api/eval/runs' })
    await getRuns(req)
    expect(mockFindRuns).toHaveBeenCalledWith({ limit: 20, offset: 0 })
  })
})

// ─── TC-3 ─────────────────────────────────────────────────────────────────────

describe('TC-3: GET /api/eval/runs/[runId] returns run + taskResults + diff', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('returns 200 with run, taskResults, and diff=null when no previous run', async () => {
    mockUserSession()
    ;(mockFindById as jest.Mock).mockReturnValue(mockRun())
    ;(mockFindTaskResults as jest.Mock).mockReturnValue({ taskResults: [mockTaskResult()], prevRunId: null, prevTaskResults: [] })
    const req = mockRequest({ url: 'http://localhost/api/eval/runs/run-abc-123' })
    const res = await getRunById(req, { params: Promise.resolve({ runId: 'run-abc-123' }) })
    expect(await parseStatus(res)).toBe(200)
    const body = await parseBody(res)
    expect(body).toHaveProperty('run')
    expect(body).toHaveProperty('taskResults')
    expect(body).toHaveProperty('diff', null)
    expect(Array.isArray(body.taskResults)).toBe(true)
    expect((body.taskResults as unknown[]).length).toBe(1)
  })

  it('returns diff with newFailures and newPasses when previous run exists', async () => {
    mockUserSession()
    ;(mockFindById as jest.Mock).mockReturnValue(mockRun())
    ;(mockFindTaskResults as jest.Mock).mockReturnValue({
      taskResults: [mockTaskResult({ task_id: 'task-001', passed: true }), mockTaskResult({ id: 'tr-002', task_id: 'task-002', passed: false })],
      prevRunId: 'prev-run-id',
      prevTaskResults: [mockTaskResult({ id: 'tr-prev-001', run_id: 'prev-run', task_id: 'task-001', passed: false }), mockTaskResult({ id: 'tr-prev-002', run_id: 'prev-run', task_id: 'task-002', passed: true })],
    })
    const req = mockRequest({ url: 'http://localhost/api/eval/runs/run-abc-123' })
    const res = await getRunById(req, { params: Promise.resolve({ runId: 'run-abc-123' }) })
    expect(await parseStatus(res)).toBe(200)
    const body = await parseBody(res)
    expect(body.diff).not.toBeNull()
    const diff = body.diff as { newFailures: string[]; newPasses: string[]; unchanged: number }
    expect(diff.newFailures).toContain('task-002')
    expect(diff.newPasses).toContain('task-001')
    expect(diff.unchanged).toBe(0)
  })

  it('returns diff.unchanged count correctly', async () => {
    mockUserSession()
    ;(mockFindById as jest.Mock).mockReturnValue(mockRun())
    ;(mockFindTaskResults as jest.Mock).mockReturnValue({
      taskResults: [mockTaskResult({ task_id: 'task-001', passed: true }), mockTaskResult({ id: 'tr-002', task_id: 'task-002', passed: false })],
      prevRunId: 'prev-run-id',
      prevTaskResults: [mockTaskResult({ task_id: 'task-001', passed: true }), mockTaskResult({ id: 'tr-002', task_id: 'task-002', passed: false })],
    })
    const req = mockRequest({ url: 'http://localhost/api/eval/runs/run-abc-123' })
    const res = await getRunById(req, { params: Promise.resolve({ runId: 'run-abc-123' }) })
    const body = await parseBody(res)
    const diff = body.diff as { newFailures: string[]; newPasses: string[]; unchanged: number }
    expect(diff.newFailures).toHaveLength(0)
    expect(diff.newPasses).toHaveLength(0)
    expect(diff.unchanged).toBe(2)
  })
})

// ─── TC-4 ─────────────────────────────────────────────────────────────────────

describe('TC-4: 404 for non-existent runId', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('returns 404 when runId does not exist', async () => {
    mockUserSession()
    ;(mockFindById as jest.Mock).mockReturnValue(null)
    const req = mockRequest({ url: 'http://localhost/api/eval/runs/no-such-run' })
    const res = await getRunById(req, { params: Promise.resolve({ runId: 'no-such-run' }) })
    expect(await parseStatus(res)).toBe(404)
    const body = await parseBody(res)
    expect(body).toHaveProperty('error')
    expect(body.error as string).toContain('no-such-run')
  })
})
