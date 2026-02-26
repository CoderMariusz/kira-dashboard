/**
 * __tests__/services/system.service.test.tsx
 * STORY-10.6 — Unit tests for system.service
 */

import { jest } from '@jest/globals'
import type { SystemStatusResponse, ApiKeyMeta, CronJob } from '@/types/system.types'

const mockFetch = jest.fn<Promise<Response>, [string, RequestInit?]>()
global.fetch = mockFetch as typeof fetch

import { SystemService } from '@/services/system.service'

const MOCK_STATUS: SystemStatusResponse = {
  openclaw: { version: '1.0.0', uptime: 3600, channels: { whatsapp: true, telegram: false } },
  bridge: { status: 'UP', version: '1.0.0', lastError: null },
}

const MOCK_API_KEYS: ApiKeyMeta[] = [
  { name: 'OPENAI_API_KEY', maskedValue: 'sk-****abcd', status: 'active', expiresAt: null },
  { name: 'ANTHROPIC_API_KEY', maskedValue: 'sk-****1234', status: 'expired', expiresAt: '2026-01-01T00:00:00Z' },
]

const MOCK_CRON_JOBS: CronJob[] = [
  { name: 'digest-cleanup', schedule: '0 2 * * *', lastRun: '2026-02-25T02:00:00Z', lastStatus: 'success' },
  { name: 'nightclaw-run', schedule: '0 3 * * *', lastRun: null, lastStatus: 'never' },
]

function mockOk(body: unknown): void {
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => body } as Response)
}

function mockFail(status: number): void {
  mockFetch.mockResolvedValueOnce({ ok: false, status } as Response)
}

describe('system.service', () => {
  beforeEach(() => { mockFetch.mockClear() })

  describe('getStatus', () => {
    it('returns SystemStatusResponse on success', async () => {
      mockOk(MOCK_STATUS)
      const result = await SystemService.getStatus()
      expect(result).toEqual(MOCK_STATUS)
      expect(mockFetch).toHaveBeenCalledWith('/api/system/status', undefined)
    })

    it('503 throws "Bridge jest niedostępny"', async () => {
      mockFail(503)
      await expect(SystemService.getStatus()).rejects.toThrow('Bridge jest niedostępny')
    })

    it('500 throws "Błąd serwera systemu"', async () => {
      mockFail(500)
      await expect(SystemService.getStatus()).rejects.toThrow('Błąd serwera systemu')
    })

    it('network error throws Polish message', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'))
      await expect(SystemService.getStatus()).rejects.toThrow('Brak połączenia z serwerem')
    })
  })

  describe('getApiKeys', () => {
    it('returns ApiKeyMeta[] on success', async () => {
      mockOk({ keys: MOCK_API_KEYS })
      const result = await SystemService.getApiKeys()
      expect(result).toEqual(MOCK_API_KEYS)
    })

    it('unwraps response.keys array', async () => {
      mockOk({ keys: MOCK_API_KEYS })
      const result = await SystemService.getApiKeys()
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('OPENAI_API_KEY')
    })

    it('503 throws "Bridge jest niedostępny"', async () => {
      mockFail(503)
      await expect(SystemService.getApiKeys()).rejects.toThrow('Bridge jest niedostępny')
    })

    it('500 throws "Błąd serwera systemu"', async () => {
      mockFail(500)
      await expect(SystemService.getApiKeys()).rejects.toThrow('Błąd serwera systemu')
    })
  })

  describe('getCronJobs', () => {
    it('returns CronJob[] on success', async () => {
      mockOk({ jobs: MOCK_CRON_JOBS })
      const result = await SystemService.getCronJobs()
      expect(result).toEqual(MOCK_CRON_JOBS)
    })

    it('unwraps response.jobs array', async () => {
      mockOk({ jobs: MOCK_CRON_JOBS })
      const result = await SystemService.getCronJobs()
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('digest-cleanup')
    })

    it('500 throws "Błąd serwera systemu"', async () => {
      mockFail(500)
      await expect(SystemService.getCronJobs()).rejects.toThrow('Błąd serwera systemu')
    })

    it('503 throws "Bridge jest niedostępny"', async () => {
      mockFail(503)
      await expect(SystemService.getCronJobs()).rejects.toThrow('Bridge jest niedostępny')
    })
  })

  describe('restartBridge', () => {
    it('returns { message } on success', async () => {
      mockOk({ message: 'Bridge restart initiated' })
      const result = await SystemService.restartBridge()
      expect(result).toEqual({ message: 'Bridge restart initiated' })
    })

    it('503 throws "Bridge jest niedostępny"', async () => {
      mockFail(503)
      await expect(SystemService.restartBridge()).rejects.toThrow('Bridge jest niedostępny')
    })

    it('sends POST request', async () => {
      mockOk({ message: 'OK' })
      await SystemService.restartBridge()
      expect(mockFetch).toHaveBeenCalledWith('/api/system/restart-bridge', expect.objectContaining({ method: 'POST' }))
    })

    it('500 throws "Błąd serwera systemu"', async () => {
      mockFail(500)
      await expect(SystemService.restartBridge()).rejects.toThrow('Błąd serwera systemu')
    })
  })
})
