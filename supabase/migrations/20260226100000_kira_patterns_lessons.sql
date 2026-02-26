-- Migration: kira_patterns and kira_lessons tables for pattern/lesson management
-- Created: 2026-02-26
-- Story: STORY-12.3

-- ─── kira_patterns ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kira_patterns (
  id              TEXT PRIMARY KEY,      -- np. hash lub 'pattern-001'
  project_id      TEXT NOT NULL DEFAULT 'kira-dashboard',
  source          TEXT NOT NULL,         -- 'patterns.md' | 'anti-patterns.md'
  type            TEXT NOT NULL,         -- 'PATTERN' | 'ANTI_PATTERN'
  category        TEXT NOT NULL,
  date            DATE,
  model           TEXT,
  domain          TEXT,
  text            TEXT NOT NULL,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  related_stories TEXT[] NOT NULL DEFAULT '{}',
  occurrences     INT  NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── kira_lessons ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kira_lessons (
  id          TEXT PRIMARY KEY,          -- 'OPS-001', 'OPS-002' itd.
  project_id  TEXT NOT NULL DEFAULT 'kira-dashboard',
  source      TEXT NOT NULL DEFAULT 'LESSONS_LEARNED.md',
  title       TEXT NOT NULL,
  date        DATE,
  severity    TEXT NOT NULL DEFAULT 'LOW', -- CRITICAL|HIGH|MEDIUM|LOW
  description TEXT NOT NULL,
  root_cause  TEXT,
  fix         TEXT,
  story_id    TEXT,                       -- powiązana story np. 'STORY-7.1'
  tags        TEXT[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_kira_patterns_project  ON kira_patterns(project_id);
CREATE INDEX IF NOT EXISTS idx_kira_patterns_type     ON kira_patterns(type);
CREATE INDEX IF NOT EXISTS idx_kira_patterns_tags     ON kira_patterns USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_kira_lessons_project   ON kira_lessons(project_id);
CREATE INDEX IF NOT EXISTS idx_kira_lessons_severity  ON kira_lessons(severity);

-- Composite index for common query pattern (project_id + type)
CREATE INDEX IF NOT EXISTS idx_kira_patterns_project_type ON kira_patterns(project_id, type);

-- ─── RLS Policies ─────────────────────────────────────────────────────────────
-- Enable RLS on all tables
ALTER TABLE kira_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE kira_lessons ENABLE ROW LEVEL SECURITY;

-- Read: wszyscy zalogowani
DROP POLICY IF EXISTS "auth_read_patterns" ON kira_patterns;
CREATE POLICY "auth_read_patterns" ON kira_patterns FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_read_lessons" ON kira_lessons;
CREATE POLICY "auth_read_lessons"  ON kira_lessons  FOR SELECT TO authenticated USING (true);

-- Write: ADMIN (sprawdzamy przez user_roles) lub service_role
DROP POLICY IF EXISTS "admin_write_patterns" ON kira_patterns;
CREATE POLICY "admin_write_patterns" ON kira_patterns
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
  );

DROP POLICY IF EXISTS "admin_write_lessons" ON kira_lessons;
CREATE POLICY "admin_write_lessons" ON kira_lessons
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
  );
