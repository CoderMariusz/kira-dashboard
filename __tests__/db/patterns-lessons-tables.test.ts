/**
 * __tests__/db/patterns-lessons-tables.test.ts
 * STORY-12.3 — Test validation for kira_patterns and kira_lessons tables migration
 *
 * Validates that the migration file exists, contains expected SQL structure,
 * and that tables are properly configured with RLS.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Test migration file structure
describe('STORY-12.3: kira_patterns and kira_lessons migration file', () => {
  const migrationPath = resolve(
    __dirname,
    '../../supabase/migrations/20260226100000_kira_patterns_lessons.sql'
  );

  it('migration file exists', () => {
    const file = readFileSync(migrationPath, 'utf-8');
    expect(file).toBeTruthy();
  });

  it('contains kira_patterns table definition', () => {
    const file = readFileSync(migrationPath, 'utf-8');
    expect(file).toContain('CREATE TABLE IF NOT EXISTS kira_patterns');
    expect(file).toContain('id');
    expect(file).toContain('project_id');
    expect(file).toContain('source');
    expect(file).toContain('type');
    expect(file).toContain('category');
    expect(file).toContain('date');
    expect(file).toContain('model');
    expect(file).toContain('domain');
    expect(file).toContain('text');
    expect(file).toContain('tags');
    expect(file).toContain('related_stories');
    expect(file).toContain('occurrences');
    expect(file).toContain('created_at');
    expect(file).toContain('updated_at');
  });

  it('contains kira_lessons table definition', () => {
    const file = readFileSync(migrationPath, 'utf-8');
    expect(file).toContain('CREATE TABLE IF NOT EXISTS kira_lessons');
    expect(file).toContain('id');
    expect(file).toContain('project_id');
    expect(file).toContain('source');
    expect(file).toContain('title');
    expect(file).toContain('date');
    expect(file).toContain('severity');
    expect(file).toContain('description');
    expect(file).toContain('root_cause');
    expect(file).toContain('fix');
    expect(file).toContain('story_id');
    expect(file).toContain('tags');
    expect(file).toContain('created_at');
    expect(file).toContain('updated_at');
  });

  it('kira_patterns has TEXT PRIMARY KEY for id (not UUID)', () => {
    const file = readFileSync(migrationPath, 'utf-8');
    // Check that id is TEXT, not UUID with gen_random_uuid()
    const patternsMatch = file.match(/CREATE TABLE IF NOT EXISTS kira_patterns\s*\(([^)]+)/s);
    expect(patternsMatch).toBeTruthy();
    const patternsBody = patternsMatch![1];
    expect(patternsBody).toContain('id');
    expect(patternsBody).toContain('TEXT PRIMARY KEY');
    expect(patternsBody).not.toContain('UUID PRIMARY KEY DEFAULT gen_random_uuid()');
  });

  it('kira_lessons has TEXT PRIMARY KEY for id (not UUID)', () => {
    const file = readFileSync(migrationPath, 'utf-8');
    const lessonsMatch = file.match(/CREATE TABLE IF NOT EXISTS kira_lessons\s*\(([^)]+)/s);
    expect(lessonsMatch).toBeTruthy();
    const lessonsBody = lessonsMatch![1];
    expect(lessonsBody).toContain('id');
    expect(lessonsBody).toContain('TEXT PRIMARY KEY');
    expect(lessonsBody).not.toContain('UUID PRIMARY KEY DEFAULT gen_random_uuid()');
  });

  it('contains indexes for performance', () => {
    const file = readFileSync(migrationPath, 'utf-8');
    expect(file).toContain('idx_kira_patterns_project');
    expect(file).toContain('idx_kira_patterns_type');
    expect(file).toContain('idx_kira_patterns_tags');
    expect(file).toContain('idx_kira_lessons_project');
    expect(file).toContain('idx_kira_lessons_severity');
  });

  it('contains GIN index on tags for patterns', () => {
    const file = readFileSync(migrationPath, 'utf-8');
    expect(file).toContain('USING GIN(tags)');
  });

  it('enables RLS on both tables', () => {
    const file = readFileSync(migrationPath, 'utf-8');
    expect(file).toContain('ALTER TABLE kira_patterns ENABLE ROW LEVEL SECURITY');
    expect(file).toContain('ALTER TABLE kira_lessons ENABLE ROW LEVEL SECURITY');
  });

  it('contains SELECT policies for authenticated users', () => {
    const file = readFileSync(migrationPath, 'utf-8');
    expect(file).toContain('auth_read_patterns');
    expect(file).toContain('auth_read_lessons');
    expect(file).toContain('FOR SELECT TO authenticated');
  });

  it('contains ADMIN write policies for patterns', () => {
    const file = readFileSync(migrationPath, 'utf-8');
    expect(file).toContain('admin_write_patterns');
    expect(file).toContain('EXISTS (SELECT 1 FROM user_roles');
    expect(file).toContain("role = 'ADMIN'");
  });

  it('contains ADMIN write policies for lessons', () => {
    const file = readFileSync(migrationPath, 'utf-8');
    expect(file).toContain('admin_write_lessons');
    expect(file).toContain('EXISTS (SELECT 1 FROM user_roles');
    expect(file).toContain("role = 'ADMIN'");
  });

  it('uses CREATE TABLE IF NOT EXISTS for safe migration', () => {
    const file = readFileSync(migrationPath, 'utf-8');
    expect(file).toContain('CREATE TABLE IF NOT EXISTS');
  });

  it('has default project_id as kira-dashboard', () => {
    const file = readFileSync(migrationPath, 'utf-8');
    expect(file).toContain("DEFAULT 'kira-dashboard'");
  });

  it('has severity with default LOW for lessons', () => {
    const file = readFileSync(migrationPath, 'utf-8');
    expect(file).toContain("severity");
    expect(file).toContain("DEFAULT 'LOW'");
  });
});

// Test actual database schema (if service role key is available)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cavihzxpsltcwlueohsc.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

const describeDb = serviceKey ? describe : describe.skip;

describeDb('STORY-12.3: kira_patterns and kira_lessons database schema', () => {
  const supabase = createClient(supabaseUrl, serviceKey!, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  it('kira_patterns table exists and is queryable', async () => {
    const { data, error } = await supabase
      .from('kira_patterns')
      .select('*')
      .limit(1);
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('kira_lessons table exists and is queryable', async () => {
    const { data, error } = await supabase
      .from('kira_lessons')
      .select('*')
      .limit(1);
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('kira_patterns has correct columns', async () => {
    const { data, error } = await supabase.rpc('get_table_columns', {
      table_name: 'kira_patterns'
    });
    // If RPC doesn't exist, skip this test
    if (error?.code === 'PGRST202' || (error?.message?.includes('function') && error?.message?.includes('does not exist'))) {
      console.log('Skipping column check - get_table_columns RPC not available');
      return;
    }
    expect(error).toBeNull();
    const columns = data?.map((c: any) => c.column_name) || [];
    expect(columns).toContain('id');
    expect(columns).toContain('project_id');
    expect(columns).toContain('source');
    expect(columns).toContain('type');
    expect(columns).toContain('category');
    expect(columns).toContain('date');
    expect(columns).toContain('model');
    expect(columns).toContain('domain');
    expect(columns).toContain('text');
    expect(columns).toContain('tags');
    expect(columns).toContain('related_stories');
    expect(columns).toContain('occurrences');
    expect(columns).toContain('created_at');
    expect(columns).toContain('updated_at');
  });

  it('kira_lessons has correct columns', async () => {
    const { data, error } = await supabase.rpc('get_table_columns', {
      table_name: 'kira_lessons'
    });
    if (error?.code === 'PGRST202' || (error?.message?.includes('function') && error?.message?.includes('does not exist'))) {
      console.log('Skipping column check - get_table_columns RPC not available');
      return;
    }
    expect(error).toBeNull();
    const columns = data?.map((c: any) => c.column_name) || [];
    expect(columns).toContain('id');
    expect(columns).toContain('project_id');
    expect(columns).toContain('source');
    expect(columns).toContain('title');
    expect(columns).toContain('date');
    expect(columns).toContain('severity');
    expect(columns).toContain('description');
    expect(columns).toContain('root_cause');
    expect(columns).toContain('fix');
    expect(columns).toContain('story_id');
    expect(columns).toContain('tags');
    expect(columns).toContain('created_at');
    expect(columns).toContain('updated_at');
  });

  it('RLS prevents inserts from anonymous users on patterns', async () => {
    const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { error } = await anonClient
      .from('kira_patterns')
      .insert({
        id: 'test-pattern',
        source: 'test',
        type: 'PATTERN',
        category: 'test',
        text: 'test'
      });

    expect(error).toBeTruthy();
    expect(error?.code).toBe('42501'); // insufficient_privilege
  });

  it('RLS prevents inserts from anonymous users on lessons', async () => {
    const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { error } = await anonClient
      .from('kira_lessons')
      .insert({
        id: 'test-lesson',
        title: 'test',
        description: 'test'
      });

    expect(error).toBeTruthy();
    expect(error?.code).toBe('42501'); // insufficient_privilege
  });
});
