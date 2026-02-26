/**
 * __tests__/sync/patterns-sync.test.ts
 * STORY-12.6 — Tests for patterns and lessons sync script
 */

import * as fs from 'fs';
import {
  parsePatternsFile,
  parseLessonsFile,
  deduplicateLessons,
  parseDate,
  extractTags,
  extractStoryIds,
} from '../../scripts/sync-patterns-to-supabase';

jest.mock('fs');

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('STORY-12.6: Patterns and Lessons Sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Helper tests ────────────────────────────────────────────────────────

  describe('parseDate', () => {
    it('extracts YYYY-MM-DD from various formats', () => {
      expect(parseDate('2026-02-20')).toBe('2026-02-20');
      expect(parseDate('[2026-02-20]')).toBe('2026-02-20');
      expect(parseDate('some text 2026-01-15 other')).toBe('2026-01-15');
    });

    it('returns null for invalid dates', () => {
      expect(parseDate('no date')).toBeNull();
      expect(parseDate('')).toBeNull();
    });
  });

  describe('extractTags', () => {
    it('extracts hashtags', () => {
      expect(extractTags('#test #multiple #tags')).toEqual(['test', 'multiple', 'tags']);
    });

    it('deduplicates', () => {
      expect(extractTags('#test #test #dup')).toEqual(['test', 'dup']);
    });

    it('lowercases', () => {
      expect(extractTags('#UPPER #MixedCase')).toEqual(['upper', 'mixedcase']);
    });

    it('returns empty array for no tags', () => {
      expect(extractTags('plain text')).toEqual([]);
    });
  });

  describe('extractStoryIds', () => {
    it('extracts STORY-X.Y refs', () => {
      expect(extractStoryIds('STORY-1.2 and STORY-3.4')).toEqual(['STORY-1.2', 'STORY-3.4']);
    });

    it('deduplicates', () => {
      expect(extractStoryIds('STORY-1.1 STORY-1.1')).toEqual(['STORY-1.1']);
    });

    it('returns empty for no refs', () => {
      expect(extractStoryIds('nothing')).toEqual([]);
    });
  });

  // ─── Pattern parser ─────────────────────────────────────────────────────

  describe('parsePatternsFile', () => {
    it('returns [] when file does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);
      expect(parsePatternsFile('/nonexistent.md', 'PATTERN')).toEqual([]);
    });

    it('parses [DATE] [MODEL] [DOMAIN] entries', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(
        '## Pipeline\n' +
        '- [2026-02-17] [GLM-5] [frontend] \u2014 Dark theme redesign works\n' +
        '- [2026-02-18] [Kimi] [backend] \u2014 Fast on easy stories\n' +
        '\n' +
        '## Communication\n' +
        '- [2026-02-17] [Bella] [tts] \u2014 Good Polish TTS\n'
      );

      const result = parsePatternsFile('/test/patterns.md', 'PATTERN');

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        type: 'PATTERN',
        category: 'Pipeline',
        date: '2026-02-17',
        model: 'GLM-5',
        domain: 'frontend',
        text: 'Dark theme redesign works',
      });
      expect(result[1]).toMatchObject({ category: 'Pipeline', model: 'Kimi' });
      expect(result[2]).toMatchObject({ category: 'Communication', model: 'Bella' });
    });

    it('sets type=ANTI_PATTERN correctly', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(
        '## Process\n- [2026-02-20] [Codex] [devops] \u2014 Bad pattern\n'
      );
      const result = parsePatternsFile('/test/anti.md', 'ANTI_PATTERN');
      expect(result[0]).toMatchObject({ type: 'ANTI_PATTERN' });
      expect(result[0].id).toMatch(/^anti-/);
    });

    it('generates unique IDs per category', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(
        '## Cat One\n' +
        '- [2026-02-20] [M] [D] \u2014 First\n' +
        '- [2026-02-21] [M] [D] \u2014 Second\n' +
        '\n' +
        '## Cat Two\n' +
        '- [2026-02-22] [M] [D] \u2014 Third\n'
      );
      const result = parsePatternsFile('/test/p.md', 'PATTERN');

      expect(result).toHaveLength(3);
      // IDs are now content-based hashes, not positional counters
      const ids = result.map((r) => r.id);
      expect(new Set(ids).size).toBe(ids.length); // all unique
      expect(result[0].id).toMatch(/^pat-[a-f0-9]{8}$/);
      expect(result[1].id).toMatch(/^pat-[a-f0-9]{8}$/);
      expect(result[2].id).toMatch(/^pat-[a-f0-9]{8}$/);
    });

    it('extracts related stories from text', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(
        '## P\n- [2026-02-20] [M] [D] \u2014 Related to STORY-1.2 and STORY-3.4\n'
      );
      const result = parsePatternsFile('/test/p.md', 'PATTERN');
      expect(result[0].related_stories).toEqual(['STORY-1.2', 'STORY-3.4']);
    });

    it('parses [DATE]-only entries (Format 2)', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(
        '## TestCategory\n' + '- [2026-02-20] Entry with only date, no model/domain\n'
      );
      const result = parsePatternsFile('/test/p.md', 'PATTERN');
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: 'PATTERN',
        category: 'TestCategory',
        date: '2026-02-20',
        model: null,
        domain: null,
        text: 'Entry with only date, no model/domain',
      });
    });

    it('parses plain entries with no date or metadata (Format 3)', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(
        '## General\n' + '- Just a plain text entry without any metadata\n'
      );
      const result = parsePatternsFile('/test/p.md', 'PATTERN');
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: 'PATTERN',
        category: 'General',
        date: null,
        model: null,
        domain: null,
        text: 'Just a plain text entry without any metadata',
      });
    });

    it('generates stable content-based IDs', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(
        '## Category\n' + '- [2026-02-20] [M] [D] \u2014 Test entry for ID stability\n'
      );
      const result = parsePatternsFile('/test/p.md', 'PATTERN');
      expect(result).toHaveLength(1);
      // ID should be based on content hash, not positional counter
      expect(result[0].id).toMatch(/^pat-[a-f0-9]{8}$/);
      // Same content should always produce same ID
      const result2 = parsePatternsFile('/test/p.md', 'PATTERN');
      expect(result2[0].id).toBe(result[0].id);
    });
  });

  // ─── Lesson parser ──────────────────────────────────────────────────────

  describe('parseLessonsFile', () => {
    it('returns [] when file does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);
      expect(parseLessonsFile('/nonexistent.md')).toEqual([]);
    });

    it('parses a lesson with root cause and fix', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(
        '# Lessons\n\n' +
        '### BUG-001: Full Suite Failed\n' +
        '**What went wrong:** QA ran full suite and 37 failed.\n' +
        '**Fix:** Both epic-scoped and full suite must pass.\n'
      );
      const result = parseLessonsFile('/test/l.md');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('BUG-001');
      expect(result[0].title).toBe('Full Suite Failed');
      expect(result[0].root_cause).toContain('QA ran full suite');
      expect(result[0].fix).toContain('Both epic-scoped');
    });

    it('parses multiple lessons', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(
        '### BUG-001: First\nSome text.\n\n' +
        '### ANTI-001: Second\nOther text.\n\n' +
        '### ARCH-001: Third\nMore text.\n'
      );
      const result = parseLessonsFile('/test/l.md');
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.id)).toEqual(['BUG-001', 'ANTI-001', 'ARCH-001']);
    });

    it('defaults severity to LOW', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(
        '### OPS-001: No severity\nJust text.\n'
      );
      const result = parseLessonsFile('/test/l.md');
      expect(result[0].severity).toBe('LOW');
    });

    it('handles missing root_cause and fix', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(
        '### RULE-001: Simple Rule\nDescription only.\n'
      );
      const result = parseLessonsFile('/test/l.md');
      expect(result[0].root_cause).toBeNull();
      expect(result[0].fix).toBeNull();
    });

    it('skips malformed headers', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(
        '### INVALID FORMAT\nNo id.\n\n' +
        '### BUG-002: Valid One\nValid text.\n'
      );
      const result = parseLessonsFile('/test/l.md');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('BUG-002');
    });

    it('captures description from non-field prose', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(
        '### BUG-003: Test Description\n' +
        '**Date:** 2026-02-20\n' +
        'This is plain prose description.\n' +
        'More description text.\n' +
        '**Fix:** Some fix.\n'
      );
      const result = parseLessonsFile('/test/l.md');
      expect(result[0].description).toContain('plain prose description');
      expect(result[0].description).toContain('More description text');
    });

    it('extracts story_id from Story field', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(
        '### BUG-004: Linked\n' +
        '**Story:** STORY-7.1\n' +
        'Text.\n'
      );
      const result = parseLessonsFile('/test/l.md');
      expect(result[0].story_id).toBe('STORY-7.1');
    });

    it('deduplicates lessons by ID (last occurrence wins)', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(
        '### ANTI-001: First occurrence\nDescription one.\n\n' +
        '### ANTI-002: Duplicate ID first\nFirst version.\n\n' +
        '### ANTI-003: Another lesson\nSome text.\n\n' +
        '### ANTI-002: Duplicate ID second (should win)\nSecond version with updated fix.\n' +
        '**Fix:** The actual fix.\n'
      );
      const allLessons = parseLessonsFile('/test/l.md');
      expect(allLessons).toHaveLength(4); // parser returns all including duplicates

      const deduped = deduplicateLessons(allLessons);
      expect(deduped).toHaveLength(3); // duplicates removed

      // ANTI-002 should be the last occurrence (second version)
      const anti002 = deduped.find((l) => l.id === 'ANTI-002');
      expect(anti002?.title).toBe('Duplicate ID second (should win)');
      expect(anti002?.description).toContain('Second version');
      expect(anti002?.fix).toBe('The actual fix.');
    });
  });
});
