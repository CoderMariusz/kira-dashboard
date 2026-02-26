-- STORY-12.1: Bridge Pipeline Tables Migration
-- Creates/extends bridge_stories, bridge_epics, bridge_runs for pipeline sync
-- Safe migration: uses IF NOT EXISTS for all additions

-- ============================================================================
-- 1. bridge_epics — add missing columns and fix constraints
-- ============================================================================

ALTER TABLE bridge_epics 
  ADD COLUMN IF NOT EXISTS total_stories INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS done_stories INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Make file_path nullable (spec doesn't require it)
ALTER TABLE bridge_epics ALTER COLUMN file_path DROP NOT NULL;

-- ============================================================================
-- 2. bridge_stories — add missing columns and fix constraints
-- ============================================================================

ALTER TABLE bridge_stories
  ADD COLUMN IF NOT EXISTS difficulty TEXT,
  ADD COLUMN IF NOT EXISTS recommended_model TEXT,
  ADD COLUMN IF NOT EXISTS assigned_model TEXT,
  ADD COLUMN IF NOT EXISTS domain TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT,
  ADD COLUMN IF NOT EXISTS estimated_effort TEXT,
  ADD COLUMN IF NOT EXISTS blocks TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Make file_path nullable (spec doesn't require it)
ALTER TABLE bridge_stories ALTER COLUMN file_path DROP NOT NULL;

-- Update status CHECK constraint to include TDD states
ALTER TABLE bridge_stories DROP CONSTRAINT IF EXISTS bridge_stories_status_check;
ALTER TABLE bridge_stories ADD CONSTRAINT bridge_stories_status_check
  CHECK (status IN ('BACKLOG','READY','TEST_RED','IN_PROGRESS','TEST_GREEN','REVIEW','REFACTOR','APPROVED','DONE','BLOCKED','FAILED'));

-- Convert depends_on from JSONB to TEXT[] if needed for consistency
-- Note: This is a one-way migration. JSONB data will be preserved as text representation.
DO $$
BEGIN
  -- Check if depends_on is JSONB type, convert to TEXT[]
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bridge_stories' 
    AND column_name = 'depends_on'
    AND data_type = 'jsonb'
  ) THEN
    -- Add temporary column
    ALTER TABLE bridge_stories ADD COLUMN depends_on_new TEXT[] DEFAULT '{}';
    
    -- Migrate data: JSONB array -> TEXT[]
    UPDATE bridge_stories 
    SET depends_on_new = ARRAY(
      SELECT jsonb_array_elements_text(depends_on)
    )
    WHERE depends_on IS NOT NULL AND jsonb_typeof(depends_on) = 'array';
    
    -- Drop old column and rename new
    ALTER TABLE bridge_stories DROP COLUMN depends_on;
    ALTER TABLE bridge_stories RENAME COLUMN depends_on_new TO depends_on;
  ELSE
    -- Ensure depends_on is TEXT[] if it doesn't exist
    ALTER TABLE bridge_stories ADD COLUMN IF NOT EXISTS depends_on TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- ============================================================================
-- 3. bridge_runs — ensure project_id and synced_at exist
-- ============================================================================

ALTER TABLE bridge_runs
  ADD COLUMN IF NOT EXISTS project_id TEXT,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ DEFAULT NOW();

-- Update status CHECK constraint to match sync script values
ALTER TABLE bridge_runs DROP CONSTRAINT IF EXISTS bridge_runs_status_check;
ALTER TABLE bridge_runs ADD CONSTRAINT bridge_runs_status_check
  CHECK (status IN ('RUNNING','SUCCESS','FAILED','TIMEOUT'));

-- ============================================================================
-- 4. Row Level Security — allow authenticated SELECT (not just ADMIN)
-- ============================================================================

-- Drop old ADMIN-only policies if they exist
DROP POLICY IF EXISTS "bridge_stories_select_admin" ON bridge_stories;
DROP POLICY IF EXISTS "bridge_epics_select_admin" ON bridge_epics;
DROP POLICY IF EXISTS "bridge_runs_select_admin" ON bridge_runs;

-- Enable RLS (idempotent)
ALTER TABLE bridge_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridge_epics ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridge_runs ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated SELECT (idempotent)
DO $$ BEGIN
  CREATE POLICY "authenticated_read_stories" ON bridge_stories FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "authenticated_read_epics" ON bridge_epics FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "authenticated_read_runs" ON bridge_runs FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Note: Write access is limited to service_role which bypasses RLS by default

-- ============================================================================
-- 5. Performance Indexes
-- ============================================================================

-- bridge_stories indexes
CREATE INDEX IF NOT EXISTS idx_bridge_stories_project ON bridge_stories(project_id);
CREATE INDEX IF NOT EXISTS idx_bridge_stories_epic ON bridge_stories(project_id, epic_id);
CREATE INDEX IF NOT EXISTS idx_bridge_stories_status ON bridge_stories(status);

-- bridge_epics indexes
CREATE INDEX IF NOT EXISTS idx_bridge_epics_project ON bridge_epics(project_id);

-- bridge_runs indexes  
CREATE INDEX IF NOT EXISTS idx_bridge_runs_project ON bridge_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_bridge_runs_story ON bridge_runs(story_id);
CREATE INDEX IF NOT EXISTS idx_bridge_runs_started_at ON bridge_runs(started_at DESC);

-- ============================================================================
-- 6. Comments for documentation
-- ============================================================================

COMMENT ON COLUMN bridge_stories.difficulty IS 'Story difficulty: trivial|simple|moderate|complex|expert';
COMMENT ON COLUMN bridge_stories.recommended_model IS 'Recommended AI model: kimi-k2.5|sonnet-4.6|etc';
COMMENT ON COLUMN bridge_stories.assigned_model IS 'Actually assigned model for implementation';
COMMENT ON COLUMN bridge_stories.domain IS 'Story domain: database|auth|backend|wiring|frontend';
COMMENT ON COLUMN bridge_stories.priority IS 'Priority: must|should|could';
COMMENT ON COLUMN bridge_stories.estimated_effort IS 'Estimated effort like 4h, 2d';
COMMENT ON COLUMN bridge_stories.depends_on IS 'Array of story IDs this story depends on';
COMMENT ON COLUMN bridge_stories.blocks IS 'Array of story IDs this story blocks';
COMMENT ON COLUMN bridge_epics.total_stories IS 'Total number of stories in epic';
COMMENT ON COLUMN bridge_epics.done_stories IS 'Number of completed stories in epic';
