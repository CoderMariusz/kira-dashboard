/**
 * __tests__/sync/nightclaw-sync.test.ts
 * STORY-12.5 — Tests for NightClaw → Supabase sync script
 */

// Mock dotenv before any imports
jest.mock('dotenv', () => ({ config: jest.fn() }));

import { existsSync, readdirSync, readFileSync } from 'fs';
import { execSync } from 'child_process';

// Mock fs
jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    existsSync: jest.fn(actual.existsSync),
    readdirSync: jest.fn(actual.readdirSync),
    readFileSync: jest.fn(actual.readFileSync),
  };
});

// Mock child_process
jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

const mockExistsSync = existsSync as jest.Mock;
const mockReaddirSync = readdirSync as jest.Mock;
const mockReadFileSync = readFileSync as jest.Mock;
const mockExecSync = execSync as jest.Mock;

// ─── Supabase mock ────────────────────────────────────────────────────────────
const mockUpsert = jest.fn().mockResolvedValue({ data: null, error: null });
const mockFrom = jest.fn().mockReturnValue({ upsert: mockUpsert });
const mockSupabase = { from: mockFrom } as any;

// ─── Sample data ──────────────────────────────────────────────────────────────
const SAMPLE_DIGEST = `# NightClaw Digest — 2026-02-26 🌙

## 📊 Podsumowanie dnia

- **Stories zakończone:** EPIC-9 (8/8) ✅ = **16 stories**
- **Błędy agentów:** 1 fail
- **Modele:** sonnet (11 runów), kimi (4 runy)

## ✅ Co poszło dobrze

Detail line one.
Detail line two.
`;

const SAMPLE_SOLUTION = `# Solution Research: Temporal Worker

## Problem
Temporal worker nie działa jako stabilny daemon na macOS.

## Research Findings
Based on LaunchAgent pattern, configure the following plist.

## Next Steps
1. Create plist file
2. Load and test
`;

