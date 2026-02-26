#!/usr/bin/env ts-node
/**
 * scripts/sync-nightclaw-to-supabase.ts
 * STORY-12.5
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, basename } from 'path';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const KIRA_DIR = resolve('/Users/mariuszkrawczyk/codermariusz/kira');
const DIGEST_DIR = resolve(KIRA_DIR, '.kira/nightclaw/digest');
const SOLUTIONS_DIR = resolve(KIRA_DIR, '.kira/nightclaw/solutions');
const SKILLS_DIR = resolve('/Users/mariuszkrawczyk/.openclaw/skills');

function createSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function parseDigestContent(content: string) {
  const lines = content.split('\n');
  const contentLines = lines.filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('>') && !l.startsWith('---'));
  const summary = contentLines.slice(0, 3).join(' ').slice(0, 500);
  let stories_done = 0;
  const doneMatch = content.match(/(\d+)\s+stor(?:y|ies)/i) || content.match(/Stories zakończone:\s*[^\d]*(\d+)/i);
  if (doneMatch?.[1]) stories_done = parseInt(doneMatch[1], 10);
  let stories_failed = 0;
  const failMatch = content.match(/Błędy agentów:\s*(\d+)/i) || content.match(/(\d+)\s+fail/i);
  if (failMatch?.[1]) stories_failed = parseInt(failMatch[1], 10);
  const models_used: string[] = [];
  const modelLine = content.match(/Modele:\s*(.+)/i);
  if (modelLine?.[1]) {
    const parts = modelLine[1].split(/[,;()\s]+/).map(m => m.trim().toLowerCase());
    for (const m of parts) { if (m && m.length > 2 && !models_used.includes(m)) models_used.push(m); }
  }
  return { summary, stories_done, stories_failed, models_used };
}

export function parseResearchContent(content: string, slug: string) {
  let title = slug.replace(/-/g, ' ');
  const headingMatch = content.match(/^#\s+(.+)/m);
  if (headingMatch?.[1]) title = headingMatch[1].trim();
  let problem = content.slice(0, 1000);
  const problemMatch = content.match(/##\s*Problem\s*\n+([\s\S]+?)(?=\n##\s|$)/i);
  if (problemMatch?.[1]) problem = problemMatch[1].trim().slice(0, 1000);
  let solution: string | null = null;
  const solutionMatch = content.match(/##\s*(?:Solution|Research Findings)[^\n]*\n+([\s\S]+?)(?=\n##\s|$)/i);
  if (solutionMatch?.[1]) solution = solutionMatch[1].trim().slice(0, 5000);
  let status: 'pending' | 'applied' | 'skipped' = 'pending';
  if (content.includes('[x] Applied') || content.includes('Status: applied') || solution !== null) status = 'applied';
  else if (content.includes('[x] Skipped') || content.includes('Status: skipped')) status = 'skipped';
  return { title, problem, solution, status };
}

export async function syncDigests(supabase: SupabaseClient): Promise<number> {
  if (!existsSync(DIGEST_DIR)) { console.warn('[digest] Directory not found:', DIGEST_DIR); return 0; }
  let files: string[];
  try { files = readdirSync(DIGEST_DIR).filter(f => f.endsWith('.md') && !f.startsWith('_')); }
  catch (err) { console.warn('[digest] Failed to read directory:', (err as Error).message); return 0; }
  if (files.length === 0) { console.log('[digest] No digest files found — skipping'); return 0; }
  let synced = 0;
  for (const file of files) {
    const runDate = basename(file, '.md');
    let content: string;
    try { content = readFileSync(resolve(DIGEST_DIR, file), 'utf-8'); }
    catch (err) { console.warn(`[digest] Failed to read ${file}:`, (err as Error).message); continue; }
    const parsed = parseDigestContent(content);
    const { error } = await supabase.from('nightclaw_digests').upsert([{
      run_date: runDate, content_md: content,
      summary: parsed.summary || '', stories_done: parsed.stories_done || 0,
      stories_failed: parsed.stories_failed || 0, models_used: parsed.models_used || []
    }], { onConflict: 'run_date' });
    if (error) console.error(`[digest] Failed to upsert ${runDate}:`, error.message);
    else { console.log(`[digest] Synced ${runDate}`); synced++; }
  }
  return synced;
}

export async function syncResearch(supabase: SupabaseClient): Promise<number> {
  if (!existsSync(SOLUTIONS_DIR)) { console.warn('[research] Directory not found:', SOLUTIONS_DIR); return 0; }
  let files: string[];
  try { files = readdirSync(SOLUTIONS_DIR).filter(f => f.endsWith('.md') && !f.startsWith('_')); }
  catch (err) { console.warn('[research] Failed to read directory:', (err as Error).message); return 0; }
  if (files.length === 0) { console.log('[research] No solution files found — skipping'); return 0; }
  let synced = 0;
  for (const file of files) {
    const slug = basename(file, '.md');
    let content: string;
    try { content = readFileSync(resolve(SOLUTIONS_DIR, file), 'utf-8'); }
    catch (err) { console.warn(`[research] Failed to read ${file}:`, (err as Error).message); continue; }
    const parsed = parseResearchContent(content, slug);
    const { error } = await supabase.from('nightclaw_research').upsert([{
      slug, title: parsed.title || slug, problem: parsed.problem || content.slice(0, 1000),
      solution: parsed.solution || null, source_url: null, status: parsed.status || 'pending'
    }], { onConflict: 'slug' });
    if (error) console.error(`[research] Failed to upsert ${slug}:`, error.message);
    else { console.log(`[research] Synced ${slug}`); synced++; }
  }
  return synced;
}

function getChangedSkills() {
  try {
    if (!existsSync(resolve(SKILLS_DIR, '.git'))) { console.log('[skills-diff] Not a git repository — skipping'); return []; }
    let output: string;
    try { output = execSync('git diff --name-only HEAD~1 HEAD -- "*/SKILL.md"', { cwd: SKILLS_DIR, encoding: 'utf-8', timeout: 10000 }); }
    catch { output = execSync('git ls-files "*/SKILL.md"', { cwd: SKILLS_DIR, encoding: 'utf-8', timeout: 10000 }); }
    return output.split('\n').filter(l => l.trim() && l.includes('/SKILL.md')).map(path => {
      const name = path.split('/')[0] || 'unknown';
      let modified_at = new Date().toISOString();
      try { const d = execSync(`git log -1 --format=%cI -- "${path}"`, { cwd: SKILLS_DIR, encoding: 'utf-8', timeout: 5000 }).trim(); if (d) modified_at = d; } catch {}
      return { path, name, modified_at };
    });
  } catch (error) { console.error('[skills-diff] Git error:', (error as Error).message); return []; }
}

