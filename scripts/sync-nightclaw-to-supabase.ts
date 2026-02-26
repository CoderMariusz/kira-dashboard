#!/usr/bin/env ts-node
/**
 * scripts/sync-nightclaw-to-supabase.ts
 * STORY-12.5 — Sync NightClaw data to Supabase
 *
 * Syncs:
 * - Digests: .kira/nightclaw/digest/YYYY-MM-DD.md → nightclaw_digests
 * - Research: .kira/nightclaw/solutions/*.md → nightclaw_research
 * - Skills diff: git changes in ~/.openclaw/skills/ → nightclaw_skills_diff
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, basename } from 'path';
import { execSync } from 'child_process';

// ─── Configuration ───────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const KIRA_DIR = resolve('/Users/mariuszkrawczyk/codermariusz/kira');
const DIGEST_DIR = resolve(KIRA_DIR, '.kira/nightclaw/digest');
const SOLUTIONS_DIR = resolve(KIRA_DIR, '.kira/nightclaw/solutions');
const SKILLS_DIR = resolve('/Users/mariuszkrawczyk/.openclaw/skills');

// ─── Types ───────────────────────────────────────────────────────────────────
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

// ─── Supabase Client ─────────────────────────────────────────────────────────
function createSupabaseClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

// ─── Digest Sync ─────────────────────────────────────────────────────────────
function parseDigestContent(content: string): Partial<DigestRecord> {
  const lines = content.split('\n');
  
  // Extract summary from first 3 non-empty lines after header
  const contentLines = lines.filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('>') && !l.startsWith('---'));
  const summary = contentLines.slice(0, 3).join(' ').slice(0, 500);
  
  // Parse stories done/failed from summary line
  let stories_done = 0;
  let stories_failed = 0;
  
  const doneMatch = content.match(/Stories zakończone:\s*[^\d]*(\d+)/i) || 
                    content.match(/(\d+)\s+stor(y|ies)\s+DONE/i) ||
                    content.match(/zakończone.*?(\d+)\s*\/\s*\d+/i);
  if (doneMatch && doneMatch[1]) {
    stories_done = parseInt(doneMatch[1], 10);
  }
  
  const failMatch = content.match(/Błędy agentów:\s*(\d+)/i) || 
                    content.match(/(\d+)\s+fail/i) ||
                    content.match(/FAIL.*?\((\d+)\s*\/\s*\d+\)/i);
  if (failMatch && failMatch[1]) {
    stories_failed = parseInt(failMatch[1], 10);
  }
  
  // Also try to find patterns like "X/Y" in stories lines
  const storiesMatch = content.match(/ stories?.*?\((\d+)\s*\/\s*(\d+)\)/i);
  if (storiesMatch && storiesMatch[1] && storiesMatch[2]) {
    stories_done = parseInt(storiesMatch[1], 10);
    stories_failed = parseInt(storiesMatch[2], 10) - stories_done;
  }
  
  // Parse models used
  const models_used: string[] = [];
  const modelMatches = content.matchAll(/(sonnet|claude-sonnet|kimi|glm|codex|opus)[- ]*(k2\.5|4\.6|5|4)?[- ]*(\d+\.?\d*)?/gi);
  const seen = new Set<string>();
  for (const match of modelMatches) {
    if (match[0]) {
      const modelName = match[0].toLowerCase().replace(/\s+/g, '-');
      if (!seen.has(modelName)) {
        seen.add(modelName);
        models_used.push(modelName);
      }
    }
  }
  
  // Look for explicit "Modele:" line
  const modelLine = content.match(/Modele:\s*(.+)/i);
  if (modelLine && modelLine[1]) {
    const modelList = modelLine[1].split(/[,;]/).map(m => m.trim().toLowerCase().replace(/\s+/g, '-'));
    for (const m of modelList) {
      if (m && !models_used.includes(m)) {
        models_used.push(m);
      }
    }
  }
  
  return {
    summary,
    stories_done,
    stories_failed,
    models_used: models_used.length > 0 ? models_used : []
  };
}

export async function syncDigests(supabase: SupabaseClient): Promise<number> {
  if (!existsSync(DIGEST_DIR)) {
    console.log('[digest] Directory not found:', DIGEST_DIR);
    return 0;
  }

  const files = readdirSync(DIGEST_DIR).filter(f => f.endsWith('.md') && !f.startsWith('_'));
  let synced = 0;

  for (const file of files) {
    const runDate = basename(file, '.md');
    const filePath = resolve(DIGEST_DIR, file);
    const content = readFileSync(filePath, 'utf-8');
    
    const parsed = parseDigestContent(content);
    
    const record: DigestRecord = {
      run_date: runDate,
      content_md: content,
      summary: parsed.summary || '',
      stories_done: parsed.stories_done || 0,
      stories_failed: parsed.stories_failed || 0,
      models_used: parsed.models_used || []
    };

    const { error } = await supabase
      .from('nightclaw_digests')
      .upsert([record], { onConflict: 'run_date' });

    if (error) {
      console.error(`[digest] Failed to sync ${runDate}:`, error.message);
    } else {
      console.log(`[digest] Synced ${runDate}`);
      synced++;
    }
  }

  return synced;
}

// ─── Research Sync ───────────────────────────────────────────────────────────
function parseResearchContent(content: string, slug: string): Partial<ResearchRecord> {
  const lines = content.split('\n');
  
  // Extract title from first heading or first line
  let title = slug.replace(/-/g, ' ');
  const firstHeading = content.match(/^#\s*(.+)/m);
  if (firstHeading && firstHeading[1]) {
    title = firstHeading[1].trim();
  } else if (lines[0]?.trim()) {
    title = lines[0].trim().replace(/^#+\s*/, '');
  }
  
  // Extract problem - look for "Problem" section or first paragraph
  let problem = content.slice(0, 1000);
  const problemMatch = content.match(/##?\s*Problem\s*\n+([\s\S]+?)(?=\n##?\s|$)/i);
  if (problemMatch && problemMatch[1]) {
    problem = problemMatch[1].trim().slice(0, 1000);
  }
  
  // Extract solution - look for "Solution" section
  let solution: string | null = null;
  const solutionMatch = content.match(/##?\s*Solution\s*\n+([\s\S]+?)(?=\n##?\s|$)/i);
  if (solutionMatch && solutionMatch[1]) {
    solution = solutionMatch[1].trim().slice(0, 5000);
  }
  
  // Determine status based on content
  let status: ResearchRecord['status'] = 'pending';
  if (content.includes('[x] Applied') || content.includes('Status: applied') || solution) {
    status = 'applied';
  } else if (content.includes('[x] Skipped') || content.includes('Status: skipped')) {
    status = 'skipped';
  }
  
  return { title, problem, solution, status };
}

export async function syncResearch(supabase: SupabaseClient): Promise<number> {
  if (!existsSync(SOLUTIONS_DIR)) {
    console.log('[research] Directory not found:', SOLUTIONS_DIR);
    return 0;
  }

  const files = readdirSync(SOLUTIONS_DIR).filter(f => 
    f.endsWith('.md') && !f.startsWith('_')
  );
  let synced = 0;

  for (const file of files) {
    const slug = basename(file, '.md');
    const filePath = resolve(SOLUTIONS_DIR, file);
    const content = readFileSync(filePath, 'utf-8');
    
    const parsed = parseResearchContent(content, slug);
    
    const record: ResearchRecord = {
      slug,
      title: parsed.title || slug,
      problem: parsed.problem || content.slice(0, 1000),
      solution: parsed.solution || null,
      source_url: null,
      status: parsed.status || 'pending'
    };

    const { error } = await supabase
      .from('nightclaw_research')
      .upsert([record], { onConflict: 'slug' });

    if (error) {
      console.error(`[research] Failed to sync ${slug}:`, error.message);
    } else {
      console.log(`[research] Synced ${slug}`);
      synced++;
    }
  }

  return synced;
}

// ─── Skills Diff Sync ────────────────────────────────────────────────────────
function getChangedSkills(): Array<{ path: string; name: string; modified_at: string }> {
  try {
    // Check if this is a git repo
    const isGitRepo = existsSync(resolve(SKILLS_DIR, '.git'));
    if (!isGitRepo) {
      console.log('[skills-diff] Not a git repository');
      return [];
    }

    // Get files changed in last commit or last 24h
    let output: string;
    try {
      // Try to get files from HEAD~1 to HEAD
      output = execSync(
        'git diff --name-only HEAD~1 HEAD -- "*/SKILL.md"',
        { cwd: SKILLS_DIR, encoding: 'utf-8', timeout: 10000 }
      );
    } catch {
      // If HEAD~1 fails (only 1 commit), get all tracked SKILL.md files
      output = execSync(
        'git ls-files "*/SKILL.md"',
        { cwd: SKILLS_DIR, encoding: 'utf-8', timeout: 10000 }
      );
    }

    const changed = output.split('\n').filter(l => l.trim() && l.includes('/SKILL.md'));
    
    return changed.map(path => {
      const parts = path.split('/');
      const name = parts[0] || 'unknown';
      
      // Get modified time from git
      let modified_at = new Date().toISOString();
      try {
        const dateStr = execSync(
          `git log -1 --format=%cI -- "${path}"`,
          { cwd: SKILLS_DIR, encoding: 'utf-8', timeout: 5000 }
        ).trim();
        if (dateStr) modified_at = dateStr;
      } catch {
        // Use current time as fallback
      }
      
      return { path, name, modified_at };
    });
  } catch (error) {
    console.error('[skills-diff] Git error:', (error as Error).message);
    return [];
  }
}

function getSkillDiff(path: string): { diff: string; added: number; removed: number } {
  try {
    let output: string;
    try {
      output = execSync(
        `git diff HEAD~1 HEAD -- "${path}"`,
        { cwd: SKILLS_DIR, encoding: 'utf-8', timeout: 10000 }
      );
    } catch {
      // If HEAD~1 fails, get entire file as diff
      output = execSync(
        `git show HEAD:"${path}"`,
        { cwd: SKILLS_DIR, encoding: 'utf-8', timeout: 10000 }
      );
      output = output.split('\n').map(l => '+' + l).join('\n');
    }

    // Count lines
    const added = output.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++')).length;
    const removed = output.split('\n').filter(l => l.startsWith('-') && !l.startsWith('---')).length;

    return { diff: output.slice(0, 5000), added, removed };
  } catch (error) {
    console.error(`[skills-diff] Failed to get diff for ${path}:`, (error as Error).message);
    return { diff: '', added: 0, removed: 0 };
  }
}

export async function syncSkillsDiff(supabase: SupabaseClient): Promise<number> {
  if (!existsSync(SKILLS_DIR)) {
    console.log('[skills-diff] Directory not found:', SKILLS_DIR);
    return 0;
  }

  const changed = getChangedSkills();
  if (changed.length === 0) {
    console.log('[skills-diff] No skill changes found');
    return 0;
  }

  const today = new Date().toISOString().split('T')[0];
  if (!today) {
    console.log('[skills-diff] Could not get today\'s date');
    return 0;
  }

  let synced = 0;

  for (const skill of changed) {
    const { diff, added, removed } = getSkillDiff(skill.path);
    
    if (!diff) continue;

    const record: SkillsDiffRecord = {
      run_date: today,
      skill_name: skill.name,
      skill_path: skill.path,
      diff_content: diff,
      lines_added: added,
      lines_removed: removed,
      modified_at: skill.modified_at
    };

    const { error } = await supabase
      .from('nightclaw_skills_diff')
      .upsert([record], { onConflict: 'run_date,skill_name' });

    if (error) {
      console.error(`[skills-diff] Failed to sync ${skill.name}:`, error.message);
    } else {
      console.log(`[skills-diff] Synced ${skill.name} (+${added}/-${removed})`);
      synced++;
    }
  }

  return synced;
}

// ─── Main ────────────────────────────────────────────────────────────────────
export async function main(): Promise<void> {
  console.log('🌙 NightClaw → Supabase Sync\n');
  
  try {
    const supabase = createSupabaseClient();
    
    // Sync all data types
    const digestCount = await syncDigests(supabase);
    const researchCount = await syncResearch(supabase);
    const skillsCount = await syncSkillsDiff(supabase);
    
    console.log('\n✅ Sync complete:');
    console.log(`   Digests: ${digestCount}`);
    console.log(`   Research: ${researchCount}`);
    console.log(`   Skills diff: ${skillsCount}`);
    
  } catch (error) {
    console.error('\n❌ Sync failed:', (error as Error).message);
    process.exit(1);
  }
}

// Run if executed directly
const isMainModule = process.argv[1]?.includes('sync-nightclaw-to-supabase');
if (isMainModule) {
  main();
}
