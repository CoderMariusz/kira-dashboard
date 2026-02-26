#!/usr/bin/env ts-node
/**
 * Sync patterns and lessons from markdown files to Supabase
 * STORY-12.6 — Sync patterns + lessons → Supabase
 *
 * Usage: npx ts-node scripts/sync-patterns-to-supabase.ts
 *        npm run sync:patterns
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// ─── Configuration ────────────────────────────────────────────────────────────

const KIRA_DIR = '/Users/mariuszkrawczyk/codermariusz/kira/.kira';
const PROJECT_ID = 'kira-dashboard';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// ─── Types ────────────────────────────────────────────────────────────────────

interface PatternRecord {
  id: string;
  project_id: string;
  source: string;
  type: 'PATTERN' | 'ANTI_PATTERN';
  category: string;
  date: string | null;
  model: string | null;
  domain: string | null;
  text: string;
  tags: string[];
  related_stories: string[];
  occurrences: number;
}

interface LessonRecord {
  id: string;
  project_id: string;
  source: string;
  title: string;
  date: string | null;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  root_cause: string | null;
  fix: string | null;
  story_id: string | null;
  tags: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function parseDate(dateStr: string): string | null {
  const match = dateStr.match(/(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

export function extractTags(text: string): string[] {
  const tags: string[] = [];
  for (const match of text.matchAll(/#([a-zA-Z0-9_-]+)/g)) {
    if (match[1]) tags.push(match[1].toLowerCase());
  }
  return [...new Set(tags)];
}

export function extractStoryIds(text: string): string[] {
  const stories: string[] = [];
  for (const match of text.matchAll(/STORY-\d+\.\d+/g)) {
    if (match[0]) stories.push(match[0]);
  }
  return [...new Set(stories)];
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Pattern Parser ───────────────────────────────────────────────────────────

/**
 * Parse patterns.md or anti-patterns.md into PatternRecord[].
 *
 * Handles entry formats:
 *   1. - [DATE] [MODEL] [DOMAIN] — description
 *   2. - [DATE] description (no model/domain)
 *   3. - description (no date)
 */
export function parsePatternsFile(
  filepath: string,
  type: 'PATTERN' | 'ANTI_PATTERN'
): PatternRecord[] {
  if (!fs.existsSync(filepath)) {
    console.log(`⚠️  File not found: ${filepath}`);
    return [];
  }

  const content = fs.readFileSync(filepath, 'utf-8');
  const source = path.basename(filepath);
  const records: PatternRecord[] = [];

  let currentCategory = 'General';
  let idCounter = 0;

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    // Category header: ## Category Name
    const categoryMatch = line.match(/^##\s+(.+)$/);
    if (categoryMatch?.[1]) {
      currentCategory = categoryMatch[1].trim();
      idCounter = 0; // reset per category for stable IDs
      continue;
    }

    // Skip non-list lines
    if (!line.startsWith('- ')) continue;

    const body = line.slice(2).trim();

    let date: string | null = null;
    let model: string | null = null;
    let domain: string | null = null;
    let text = body;

    // Format 1: [DATE] [MODEL] [DOMAIN] — description
    const fullMatch = body.match(
      /^\[([^\]]+)\]\s+\[([^\]]+)\]\s+\[([^\]]+)\]\s+[—-]\s+(.+)$/
    );
    if (fullMatch) {
      date = parseDate(fullMatch[1] ?? '');
      model = (fullMatch[2] ?? '').trim() || null;
      domain = (fullMatch[3] ?? '').trim() || null;
      text = (fullMatch[4] ?? '').trim();
    } else {
      // Format 2: [DATE] description
      const dateOnlyMatch = body.match(/^\[(\d{4}-\d{2}-\d{2})\]\s+(.+)$/);
      if (dateOnlyMatch) {
        date = dateOnlyMatch[1] ?? null;
        text = (dateOnlyMatch[2] ?? '').trim();
      }
      // Format 3: plain description — text stays as is
    }

    if (!text) continue;

    idCounter++;
    const catSlug = slugify(currentCategory);
    const id = `${type === 'PATTERN' ? 'pat' : 'anti'}-${catSlug}-${idCounter}`;

    records.push({
      id,
      project_id: PROJECT_ID,
      source,
      type,
      category: currentCategory,
      date,
      model,
      domain,
      text,
      tags: extractTags(text),
      related_stories: extractStoryIds(text),
      occurrences: 1,
    });
  }

  return records;
}

// ─── Lesson Parser ────────────────────────────────────────────────────────────

/**
 * Parse LESSONS_LEARNED.md into LessonRecord[].
 *
 * Each lesson section starts with:
 *   ### ID: Title   (e.g. BUG-001, ANTI-001, RULE-001, ARCH-001)
 *
 * Supports field variants:
 *   **What went wrong:** / **Root cause:** / **Fix:** / **Date:** / **Severity:** / **Story:**
 */