function getSkillDiff(path: string) {
  try {
    let output: string;
    try { output = execSync(`git diff HEAD~1 HEAD -- "${path}"`, { cwd: SKILLS_DIR, encoding: 'utf-8', timeout: 10000 }); }
    catch { output = execSync(`git show HEAD:"${path}"`, { cwd: SKILLS_DIR, encoding: 'utf-8', timeout: 10000 }); output = output.split('\n').map(l => '+' + l).join('\n'); }
    const added = output.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++')).length;
    const removed = output.split('\n').filter(l => l.startsWith('-') && !l.startsWith('---')).length;
    return { diff: output.slice(0, 5000), added, removed };
  } catch (error) { console.error(`[skills-diff] Failed to get diff for ${path}:`, (error as Error).message); return { diff: '', added: 0, removed: 0 }; }
}

export async function syncSkillsDiff(supabase: SupabaseClient): Promise<number> {
  if (!existsSync(SKILLS_DIR)) { console.warn('[skills-diff] Directory not found:', SKILLS_DIR); return 0; }
  const changed = getChangedSkills();
  if (changed.length === 0) { console.log('[skills-diff] No skill changes found — skipping'); return 0; }
  const today = new Date().toISOString().split('T')[0];
  if (!today) return 0;
  let synced = 0;
  for (const skill of changed) {
    const { diff, added, removed } = getSkillDiff(skill.path);
    if (!diff) continue;
    const { error } = await supabase.from('nightclaw_skills_diff').upsert([{
      run_date: today, skill_name: skill.name, skill_path: skill.path,
      diff_content: diff, lines_added: added, lines_removed: removed, modified_at: skill.modified_at
    }], { onConflict: 'run_date,skill_name' });
    if (error) console.error(`[skills-diff] Failed to upsert ${skill.name}:`, error.message);
    else { console.log(`[skills-diff] Synced ${skill.name} (+${added}/-${removed})`); synced++; }
  }
  return synced;
}

export async function main(): Promise<void> {
  console.log('🌙 NightClaw → Supabase Sync\n');
  try {
    const supabase = createSupabaseClient();
    const digestCount = await syncDigests(supabase);
    const researchCount = await syncResearch(supabase);
    const skillsCount = await syncSkillsDiff(supabase);
    const total = digestCount + researchCount + skillsCount;
    if (total === 0) console.log('\n⚠️  No data to sync');
    else { console.log('\n✅ Sync complete:'); console.log(`   Digests:     ${digestCount}`); console.log(`   Research:    ${researchCount}`); console.log(`   Skills diff: ${skillsCount}`); }
  } catch (error) {
    console.error('\n❌ Sync failed:', (error as Error).message);
    process.exit(1);
  }
}

const isMainModule = process.argv[1]?.includes('sync-nightclaw-to-supabase');
if (isMainModule) { main(); }
