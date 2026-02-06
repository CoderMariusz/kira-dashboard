-- US-8.1: Epic/Story Hierarchy Migration
-- Adds support for hierarchical tasks (epics and stories)

-- ========================================
-- 1. ENUM: task_type
-- ========================================
DO $$ BEGIN
  CREATE TYPE task_type AS ENUM ('task', 'epic', 'story');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ========================================
-- 2. ALTER TABLE: tasks
-- ========================================

-- Add type column with default 'task'
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS type task_type NOT NULL DEFAULT 'task';

-- Add parent_id column for hierarchy (nullable)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE;

-- Add household_id column for direct household access (nullable, denormalized from boards)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE CASCADE;

-- Add completed boolean for stories
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT false;

-- ========================================
-- 3. UPDATE COLUMN DEFAULT
-- ========================================

-- Update all existing tasks to have type='task' and completed=true for done column
UPDATE tasks SET type = 'task' WHERE type IS NULL;
UPDATE tasks SET completed = ("column" = 'done') WHERE completed IS NULL;

-- Set household_id from board for existing tasks
UPDATE tasks t
SET household_id = b.household_id
FROM boards b
WHERE t.board_id = b.id AND t.household_id IS NULL;

-- ========================================
-- 4. INDEXES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_household ON tasks(household_id);
CREATE INDEX IF NOT EXISTS idx_tasks_type_parent ON tasks(type, parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_household_type ON tasks(household_id, type);

-- ========================================
-- 5. UPDATE RLS POLICIES
-- ========================================

-- Allow direct household access for epics/stories
DROP POLICY IF EXISTS "Users can view household tasks" ON tasks;
CREATE POLICY "Users can view household tasks"
  ON tasks FOR SELECT
  USING (
    board_id IN (SELECT id FROM boards WHERE household_id = get_my_household_id())
    OR household_id = get_my_household_id()
  );

DROP POLICY IF EXISTS "Users can manage household tasks" ON tasks;
CREATE POLICY "Users can manage household tasks"
  ON tasks FOR ALL
  USING (
    board_id IN (SELECT id FROM boards WHERE household_id = get_my_household_id())
    OR household_id = get_my_household_id()
  );

-- ========================================
-- 6. CHECK CONSTRAINTS
-- ========================================

-- Ensure stories have parent_id and epics don't
ALTER TABLE tasks ADD CONSTRAINT check_epic_no_parent
  CHECK (type != 'epic' OR parent_id IS NULL);

ALTER TABLE tasks ADD CONSTRAINT check_story_has_parent
  CHECK (type != 'story' OR parent_id IS NOT NULL);

-- NOTE: Parent validation is handled by trigger in next migration
-- (PostgreSQL doesn't allow subqueries in CHECK constraints)

-- ========================================
-- DONE!
-- ========================================
