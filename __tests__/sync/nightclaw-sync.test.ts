/**
 * __tests__/sync/nightclaw-sync.test.ts
 * STORY-12.5 — Tests for NightClaw → Supabase sync script
 */

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

// Mock modules
jest.mock('@supabase/supabase-js');
jest.mock('child_process');
jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    existsSync: jest.fn(actual.existsSync),
  };
});

const mockExistsSync = existsSync as jest.Mock;

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnValue({ data: null, error: null }),
};

(createClient as jest.Mock).mockReturnValue(mockSupabase);

import {
  syncDigests,
  syncResearch,
  syncSkillsDiff
} from '../../scripts/sync-nightclaw-to-supabase';

describe('STORY-12.5: NightClaw Sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase.upsert.mockReturnValue({ data: null, error: null });
    // Default: let real existsSync through
    mockExistsSync.mockImplementation(jest.requireActual('fs').existsSync);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  // ─── Digest Sync ─────────────────────────────────────────────────────────
  describe('Digest Sync', () => {
    it('should call nightclaw_digests table and sync all digest files', async () => {
      const count = await syncDigests(mockSupabase as any);
      expect(count).toBeGreaterThan(0);
      expect(mockSupabase.from).toHaveBeenCalledWith('nightclaw_digests');
    });

    it('should upsert with run_date as conflict key', async () => {
      await syncDigests(mockSupabase as any);
      const upsertCalls = mockSupabase.upsert.mock.calls;
      expect(upsertCalls.length).toBeGreaterThan(0);
      expect(upsertCalls[0][1]).toEqual({ onConflict: 'run_date' });
    });

    it('should pass records with correct schema', async () => {
      await syncDigests(mockSupabase as any);
      const records = mockSupabase.upsert.mock.calls[0][0]; // array of records
      const record = records[0];
      expect(record).toHaveProperty('run_date');
      expect(record).toHaveProperty('content_md');
      expect(record).toHaveProperty('summary');
      expect(record).toHaveProperty('stories_done');
      expect(record).toHaveProperty('stories_failed');
      expect(record).toHaveProperty('models_used');
      expect(typeof record.stories_done).toBe('number');
      expect(typeof record.stories_failed).toBe('number');
      expect(Array.isArray(record.models_used)).toBe(true);
    });

    it('should handle Supabase errors gracefully', async () => {
      mockSupabase.upsert.mockReturnValue({
        data: null,
        error: { message: 'Connection failed', code: 'PGRST000' }
      });
      const count = await syncDigests(mockSupabase as any);
      expect(count).toBe(0);
    });

    it('should handle missing digest directory gracefully', async () => {
      mockExistsSync.mockReturnValue(false);
      const count = await syncDigests(mockSupabase as any);
      expect(count).toBe(0);
    });

    it('should limit summary to 500 characters', async () => {
      await syncDigests(mockSupabase as any);
      const records = mockSupabase.upsert.mock.calls[0][0];
      for (const r of records) {
        expect(r.summary.length).toBeLessThanOrEqual(500);
      }
    });
  });

  // ─── Research Sync ────────────────────────────────────────────────────────
  describe('Research Sync', () => {
    it('should call nightclaw_research table and sync solution files', async () => {
      const count = await syncResearch(mockSupabase as any);
      expect(count).toBeGreaterThan(0);
      expect(mockSupabase.from).toHaveBeenCalledWith('nightclaw_research');
    });

    it('should upsert with slug as conflict key', async () => {
      await syncResearch(mockSupabase as any);
      const upsertCalls = mockSupabase.upsert.mock.calls;
      expect(upsertCalls.length).toBeGreaterThan(0);
      expect(upsertCalls[0][1]).toEqual({ onConflict: 'slug' });
    });

    it('should pass records with correct schema', async () => {
      await syncResearch(mockSupabase as any);
      const records = mockSupabase.upsert.mock.calls[0][0];
      const record = records[0];
      expect(record).toHaveProperty('slug');
      expect(record).toHaveProperty('title');
      expect(record).toHaveProperty('problem');
      expect(record).toHaveProperty('status');
      expect(record).toHaveProperty('source_url');
      expect(['pending', 'applied', 'skipped']).toContain(record.status);
    });

    it('should handle missing solutions directory gracefully', async () => {
      mockExistsSync.mockReturnValue(false);
      const count = await syncResearch(mockSupabase as any);
      expect(count).toBe(0);
    });
  });

  // ─── Skills Diff Sync ─────────────────────────────────────────────────────
  describe('Skills Diff Sync', () => {
    beforeEach(() => {
      // Mock existsSync to return true for skills dir and .git
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && (p.includes('.openclaw/skills') || p.includes('.git'))) {
          return true;
        }
        return jest.requireActual('fs').existsSync(p);
      });

      (execSync as jest.Mock).mockImplementation((cmd: string) => {
        if (cmd.includes('git diff --name-only')) {
          return 'kira-orchestrator/SKILL.md\ncode-review/SKILL.md\n';
        }
        if (cmd.includes('git log')) {
          return '2026-02-26T10:00:00+00:00';
        }
        if (cmd.includes('git diff HEAD')) {
          return '+Added line\n+Another added\n-Removed line\n';
        }
        return '';
      });
    });

    it('should call nightclaw_skills_diff table', async () => {
      await syncSkillsDiff(mockSupabase as any);
      expect(mockSupabase.from).toHaveBeenCalledWith('nightclaw_skills_diff');
    });

    it('should upsert with run_date,skill_name as conflict key', async () => {
      await syncSkillsDiff(mockSupabase as any);
      const upsertCalls = mockSupabase.upsert.mock.calls;
      expect(upsertCalls.length).toBeGreaterThan(0);
      expect(upsertCalls[0][1]).toEqual({ onConflict: 'run_date,skill_name' });
    });

    it('should pass records with correct schema', async () => {
      await syncSkillsDiff(mockSupabase as any);
      const records = mockSupabase.upsert.mock.calls[0][0];
      const record = records[0];
      expect(record).toHaveProperty('run_date');
      expect(record).toHaveProperty('skill_name');
      expect(record).toHaveProperty('skill_path');
      expect(record).toHaveProperty('diff_content');
      expect(record).toHaveProperty('lines_added');
      expect(record).toHaveProperty('lines_removed');
      expect(record).toHaveProperty('modified_at');
      expect(typeof record.lines_added).toBe('number');
      expect(typeof record.lines_removed).toBe('number');
    });

    it('should handle git errors gracefully', async () => {
      (execSync as jest.Mock).mockImplementation(() => {
        throw new Error('git error');
      });
      const count = await syncSkillsDiff(mockSupabase as any);
      expect(count).toBe(0);
    });

    it('should handle missing skills directory', async () => {
      mockExistsSync.mockReturnValue(false);
      const count = await syncSkillsDiff(mockSupabase as any);
      expect(count).toBe(0);
    });
  });

  // ─── Upsert idempotency ──────────────────────────────────────────────────
  describe('Upsert idempotency', () => {
    it('should call upsert (not insert) for safe re-runs', async () => {
      await syncDigests(mockSupabase as any);
      await syncDigests(mockSupabase as any);
      // All calls should be upsert, never insert
      expect(mockSupabase.upsert).toHaveBeenCalled();
    });
  });
});
