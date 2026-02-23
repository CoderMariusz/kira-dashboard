-- STORY-5.8: Bridge sync tables (bridge_projects, bridge_epics, bridge_stories, bridge_runs)
-- Hybrid mode: read from Bridge API locally, from Supabase when remote
-- All tables are read-only for authenticated users, write-only for service_role (sync script)

-- ============================================================================
-- 1. bridge_projects
-- ============================================================================
CREATE TABLE IF NOT EXISTS bridge_projects (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other',
  description TEXT DEFAULT '',
  bridge_project BOOLEAN NOT NULL DEFAULT false,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on bridge_projects
ALTER TABLE bridge_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policy: ADMIN can SELECT
CREATE POLICY "bridge_projects_select_admin" ON bridge_projects
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

-- RLS Policy: service_role can do everything
-- (handled by default service_role permissions, no explicit policy needed)

-- ============================================================================
-- 2. bridge_epics
-- ============================================================================
CREATE TABLE IF NOT EXISTS bridge_epics (
  project_id TEXT NOT NULL,
  id TEXT NOT NULL,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PLANNED', 'IN_PROGRESS', 'DONE')),
  created_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, id),
  CONSTRAINT bridge_epics_project_fk FOREIGN KEY (project_id) REFERENCES bridge_projects(key) ON DELETE CASCADE
);

-- Enable RLS on bridge_epics
ALTER TABLE bridge_epics ENABLE ROW LEVEL SECURITY;

-- RLS Policy: ADMIN can SELECT
CREATE POLICY "bridge_epics_select_admin" ON bridge_epics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

-- ============================================================================
-- 3. bridge_stories
-- ============================================================================
CREATE TABLE IF NOT EXISTS bridge_stories (
  project_id TEXT NOT NULL,
  id TEXT NOT NULL,
  epic_id TEXT NOT NULL,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'BACKLOG' CHECK (status IN ('BACKLOG', 'READY', 'IN_PROGRESS', 'REVIEW', 'REFACTOR', 'DONE', 'FAILED', 'BLOCKED')),
  size TEXT NOT NULL DEFAULT 'short' CHECK (size IN ('short', 'medium', 'long')),
  expected_duration_min INTEGER NOT NULL DEFAULT 30,
  depends_on JSONB NOT NULL DEFAULT '[]',
  parallel_with JSONB NOT NULL DEFAULT '[]',
  assigned_worker TEXT,
  branch TEXT,
  definition_of_done TEXT NOT NULL DEFAULT '',
  model TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, id),
  CONSTRAINT bridge_stories_project_fk FOREIGN KEY (project_id) REFERENCES bridge_projects(key) ON DELETE CASCADE,
  CONSTRAINT bridge_stories_epic_fk FOREIGN KEY (project_id, epic_id) REFERENCES bridge_epics(project_id, id) ON DELETE CASCADE
);

-- Enable RLS on bridge_stories
ALTER TABLE bridge_stories ENABLE ROW LEVEL SECURITY;

-- RLS Policy: ADMIN can SELECT
CREATE POLICY "bridge_stories_select_admin" ON bridge_stories
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

-- ============================================================================
-- 4. bridge_runs
-- ============================================================================
CREATE TABLE IF NOT EXISTS bridge_runs (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  story_id TEXT NOT NULL,
  step TEXT NOT NULL CHECK (step IN ('IMPLEMENT', 'REVIEW', 'REFACTOR', 'LESSONS')),
  worker TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'DONE', 'FAILED', 'TIMEOUT')),
  attempt_number INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_message TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on bridge_runs
ALTER TABLE bridge_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: ADMIN can SELECT
CREATE POLICY "bridge_runs_select_admin" ON bridge_runs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

-- ============================================================================
-- Performance Indexes
-- ============================================================================

-- bridge_epics: lookup by project_id and status
CREATE INDEX IF NOT EXISTS idx_bridge_epics_project_status ON bridge_epics(project_id, status);

-- bridge_stories: lookup by project_id and epic_id (for JOINs)
CREATE INDEX IF NOT EXISTS idx_bridge_stories_project_epic ON bridge_stories(project_id, epic_id);

-- bridge_stories: filter by status
CREATE INDEX IF NOT EXISTS idx_bridge_stories_status ON bridge_stories(status);

-- bridge_runs: lookup runs by story_id
CREATE INDEX IF NOT EXISTS idx_bridge_runs_story ON bridge_runs(story_id);

-- bridge_runs: filter by status
CREATE INDEX IF NOT EXISTS idx_bridge_runs_status ON bridge_runs(status);
