/**
 * __tests__/api/eval/tasks.test.ts
 * STORY-7.3 — Integration tests for /api/eval/tasks CRUD API.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Mock next/server — must be before imports ────────────────────────────────

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

// ─── Mock Bridge ──────────────────────────────────────────────────────────────

const mockFindAll = jest.fn()
const mockFindById = jest.fn()
const mockCreate = jest.fn()
const mockUpdate = jest.fn()
const mockDeleteFn = jest.fn()

jest.mock('@/lib/bridge/eval-tasks-bridge', () => ({
  findAllEvalTasks: (...args: any[]) => mockFindAll(...args),
  findEvalTaskById: (...args: any[]) => mockFindById(...args),
  createEvalTask: (...args: any[]) => mockCreate(...args),
  updateEvalTask: (...args: any[]) => mockUpdate(...args),
  deleteEvalTask: (...args: any[]) => mockDeleteFn(...args),
}))

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { GET, POST } from '@/app/api/eval/tasks/route'
import { PATCH, DELETE } from '@/app/api/eval/tasks/[id]/route'
import {
  mockAdminSession,
  mockUserSession,
  mockNoSession,
} from '@/__tests__/helpers/auth'
import { mockRequest } from '@/__tests__/helpers/fetch'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockTask(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'task-123',
    prompt: 'Test prompt',
    expected_output: 'Test output',
    category: 'API',
    target_model: 'sonnet',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

// ─── GET /api/eval/tasks ─────────────────────────────────────────────────────

describe('GET /api/eval/tasks', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 without session (AC-1)', async () => {
    mockNoSession()
    const res = await GET(mockRequest())
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toHaveProperty('error')
  })

  it('returns 200 with task list (AC-2)', async () => {
    mockUserSession()
    mockFindAll.mockReturnValue([mockTask(), mockTask({ id: 'task-456' })])

    const res = await GET(mockRequest())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.tasks).toHaveLength(2)
  })

  it('supports category filter (AC-2)', async () => {
    mockUserSession()
    mockFindAll.mockReturnValue([mockTask({ category: 'Pipeline' })])

    await GET(mockRequest({ url: 'http://localhost/api/eval/tasks?category=Pipeline' }))
    expect(mockFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'Pipeline' })
    )
  })

  it('active_only defaults to true', async () => {
    mockUserSession()
    mockFindAll.mockReturnValue([])
    await GET(mockRequest())
    expect(mockFindAll).toHaveBeenCalledWith(expect.objectContaining({ active_only: true }))
  })

  it('active_only=false includes inactive', async () => {
    mockUserSession()
    mockFindAll.mockReturnValue([])
    await GET(mockRequest({ url: 'http://localhost/api/eval/tasks?active_only=false' }))
    expect(mockFindAll).toHaveBeenCalledWith(expect.objectContaining({ active_only: false }))
  })

  it('returns 500 on Bridge error', async () => {
    mockUserSession()
    mockFindAll.mockImplementation(() => { throw new Error('DB fail') })

    const res = await GET(mockRequest())
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toContain('DB fail')
  })
})

// ─── POST /api/eval/tasks ────────────────────────────────────────────────────

describe('POST /api/eval/tasks', () => {
  beforeEach(() => jest.clearAllMocks())

  const validBody = {
    prompt: 'Test prompt',
    expected_output: 'Test output',
    category: 'API',
    target_model: 'sonnet',
  }

  it('returns 403 for non-ADMIN (AC-3)', async () => {
    mockUserSession()
    const res = await POST(mockRequest({ method: 'POST', body: validBody }))
    expect(res.status).toBe(403)
  })

  it('returns 201 for ADMIN with valid body (AC-3)', async () => {
    mockAdminSession()
    mockCreate.mockReturnValue(mockTask())

    const res = await POST(mockRequest({ method: 'POST', body: validBody }))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.task).toMatchObject({ prompt: 'Test prompt', category: 'API' })
  })

  it('returns 400 missing prompt (AC-4)', async () => {
    mockAdminSession()
    const res = await POST(mockRequest({ method: 'POST', body: { ...validBody, prompt: undefined } }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('prompt')
  })

  it('returns 400 missing expected_output (AC-4)', async () => {
    mockAdminSession()
    const res = await POST(mockRequest({ method: 'POST', body: { ...validBody, expected_output: undefined } }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('expected_output')
  })

  it('returns 400 missing category (AC-4)', async () => {
    mockAdminSession()
    const res = await POST(mockRequest({ method: 'POST', body: { ...validBody, category: undefined } }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('category')
  })

  it('returns 400 invalid category (AC-4)', async () => {
    mockAdminSession()
    const res = await POST(mockRequest({ method: 'POST', body: { ...validBody, category: 'InvalidCategory' } }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Invalid category')
  })

  it('returns 400 missing target_model (AC-4)', async () => {
    mockAdminSession()
    const res = await POST(mockRequest({ method: 'POST', body: { ...validBody, target_model: undefined } }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('target_model')
  })

  it('returns 400 invalid target_model (AC-4)', async () => {
    mockAdminSession()
    const res = await POST(mockRequest({ method: 'POST', body: { ...validBody, target_model: 'bad' } }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Invalid target_model')
  })

  it('accepts all valid categories', async () => {
    for (const cat of ['API', 'Auth', 'CRUD', 'Pipeline', 'Reasoning', 'Home']) {
      jest.clearAllMocks()
      mockAdminSession()
      mockCreate.mockReturnValue(mockTask({ category: cat }))
      const res = await POST(mockRequest({ method: 'POST', body: { ...validBody, category: cat } }))
      expect(res.status).toBe(201)
    }
  })

  it('accepts all valid target_models', async () => {
    for (const m of ['haiku', 'kimi', 'sonnet', 'codex', 'glm']) {
      jest.clearAllMocks()
      mockAdminSession()
      mockCreate.mockReturnValue(mockTask({ target_model: m }))
      const res = await POST(mockRequest({ method: 'POST', body: { ...validBody, target_model: m } }))
      expect(res.status).toBe(201)
    }
  })
})

// ─── PATCH /api/eval/tasks/[id] ─────────────────────────────────────────────

describe('PATCH /api/eval/tasks/[id]', () => {
  beforeEach(() => jest.clearAllMocks())

  const mkParams = (id: string) => ({ params: Promise.resolve({ id }) })

  it('returns 403 for non-ADMIN', async () => {
    mockUserSession()
    const res = await PATCH(mockRequest({ method: 'PATCH', body: { prompt: 'x' } }), mkParams('task-123'))
    expect(res.status).toBe(403)
  })

  it('returns 404 for non-existent task (AC-5)', async () => {
    mockAdminSession()
    mockFindById.mockReturnValue(null)
    const res = await PATCH(mockRequest({ method: 'PATCH', body: { prompt: 'x' } }), mkParams('missing'))
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toContain('not found')
  })

  it('returns 200 for partial update (AC-5)', async () => {
    mockAdminSession()
    mockFindById.mockReturnValue(mockTask())
    mockUpdate.mockReturnValue(mockTask({ prompt: 'Updated' }))

    const res = await PATCH(mockRequest({ method: 'PATCH', body: { prompt: 'Updated' } }), mkParams('task-123'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.task.prompt).toBe('Updated')
  })

  it('supports updating all fields', async () => {
    mockAdminSession()
    mockFindById.mockReturnValue(mockTask())
    const updated = { prompt: 'P', expected_output: 'O', category: 'Pipeline', target_model: 'kimi', is_active: false }
    mockUpdate.mockReturnValue(mockTask(updated))

    const res = await PATCH(mockRequest({ method: 'PATCH', body: updated }), mkParams('task-123'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.task).toMatchObject(updated)
  })

  it('returns 400 for invalid category', async () => {
    mockAdminSession()
    mockFindById.mockReturnValue(mockTask())
    const res = await PATCH(mockRequest({ method: 'PATCH', body: { category: 'Bad' } }), mkParams('task-123'))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid target_model', async () => {
    mockAdminSession()
    mockFindById.mockReturnValue(mockTask())
    const res = await PATCH(mockRequest({ method: 'PATCH', body: { target_model: 'bad' } }), mkParams('task-123'))
    expect(res.status).toBe(400)
  })

  it('returns existing task when empty body', async () => {
    mockAdminSession()
    mockFindById.mockReturnValue(mockTask())
    const res = await PATCH(mockRequest({ method: 'PATCH', body: {} }), mkParams('task-123'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.task).toBeDefined()
  })
})

// ─── DELETE /api/eval/tasks/[id] ─────────────────────────────────────────────

describe('DELETE /api/eval/tasks/[id]', () => {
  beforeEach(() => jest.clearAllMocks())

  const mkParams = (id: string) => ({ params: Promise.resolve({ id }) })

  it('returns 403 for non-ADMIN (AC-6)', async () => {
    mockUserSession()
    const res = await DELETE(mockRequest({ method: 'DELETE' }), mkParams('task-123'))
    expect(res.status).toBe(403)
  })

  it('returns 404 for non-existent task (AC-6)', async () => {
    mockAdminSession()
    mockFindById.mockReturnValue(null)
    const res = await DELETE(mockRequest({ method: 'DELETE' }), mkParams('missing'))
    expect(res.status).toBe(404)
  })

  it('returns 200 with success:true (AC-6)', async () => {
    mockAdminSession()
    mockFindById.mockReturnValue(mockTask())
    mockDeleteFn.mockReturnValue(true)

    const res = await DELETE(mockRequest({ method: 'DELETE' }), mkParams('task-123'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(mockDeleteFn).toHaveBeenCalledWith('task-123')
  })
})
