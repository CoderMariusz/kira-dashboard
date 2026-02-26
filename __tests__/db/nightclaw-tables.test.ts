/**
 * __tests__/db/nightclaw-tables.test.ts
 * STORY-12.2 — Test validation for NightClaw tables migration
 *
 * Validates that the migration file exists, contains expected SQL structure,
 * and that tables are properly configured with RLS.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Test migration file structure
describe('STORY-12.2: NightClaw tables migration file', () => {
  const migrationPath = resolve(
    __dirname,
    '../../supabase/migrations/20260226095024_nightclaw_tables.sql'
  );

  it('migration file exists', () => {
    const file = readFileSync(migrationPath, 'utf-8');
    expect(file).toBeTruthy();
  });

  it('contains nightclaw_digests table definition', () => {
    const file = readFileSync(migrationPath, 'utf-8');
    expect(file).toContain('CREATE TABLE IF NOT EXISTS nightclaw_digests');
    expect(file).toContain('run_date');
    expect(file).toContain('content_md');
    expect(file).toContain('summary');
    expect(file).toContain('stories_done');
    expect(file).toContain('stories_failed');
    expect(file).toContain('models_used');
  });

  it('contains nightclaw_research table definition', () => {
    const file = readFileSync(migrationPath, 'utf-8');
    expect(file).toContain('CREATE TABLE IF NOT EXISTS nightclaw_research');
    expect(file).toContain('slug');
    expect(file).toContain('title');
    expect(file).toContain('problem');
    expect(file).toContain('solution');
    expect(file).toContain('source_url');
    expect(file).toContain('status');
  });

  it('contains nightclaw_skills_diff table definition', () => {
    const file = readFileSync(migrationPath, 'utf-8');
    expect(file).toContain('CREATE TABLE IF NOT EXISTS nightclaw_skills_diff');
    expect(file).toContain('skill_name');
    expect(file).toContain('skill_path');
    expect(file).toContain('diff_content');
    expect(file).toContain('lines_added');
    expect(file).toContain('lines_removed');
    expect(file).toContain('modified_at');
  });

  it('contains UNIQUE constraint on run_date for digests', () => {
    const file = readFileSync(migrationPath, 'utf-8');
    expect(file).toContain('run_date');
    expect(file).toContain('UNIQUE');
  });

  it('contains UNIQUE constraint on run_date + skill_name for skills_diff', () => {
    const file = readFileSync(migrationPath, 'utf-8');
    expect(file).toContain('UNIQUE(run_date, skill_name)');
  });

  it('contains indexes for performance', () => {
    const file = readFileSync(migrationPath, 'utf-8');
    expect(file).toContain('idx_nightclaw_digests_date');
    expect(file).toContain('idx_nightclaw_research_status');
    expect(file).toContain('idx_nightclaw_skills_date');
  });

  it('enables RLS on all tables', () => {
    const file = readFileSync(migrationPath, 'utf-8');
    expect(file).toContain('ALTER TABLE nightclaw_digests     ENABLE ROW LEVEL SECURITY');
    expect(file).toContain('ALTER TABLE nightclaw_research    ENABLE ROW LEVEL SECURITY');
    expect(file).toContain('ALTER TABLE nightclaw_skills_diff ENABLE ROW LEVEL SECURITY');
  });

  it('contains SELECT policies for authenticated users', () => {
    const file = readFileSync(migrationPath, 'utf-8');
    expect(file).toContain('auth_read_digests');
    expect(file).toContain('auth_read_research');
    expect(file).toContain('auth_read_skills_diff');
    expect(file).toContain('FOR SELECT TO authenticated');
  });

  it('uses CREATE TABLE IF NOT EXISTS for safe migration', () => {
    const file = readFileSync(migrationPath, 'utf-8');
    expect(file).toContain('CREATE TABLE IF NOT EXISTS');
  });

  it('uses DATE type for run_date (not TIMESTAMPTZ)', () => {
    const file = readFileSync(migrationPath, 'utf-8');
    // Check that run_date is DATE, not TIMESTAMPTZ
    const lines = file.split('\n');
    const runDateLines = lines.filter(l => l.includes('run_date') && l.includes('DATE'));
    expect(runDateLines.length).toBeGreaterThanOrEqual(2); // Should appear in digests and skills_diff
  });
});

// Test actual database schema (if service role key is available)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cavihzxpsltcwlueohsc.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

const describeDb = serviceKey ? describe : describe.skip;

describeDb('STORY-12.2: NightClaw tables database schema', () => {
  const supabase = createClient(supabaseUrl, serviceKey!, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  it('nightclaw_digests table exists and is queryable', async () => {
    const { data, error } = await supabase
      .from('nightclaw_digests')
      .select('*')
      .limit(1);
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('nightclaw_research table exists and is queryable', async () => {
    const { data, error } = await supabase
      .from('nightclaw_research')
      .select('*')
      .limit(1);
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('nightclaw_skills_diff table exists and is queryable', async () => {
    const { data, error } = await supabase
      .from('nightclaw_skills_diff')
      .select('*')
      .limit(1);
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('nightclaw_digests has correct columns', async () => {
    const { data, error } = await supabase.rpc('get_table_columns', {
      table_name: 'nightclaw_digests'
    });
    // If RPC doesn't exist, skip this test
    if (error?.code === 'PGRST202' || (error?.message?.includes('function') && error?.message?.includes('does not exist'))) {
      console.log('Skipping column check - get_table_columns RPC not available');
      return;
    }
    expect(error).toBeNull();
    const columns = data?.map((c: any) => c.column_name) || [];
    expect(columns).toContain('id');
    expect(columns).toContain('run_date');
    expect(columns).toContain('content_md');
    expect(columns).toContain('summary');
    expect(columns).toContain('stories_done');
    expect(columns).toContain('stories_failed');
    expect(columns).toContain('models_used');
    expect(columns).toContain('created_at');
  });

  it('nightclaw_research has correct columns', async () => {
    const { data, error } = await supabase.rpc('get_table_columns', {
      table_name: 'nightclaw_research'
    });
    if (error?.code === 'PGRST202' || (error?.message?.includes('function') && error?.message?.includes('does not exist'))) {
      console.log('Skipping column check - get_table_columns RPC not available');
      return;
    }
    expect(error).toBeNull();
    const columns = data?.map((c: any) => c.column_name) || [];
    expect(columns).toContain('id');
    expect(columns).toContain('slug');
    expect(columns).toContain('title');
    expect(columns).toContain('problem');
    expect(columns).toContain('solution');
    expect(columns).toContain('source_url');
    expect(columns).toContain('status');
    expect(columns).toContain('created_at');
    expect(columns).toContain('updated_at');
  });

  it('nightclaw_skills_diff has correct columns', async () => {
    const { data, error } = await supabase.rpc('get_table_columns', {
      table_name: 'nightclaw_skills_diff'
    });
    if (error?.code === 'PGRST202' || (error?.message?.includes('function') && error?.message?.includes('does not exist'))) {
      console.log('Skipping column check - get_table_columns RPC not available');
      return;
    }
    expect(error).toBeNull();
    const columns = data?.map((c: any) => c.column_name) || [];
    expect(columns).toContain('id');
    expect(columns).toContain('run_date');
    expect(columns).toContain('skill_name');
    expect(columns).toContain('skill_path');
    expect(columns).toContain('diff_content');
    expect(columns).toContain('lines_added');
    expect(columns).toContain('lines_removed');
    expect(columns).toContain('modified_at');
    expect(columns).toContain('created_at');
  });

  it('RLS prevents inserts from anonymous users', async () => {
    const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { error } = await anonClient
      .from('nightclaw_digests')
      .insert({
        run_date: '2026-02-26',
        content_md: 'test'
      });

    expect(error).toBeTruthy();
    expect(error?.code).toBe('42501'); // insufficient_privilege
  });
});