// ─── Import after mocks ───────────────────────────────────────────────────────
import {
  parseDigestContent,
  parseResearchContent,
  syncDigests,
  syncResearch,
  syncSkillsDiff,
} from '../../scripts/sync-nightclaw-to-supabase';

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('STORY-12.5: NightClaw Sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpsert.mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue({ upsert: mockUpsert });
  });

  // ─── parseDigestContent ──────────────────────────────────────────────────
  describe('parseDigestContent', () => {
    it('extracts summary from non-header lines', () => {
      const result = parseDigestContent(SAMPLE_DIGEST);
      expect(result.summary).toBeDefined();
      expect(typeof result.summary).toBe('string');
      expect(result.summary!.length).toBeLessThanOrEqual(500);
    });

    it('parses stories_done from "Stories zakończone:" line', () => {
      const result = parseDigestContent(SAMPLE_DIGEST);
      expect(result.stories_done).toBe(16);
    });

    it('parses stories_failed from "Błędy agentów:" line', () => {
      const result = parseDigestContent(SAMPLE_DIGEST);
      expect(result.stories_failed).toBe(1);
    });

    it('parses models from "Modele:" line', () => {
      const result = parseDigestContent(SAMPLE_DIGEST);
      expect(Array.isArray(result.models_used)).toBe(true);
      expect(result.models_used!.some(m => m.includes('sonnet'))).toBe(true);
    });

    it('returns empty arrays/zeros for empty content', () => {
      const result = parseDigestContent('');
      expect(result.stories_done).toBe(0);
      expect(result.stories_failed).toBe(0);
      expect(result.models_used).toEqual([]);
    });
  });

  // ─── parseResearchContent ────────────────────────────────────────────────
  describe('parseResearchContent', () => {
    it('extracts title from first heading', () => {
      const result = parseResearchContent(SAMPLE_SOLUTION, 'temporal-worker-macos');
      expect(result.title).toContain('Temporal Worker');
    });

    it('extracts problem from ## Problem section', () => {
      const result = parseResearchContent(SAMPLE_SOLUTION, 'temporal-worker-macos');
      expect(result.problem).toContain('daemon');
    });

    it('extracts solution from ## Research Findings section', () => {
      const result = parseResearchContent(SAMPLE_SOLUTION, 'temporal-worker-macos');
      expect(result.solution).toContain('LaunchAgent');
    });

    it('sets status to applied when solution found', () => {
      const result = parseResearchContent(SAMPLE_SOLUTION, 'test-slug');
      expect(result.status).toBe('applied');
    });

    it('uses slug as fallback title when no heading', () => {
      const result = parseResearchContent('No heading here', 'my-slug');
      expect(result.title).toBe('my slug');
    });
  });

  // ─── syncDigests ─────────────────────────────────────────────────────────
  describe('syncDigests', () => {
    beforeEach(() => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['2026-02-26.md', '2026-02-25.md']);
      mockReadFileSync.mockReturnValue(SAMPLE_DIGEST);
    });

    it('syncs digest files to nightclaw_digests table', async () => {
      const count = await syncDigests(mockSupabase);
      expect(count).toBe(2);
      expect(mockFrom).toHaveBeenCalledWith('nightclaw_digests');
    });

    it('uses upsert with onConflict: run_date', async () => {
      await syncDigests(mockSupabase);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.any(Array),
        { onConflict: 'run_date' }
      );
    });

    it('passes records with required schema fields', async () => {
      await syncDigests(mockSupabase);
      const [records] = mockUpsert.mock.calls[0] as [DigestRecord[]];
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

    it('returns 0 when directory does not exist', async () => {
      mockExistsSync.mockReturnValue(false);
      const count = await syncDigests(mockSupabase);
      expect(count).toBe(0);
    });

    it('skips files starting with underscore', async () => {
      mockReaddirSync.mockReturnValue(['_draft.md', '2026-02-26.md']);
      const count = await syncDigests(mockSupabase);
      expect(count).toBe(1);
    });

    it('returns 0 when no files found', async () => {
      mockReaddirSync.mockReturnValue([]);
      const count = await syncDigests(mockSupabase);
      expect(count).toBe(0);
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('handles Supabase errors gracefully (returns 0 synced)', async () => {
      mockUpsert.mockResolvedValue({ data: null, error: { message: 'DB error', code: 'PGRST000' } });
      const count = await syncDigests(mockSupabase);
      expect(count).toBe(0);
    });

    it('limits summary to 500 characters', async () => {
      await syncDigests(mockSupabase);
      const [records] = mockUpsert.mock.calls[0] as [DigestRecord[]];
      for (const r of records) {
        expect(r.summary.length).toBeLessThanOrEqual(500);
      }
    });
  });

  // ─── syncResearch ────────────────────────────────────────────────────────
  describe('syncResearch', () => {
    beforeEach(() => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['temporal-worker-macos.md', 'cost-optimization.md']);
      mockReadFileSync.mockReturnValue(SAMPLE_SOLUTION);
    });

    it('syncs solution files to nightclaw_research table', async () => {
      const count = await syncResearch(mockSupabase);
      expect(count).toBe(2);
      expect(mockFrom).toHaveBeenCalledWith('nightclaw_research');
    });

    it('uses upsert with onConflict: slug', async () => {
      await syncResearch(mockSupabase);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.any(Array),
        { onConflict: 'slug' }
      );
    });

    it('passes records with required schema fields', async () => {
      await syncResearch(mockSupabase);
      const [records] = mockUpsert.mock.calls[0] as [ResearchRecord[]];
      const record = records[0];
      expect(record).toHaveProperty('slug');
      expect(record).toHaveProperty('title');
      expect(record).toHaveProperty('problem');
      expect(record).toHaveProperty('status');
      expect(record).toHaveProperty('source_url');
      expect(['pending', 'applied', 'skipped']).toContain(record.status);
    });

    it('returns 0 when directory does not exist', async () => {
      mockExistsSync.mockReturnValue(false);
      const count = await syncResearch(mockSupabase);
      expect(count).toBe(0);
    });

    it('skips files starting with underscore', async () => {
      mockReaddirSync.mockReturnValue(['_pending-apply.md', 'temporal-worker-macos.md']);
      const count = await syncResearch(mockSupabase);
      expect(count).toBe(1);
    });
  });

  // ─── syncSkillsDiff ──────────────────────────────────────────────────────
  describe('syncSkillsDiff', () => {
    beforeEach(() => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && (p.includes('.openclaw/skills') || p.endsWith('.git'))) {
          return true;
        }
        return false;
      });
      mockExecSync.mockImplementation((cmd: string) => {
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

    it('syncs skill diffs to nightclaw_skills_diff table', async () => {
      await syncSkillsDiff(mockSupabase);
      expect(mockFrom).toHaveBeenCalledWith('nightclaw_skills_diff');
    });

    it('uses upsert with onConflict: run_date,skill_name', async () => {
      await syncSkillsDiff(mockSupabase);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.any(Array),
        { onConflict: 'run_date,skill_name' }
      );
    });

    it('passes records with required schema fields', async () => {
      await syncSkillsDiff(mockSupabase);
      const [records] = mockUpsert.mock.calls[0] as [SkillsDiffRecord[]];
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

    it('returns 0 when skills directory does not exist', async () => {
      mockExistsSync.mockReturnValue(false);
      const count = await syncSkillsDiff(mockSupabase);
      expect(count).toBe(0);
    });

    it('handles git errors gracefully (returns 0)', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('git: command not found');
      });
      const count = await syncSkillsDiff(mockSupabase);
      expect(count).toBe(0);
    });

    it('returns 0 when no skill changes found', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('git diff --name-only')) return '';
        if (cmd.includes('git ls-files')) return '';
        return '';
      });
      const count = await syncSkillsDiff(mockSupabase);
      expect(count).toBe(0);
    });
  });

  // ─── Upsert idempotency ──────────────────────────────────────────────────
  describe('Upsert idempotency', () => {
    it('calls upsert (not insert) ensuring safe re-runs', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['2026-02-26.md']);
      mockReadFileSync.mockReturnValue(SAMPLE_DIGEST);

      await syncDigests(mockSupabase);
      await syncDigests(mockSupabase);

      // All calls must be via upsert, never raw insert
      expect(mockUpsert).toHaveBeenCalledTimes(2);
      // Conflict key must be consistent
      for (const call of mockUpsert.mock.calls) {
        expect(call[1]).toEqual({ onConflict: 'run_date' });
      }
    });
  });
});

// ─── Type helpers (for TypeScript in tests) ──────────────────────────────────
interface DigestRecord {
  run_date: string;
  content_md: string;
  summary: string;
  stories_done: number;
  stories_failed: number;
  models_used: string[];
}

interface ResearchRecord {
  slug: string;
  title: string;
  problem: string;
  solution: string | null;
  source_url: string | null;
  status: 'pending' | 'applied' | 'skipped';
}

interface SkillsDiffRecord {
  run_date: string;
  skill_name: string;
  skill_path: string;
  diff_content: string;
  lines_added: number;
  lines_removed: number;
  modified_at: string;
}