export function parseLessonsFile(filepath: string): LessonRecord[] {
  if (!fs.existsSync(filepath)) {
    console.log(`⚠️  File not found: ${filepath}`);
    return [];
  }

  const content = fs.readFileSync(filepath, 'utf-8');
  const records: LessonRecord[] = [];

  // Split on ### to get individual lesson sections
  const sections = content.split(/\n(?=### )/);

  for (const section of sections) {
    if (!section) continue;

    const headerMatch = section.match(/^### ([A-Z]+-\d+):\s*(.+?)(?:\n|$)/);
    if (!headerMatch?.[1] || !headerMatch[2]) continue;

    const id = headerMatch[1].trim();
    const title = headerMatch[2].trim();

    // Remove header line for field extraction
    const body = section.slice(headerMatch[0].length);

    const dateMatch = body.match(/\*\*Date:\*\*\s*(\d{4}-\d{2}-\d{2})/);
    const severityMatch = body.match(/\*\*Severity:\*\*\s*(CRITICAL|HIGH|MEDIUM|LOW)/i);
    const storyMatch = body.match(/\*\*Story:\*\*\s*(STORY-[\d.]+)/);

    // Root cause: **Root cause:** or **What went wrong:**
    const rootCauseMatch = body.match(
      /\*\*(?:Root cause|What went wrong):\*\*\s*([\s\S]+?)(?=\n\*\*[A-Z]|\n---|\n###|$)/i
    );

    // Fix: **Fix:** or **The fix:** or **The rule:**
    const fixMatch = body.match(
      /\*\*(?:Fix|The fix|The rule):\*\*\s*([\s\S]+?)(?=\n\*\*[A-Z]|\n---|\n###|$)/i
    );

    // Description: non-field prose lines
    const descLines: string[] = [];
    for (const line of body.split('\n')) {
      const stripped = line.trim();
      if (!stripped) continue;
      if (/^\*\*[^*]+:\*\*/.test(stripped)) continue; // skip field lines
      if (/^---$/.test(stripped)) continue;
      descLines.push(stripped);
    }
    const description =
      descLines.join(' ').replace(/\s+/g, ' ').trim() || title;

    records.push({
      id,
      project_id: PROJECT_ID,
      source: 'LESSONS_LEARNED.md',
      title,
      date: dateMatch?.[1] ?? null,
      severity: ((severityMatch?.[1] ?? 'LOW').toUpperCase() as LessonRecord['severity']),
      description: description.slice(0, 2000),
      root_cause: rootCauseMatch?.[1]?.replace(/\s+/g, ' ').trim().slice(0, 1000) ?? null,
      fix: fixMatch?.[1]?.replace(/\s+/g, ' ').trim().slice(0, 1000) ?? null,
      story_id: storyMatch?.[1] ?? null,
      tags: extractTags(body),
    });
  }

  return records;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔄 Syncing patterns and lessons to Supabase...\n');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing env vars:');
    if (!SUPABASE_URL) console.error('   NEXT_PUBLIC_SUPABASE_URL');
    if (!SUPABASE_SERVICE_KEY) console.error('   SUPABASE_SERVICE_KEY / SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ─── Patterns ──────────────────────────────────────────────────────────────

  const patterns: PatternRecord[] = [
    ...parsePatternsFile(path.join(KIRA_DIR, 'nightclaw', 'patterns.md'), 'PATTERN'),
    ...parsePatternsFile(path.join(KIRA_DIR, 'nightclaw', 'anti-patterns.md'), 'ANTI_PATTERN'),
  ];

  if (patterns.length > 0) {
    console.log(`📊 Parsed ${patterns.length} patterns`);
    const { error } = await supabase
      .from('kira_patterns')
      .upsert(patterns, { onConflict: 'id' });
    if (error) {
      console.error('❌ Failed to sync patterns:', error.message);
      process.exit(1);
    }
    console.log(`✅ Synced ${patterns.length} patterns → kira_patterns`);
  } else {
    console.log('ℹ️  No patterns to sync');
  }

  // ─── Lessons ───────────────────────────────────────────────────────────────

  const allLessons = parseLessonsFile(path.join(KIRA_DIR, 'LESSONS_LEARNED.md'));

  // Deduplicate by ID (last occurrence wins — handles duplicate IDs in source)
  const lessonsMap = new Map<string, LessonRecord>();
  for (const l of allLessons) lessonsMap.set(l.id, l);
  const lessons = [...lessonsMap.values()];

  if (lessons.length > 0) {
    const dupes = allLessons.length - lessons.length;
    console.log(
      `📊 Parsed ${allLessons.length} lessons${dupes > 0 ? ` (${dupes} duplicates merged)` : ''}`
    );
    const { error } = await supabase
      .from('kira_lessons')
      .upsert(lessons, { onConflict: 'id' });
    if (error) {
      console.error('❌ Failed to sync lessons:', error.message);
      process.exit(1);
    }
    console.log(`✅ Synced ${lessons.length} lessons → kira_lessons`);
  } else {
    console.log('ℹ️  No lessons to sync');
  }

  console.log('\n🎉 Sync complete!');
}

// Run when executed directly
const runningDirectly = process.argv[1]?.includes('sync-patterns-to-supabase');
if (runningDirectly) {
  main().catch((err: unknown) => {
    console.error('❌ Unexpected error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
