/**
 * __tests__/services/system.service.test.ts
 * STORY-10.6 — Unit tests for system.service
 *
 * Test matrix:
 *  TC-1  getStatus — happy path returns SystemStatusResponse
 *  TC-2  getStatus — 503 throws "Bridge jest niedostępny"
 *  TC-3  getStatus — 500 throws "Błąd serwera systemu"
 *  TC-4  getStatus — network error throws Polish message
 *  TC-5  getApiKeys — happy path returns ApiKeyMeta[]
 *  TC-6  getApiKeys — unwraps response.keys
 *  TC-7  getApiKeys — 503 throws Polish error
 *  TC-8  getCronJobs — happy path returns CronJob[]
 *  TC-9  getCronJobs — unwraps response.jobs
 * TC-10  getCronJobs — 500 throws Polish error
 * TC-11  restartBridge — happy path returns { message }
 * TC-12  restartBridge — 503 throws Polish error
 * TC-13  restartBridge — POST method called
 */

import { jest } from '@jest/globals'
import type {
  SystemStatusResponse,
  ApiKeyMeta,
  CronJob,
} from '@/types/system.types'

// ─── Mock fetch ───────────────────────────────────────────────────────────────

const mockFetch = jest.fn<Promise<Response>, [string, RequestInit?]>()
global.fetch = mockFetch as typeof fetch

// ─── Import SUT ───────────────────────────────────────────────────────────────

import {
  SystemService,
} from '@/services/system.service'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_STATUS: SystemStatusResponse = {
  openclaw: {
    version: '1.0.0',
    uptime: 3600,
    channels: {
      whatsapp: true,
      telegram: false,
    },
  },
  bridge: {
    status: 'UP',
    version: '1.0.0',
    lastError: null,
  },
}

const MOCK_API_KEYS: ApiKeyMeta[] = [
  {
    name: 'OPENAI_API_KEY',
    maskedValue: 'sk-****abcd',
    status: 'active',
    expiresAt: null,
  },
  {
    name: 'ANTHROPIC_API_KEY',
    maskedValue: 'sk-****1234',
    status: 'expired',
    expiresAt: '2026-01-01T00:00:00Z',
  },
]

const MOCK_CRON_JOBS: CronJob[] = [
  {
    name: 'digest-cleanup',
    schedule: '0 2 * * *',
    lastRun: '2026-02-25T02:00:00Z',
    lastStatus: 'success',
  },
  {
    name: 'nightclaw-run',
    schedule: '0 3 * * *',
    lastRun: null,
    lastStatus: 'never',
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockOk(body: unknown): void {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => body,
  } as Response)
}

function mockFail(status: number): void {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
  } as Response)
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('system.service', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  // ─── getStatus ─────────────────────────────────────────────────────────────

  describe('getStatus', () => {
    it('TC-1: returns SystemStatusResponse on success', async () => {
      mockOk(MOCK_STATUS)
      const result = await SystemService.getStatus()
      expect(result).toEqual(MOCK_STATUS)
      expect(mockFetch).toHaveBeenCalledWith('/api/system/status', undefined)
    })

    it('TC-2: 503 throws "Bridge jest niedostępny"', async () => {
      mockFail(503)
      await expect(SystemService.getStatus()).rejects.toThrow(
        'Bridge jest niedostępny'
      )
    })

    it('TC-3: 500 throws "Błąd serwera systemu"', async () => {
      mockFail(500)
      await expect(SystemService.getStatus()).rejects.toThrow(
        'Błąd serwera systemu'
      )
    })

    it('TC-4: network error throws Polish message', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'))
      await expect(SystemService.getStatus()).rejects.toThrow(
        'Brak połączenia z serwerem'
      )
    })

    it('unknown status throws generic server error', async () => {
      mockFail(418)
      await expect(SystemService.getStatus()).rejects.toThrow(
        'Błąd serwera systemu'
      )
    })
  })

  // ─── getApiKeys ────────────────────────────────────────────────────────────

  describe('getApiKeys', () => {
    it('TC-5: returns ApiKeyMeta[] on success', async () => {
      mockOk({ keys: MOCK_API_KEYS })
      const result = await SystemService.getApiKeys()
      expect(result).toEqual(MOCK_API_KEYS)
    })

    it('TC-6: unwraps response.keys array', async () => {
      mockOk({ keys: MOCK_API_KEYS })
      const result = await SystemService.getApiKeys()
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('OPENAI_API_KEY')
    })

    it('TC-7: 503 throws "Bridge jest niedostępny"', async () => {
      mockFail(503)
      await expect(SystemService.getApiKeys()).rejects.toThrow(
        'Bridge jest niedostępny'
      )
    })

    it('500 throws "Błąd serwera systemu"', async () => {
      mockFail(500)
      await expect(SystemService.getApiKeys()).rejects.toThrow(
        'Błąd serwera systemu'
      )
    })

    it('network error throws Polish message', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'))
      await expect(SystemService.getApiKeys()).rejects.toThrow(
        'Brak połączenia z serwerem'
      )
    })
  })

  // ─── getCronJobs ───────────────────────────────────────────────────────────

  describe('getCronJobs', () => {
    it('TC-8: returns CronJob[] on success', async () => {
      mockOk({ jobs: MOCK_CRON_JOBS })
      const result = await SystemService.getCronJobs()
      expect(result).toEqual(MOCK_CRON_JOBS)
    })

    it('TC-9: unwraps response.jobs array', async () => {
      mockOk({ jobs: MOCK_CRON_JOBS })
      const result = await SystemService.getCronJobs()
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('digest-cleanup')
    })

    it('TC-10: 500 throws "Błąd serwera systemu"', async () => {
      mockFail(500)
      await expect(SystemService.getCronJobs()).rejects.toThrow(
        'Błąd serwera systemu'
      )
    })

    it('503 throws "Bridge jest niedostępny"', async () => {
      mockFail(503)
      await expect(SystemService.getCronJobs()).rejects.toThrow(
        'Bridge jest niedostępny'
      )
    })

    it('network error throws Polish message', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'))
      await expect(SystemService.getCronJobs()).rejects.toThrow(
        'Brak połączenia z serwerem'
      )
    })
  })

  // ─── restartBridge ─────────────────────────────────────────────────────────

  describe('restartBridge', () => {
    it('TC-11: returns { message } on success', async () => {
      mockOk({ message: 'Bridge restart initiated' })
      const result = await SystemService.restartBridge()
      expect(result).toEqual({ message: 'Bridge restart initiated' })
    })

    it('TC-12: 503 throws "Bridge jest niedostępny"', async () => {
      mockFail(503)
      await expect(SystemService.restartBridge()).rejects.toThrow(
        'Bridge jest niedostępny'
      )
    })

    it('TC-13: sends POST request', async () => {
      mockOk({ message: 'OK' })
      await SystemService.restartBridge()
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/system/restart-bridge',
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('500 throws "Błąd serwera systemu"', async () => {
      mockFail(500)
      await expect(SystemService.restartBridge()).rejects.toThrow(
        'Błąd serwera systemu'
      )
    })

    it('network error throws Polish message', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'))
      await expect(SystemService.restartBridge()).rejects.toThrow(
        'Brak połączenia z serwerem'
      )
    })
  })
})
