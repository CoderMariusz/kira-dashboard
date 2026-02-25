/**
 * __tests__/migrations/user_roles_invite_meta.test.ts
 * STORY-10.1 — Test validation for user_roles invite metadata migration
 *
 * Validates that the migration file exists and contains the expected SQL structure.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('STORY-10.1: user_roles invite metadata migration', () => {
  const migrationPath = resolve(
    __dirname,
    '../../supabase/migrations/20260225225200_user_roles_invite_meta.sql'
  );

  it('migration file exists', () => {
    const file = readFileSync(migrationPath, 'utf-8');
    expect(file).toBeTruthy();
  });

  it('contains invited_by column definition', () => {
    const file = readFileSync(migrationPath, 'utf-8');
    expect(file).toContain('invited_by');
    expect(file).toContain('UUID REFERENCES auth.users(id)');
  });

  it('contains invited_at column definition', () => {
    const file = readFileSync(migrationPath, 'utf-8');
    expect(file).toContain('invited_at');
    expect(file).toContain('TIMESTAMPTZ');
  });

  it('contains index on invited_by', () => {
    const file = readFileSync(migrationPath, 'utf-8');
    expect(file).toContain('idx_user_roles_invited_by');
    expect(file).toContain('ON user_roles(invited_by)');
  });

  it('uses IF NOT EXISTS for safe migration', () => {
    const file = readFileSync(migrationPath, 'utf-8');
    expect(file).toContain('ADD COLUMN IF NOT EXISTS');
  });
});
