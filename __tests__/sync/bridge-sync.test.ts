/**
 * Bridge Sync Tests
 * Tests for scripts/sync-bridge-to-supabase.ts
 */

import { parseJsonArray, normalizeTimestamp, normalizeText } from '../../scripts/sync-bridge-to-supabase'

// Mock better-sqlite3
const mockAll = jest.fn()
const mockPrepare = jest.fn(() => ({ all: mockAll }))
const mockClose = jest.fn()

jest.mock('better-sqlite3', () => {
  return jest.fn(() => ({
    prepare: mockPrepare,
    close: mockClose,
  }))
})

// Mock @supabase/supabase-js
const mockUpsert = jest.fn()
const mockFrom = jest.fn(() => ({ upsert: mockUpsert }))

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}))

describe('Bridge Sync Script', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Helper Functions', () => {
    describe('parseJsonArray', () => {
      it('returns empty array for null', () => {
        expect(parseJsonArray(null)).toEqual([])
      })

      it('returns empty array for empty string', () => {
        expect(parseJsonArray('')).toEqual([])
      })

      it('returns empty array for "[]"', () => {
        expect(parseJsonArray('[]')).toEqual([])
      })

      it('returns empty array for "null"', () => {
        expect(parseJsonArray('null')).toEqual([])
      })

      it('parses JSON array correctly', () => {
        expect(parseJsonArray('["STORY-1.1", "STORY-1.2"]')).toEqual(['STORY-1.1', 'STORY-1.2'])
      })

      it('handles comma-separated string as fallback', () => {
        expect(parseJsonArray('STORY-1.1,STORY-1.2')).toEqual(['STORY-1.1', 'STORY-1.2'])
      })

      it('filters out empty strings from comma-separated values', () => {
        expect(parseJsonArray('STORY-1.1,,STORY-1.2')).toEqual(['STORY-1.1', 'STORY-1.2'])
      })
    })

    describe('normalizeTimestamp', () => {
      it('returns null for null', () => {
        expect(normalizeTimestamp(null)).toBeNull()
      })

      it('returns null for empty string', () => {
        expect(normalizeTimestamp('')).toBeNull()
      })

      it('returns trimmed string for valid timestamp', () => {
        expect(normalizeTimestamp('2026-02-26T10:00:00Z ')).toBe('2026-02-26T10:00:00Z')
      })

      it('returns string as-is for valid timestamp', () => {
        expect(normalizeTimestamp('2026-02-26T10:00:00Z')).toBe('2026-02-26T10:00:00Z')
      })
    })

    describe('normalizeText', () => {
      it('returns null for null', () => {
        expect(normalizeText(null)).toBeNull()
      })

      it('returns null for empty string', () => {
        expect(normalizeText('')).toBeNull()
      })

      it('returns string as-is for non-empty value', () => {
        expect(normalizeText('some value')).toBe('some value')
      })
    })
  })

  describe('Sync Stories', () => {
    const mockStoryRow = {
      project_id: 'kira-dashboard',
      id: 'STORY-1.1',
      epic_id: 'EPIC-1',
      title: 'Test Story',
      file_path: '/path/to/story.md',
      status: 'IN_PROGRESS',
      size: 'medium',
      expected_duration_min: 60,
      depends_on: '["STORY-1.0"]',
      parallel_with: '[]',
      assigned_worker: 'worker-1',
      branch: 'feature/STORY-1.1',
      definition_of_done: 'Tests pass',
      created_at: '2026-02-26T10:00:00Z',
      updated_at: '2026-02-26T12:00:00Z',
      started_at: '2026-02-26T11:00:00Z',
      model: 'sonnet',
    }

    it('reads stories from SQLite for kira-dashboard project', async () => {
      mockAll.mockReturnValue([mockStoryRow])
      mockUpsert.mockResolvedValue({ error: null })

      const { syncStories } = await import('../../scripts/sync-bridge-to-supabase')
      const supabase = { from: mockFrom } as any

      await syncStories(supabase)

      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('project_id = ?'))
    })

    it('upserts stories to Supabase with correct format', async () => {
      mockAll.mockReturnValue([mockStoryRow])
      mockUpsert.mockResolvedValue({ error: null })

      const { syncStories } = await import('../../scripts/sync-bridge-to-supabase')
      const supabase = { from: mockFrom } as any

      await syncStories(supabase)

      expect(mockFrom).toHaveBeenCalledWith('bridge_stories')
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'STORY-1.1',
            project_id: 'kira-dashboard',
            epic_id: 'EPIC-1',
            title: 'Test Story',
            status: 'IN_PROGRESS',
            depends_on: ['STORY-1.0'],
            parallel_with: [],
            synced_at: expect.any(String),
          }),
        ]),
        expect.objectContaining({
          onConflict: 'id,project_id',
          ignoreDuplicates: false,
        })
      )
    })

    it('handles empty stories gracefully', async () => {
      mockAll.mockReturnValue([])

      const { syncStories } = await import('../../scripts/sync-bridge-to-supabase')
      const supabase = { from: mockFrom } as any

      const result = await syncStories(supabase)

      expect(result).toBe(0)
      expect(mockFrom).not.toHaveBeenCalled()
    })

    it('throws error when Supabase upsert fails', async () => {
      mockAll.mockReturnValue([mockStoryRow])
      mockUpsert.mockResolvedValue({ error: { message: 'Connection failed' } })

      const { syncStories } = await import('../../scripts/sync-bridge-to-supabase')
      const supabase = { from: mockFrom } as any

      await expect(syncStories(supabase)).rejects.toThrow('Connection failed')
    })

    it('batches upserts in groups of 100', async () => {
      const manyStories = Array(250).fill(null).map((_, i) => ({
        ...mockStoryRow,
        id: `STORY-${i}`,
      }))
      mockAll.mockReturnValue(manyStories)
      mockUpsert.mockResolvedValue({ error: null })

      const { syncStories } = await import('../../scripts/sync-bridge-to-supabase')
      const supabase = { from: mockFrom } as any

      await syncStories(supabase)

      // Should be called 3 times: 100 + 100 + 50
      expect(mockUpsert).toHaveBeenCalledTimes(3)
    })

    it('converts JSON depends_on to string array', async () => {
      const storyWithDeps = {
        ...mockStoryRow,
        depends_on: '["STORY-1.0", "STORY-1.2"]',
      }
      mockAll.mockReturnValue([storyWithDeps])
      mockUpsert.mockResolvedValue({ error: null })

      const { syncStories } = await import('../../scripts/sync-bridge-to-supabase')
      const supabase = { from: mockFrom } as any

      await syncStories(supabase)

      const upsertCall = mockUpsert.mock.calls[0][0]
      expect(upsertCall[0].depends_on).toEqual(['STORY-1.0', 'STORY-1.2'])
    })

    it('handles null depends_on gracefully', async () => {
      const storyWithNullDeps = {
        ...mockStoryRow,
        depends_on: null,
      }
      mockAll.mockReturnValue([storyWithNullDeps])
      mockUpsert.mockResolvedValue({ error: null })

      const { syncStories } = await import('../../scripts/sync-bridge-to-supabase')
      const supabase = { from: mockFrom } as any

      await syncStories(supabase)

      const upsertCall = mockUpsert.mock.calls[0][0]
      expect(upsertCall[0].depends_on).toEqual([])
    })
  })

  describe('Sync Epics', () => {
    const mockEpicRow = {
      project_id: 'kira-dashboard',
      id: 'EPIC-1',
      title: 'Test Epic',
      file_path: '/path/to/epic.md',
      status: 'IN_PROGRESS',
      created_at: '2026-02-26T10:00:00Z',
      org_id: null,
      workspace_id: null,
      total_stories: 5,
      done_stories: 2,
    }

    it('reads epics with computed story counts from SQLite', async () => {
      mockAll.mockReturnValue([mockEpicRow])
      mockUpsert.mockResolvedValue({ error: null })

      const { syncEpics } = await import('../../scripts/sync-bridge-to-supabase')
      const supabase = { from: mockFrom } as any

      await syncEpics(supabase)

      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('COUNT(s.id)'))
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('SUM(CASE WHEN s.status'))
    })

    it('upserts epics to Supabase with correct format', async () => {
      mockAll.mockReturnValue([mockEpicRow])
      mockUpsert.mockResolvedValue({ error: null })

      const { syncEpics } = await import('../../scripts/sync-bridge-to-supabase')
      const supabase = { from: mockFrom } as any

      await syncEpics(supabase)

      expect(mockFrom).toHaveBeenCalledWith('bridge_epics')
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'EPIC-1',
            project_id: 'kira-dashboard',
            title: 'Test Epic',
            status: 'IN_PROGRESS',
            total_stories: 5,
            done_stories: 2,
            synced_at: expect.any(String),
          }),
        ]),
        expect.objectContaining({
          onConflict: 'id,project_id',
          ignoreDuplicates: false,
        })
      )
    })

    it('handles empty epics gracefully', async () => {
      mockAll.mockReturnValue([])

      const { syncEpics } = await import('../../scripts/sync-bridge-to-supabase')
      const supabase = { from: mockFrom } as any

      const result = await syncEpics(supabase)

      expect(result).toBe(0)
    })

    it('throws error when Supabase upsert fails', async () => {
      mockAll.mockReturnValue([mockEpicRow])
      mockUpsert.mockResolvedValue({ error: { message: 'Rate limit exceeded' } })

      const { syncEpics } = await import('../../scripts/sync-bridge-to-supabase')
      const supabase = { from: mockFrom } as any

      await expect(syncEpics(supabase)).rejects.toThrow('Rate limit exceeded')
    })

    it('defaults total_stories and done_stories to 0 when null', async () => {
      const epicWithNullCounts = {
        ...mockEpicRow,
        total_stories: null,
        done_stories: null,
      }
      mockAll.mockReturnValue([epicWithNullCounts])
      mockUpsert.mockResolvedValue({ error: null })

      const { syncEpics } = await import('../../scripts/sync-bridge-to-supabase')
      const supabase = { from: mockFrom } as any

      await syncEpics(supabase)

      const upsertCall = mockUpsert.mock.calls[0][0]
      expect(upsertCall[0].total_stories).toBe(0)
      expect(upsertCall[0].done_stories).toBe(0)
    })
  })

  describe('Integration', () => {
    it('closes SQLite connection after sync', async () => {
      mockAll.mockReturnValue([])

      const { syncStories } = await import('../../scripts/sync-bridge-to-supabase')
      const supabase = { from: mockFrom } as any

      await syncStories(supabase)

      expect(mockClose).toHaveBeenCalled()
    })

    it('closes SQLite connection even on error', async () => {
      mockAll.mockReturnValue([{ project_id: 'kira-dashboard', id: 'STORY-1' }])
      mockUpsert.mockResolvedValue({ error: { message: 'Error' } })

      const { syncStories } = await import('../../scripts/sync-bridge-to-supabase')
      const supabase = { from: mockFrom } as any

      await expect(syncStories(supabase)).rejects.toThrow()
      expect(mockClose).toHaveBeenCalled()
    })
  })
})
