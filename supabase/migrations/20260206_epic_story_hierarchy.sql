-- US-8.1: Epic/Story Hierarchy Migration
-- Adds parent_id column to tasks table with constraints for epic → story hierarchy

-- ========================================
-- 1. ADD parent_id COLUMN TO tasks
-- ========================================
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE;

-- ========================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_household_lookup ON tasks(board_id);

-- ========================================
-- 3. CONSTRAINT: NO SELF-REFERENCE
-- ========================================
-- Prevent a task from being its own parent
ALTER TABLE tasks
  ADD CONSTRAINT chk_tasks_no_self_reference
  CHECK (id IS DISTINCT FROM parent_id);

-- ========================================
-- 4. CONSTRAINT: MAX 2 LEVELS DEPTH
-- ========================================
-- Create function to check depth constraint
CREATE OR REPLACE FUNCTION check_task_depth_max_2()
RETURNS TRIGGER AS $$
DECLARE
  parent_board_id UUID;
  parent_parent_board_id UUID;
  task_board_id UUID;
BEGIN
  -- If parent_id is NULL, no check needed
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the board_id for the task being updated/inserted
  SELECT board_id INTO task_board_id FROM tasks WHERE id = NEW.id;

  -- If this is a new row, use NEW.board_id
  IF task_board_id IS NULL THEN
    task_board_id := NEW.board_id;
  END IF;

  -- Get parent's board_id
  SELECT board_id INTO parent_board_id FROM tasks WHERE id = NEW.parent_id;

  -- Check if parent has a parent (would create level 2)
  SELECT parent_id INTO parent_parent_board_id
  FROM tasks
  WHERE id = NEW.parent_id;

  -- If parent also has a parent, that would create level 3 (grandchild)
  IF parent_parent_board_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot create task beyond 2 levels of depth (epic → story)';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for depth constraint
DROP TRIGGER IF EXISTS trg_check_task_depth ON tasks;
CREATE TRIGGER trg_check_task_depth
  BEFORE INSERT OR UPDATE OF parent_id ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION check_task_depth_max_2();

-- ========================================
-- 5. CONSTRAINT: SAME HOUSEHOLD FOR PARENT-CHILD
-- ========================================
-- Ensure parent and child belong to the same household
CREATE OR REPLACE FUNCTION check_parent_child_same_household()
RETURNS TRIGGER AS $$
DECLARE
  parent_household_id UUID;
  child_household_id UUID;
BEGIN
  -- If parent_id is NULL, no check needed
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get parent's household_id through board
  SELECT b.household_id INTO parent_household_id
  FROM tasks t
  JOIN boards b ON t.board_id = b.id
  WHERE t.id = NEW.parent_id;

  -- Get child's household_id through board
  -- For UPDATE, check both NEW and OLD to catch changes
  IF TG_OP = 'UPDATE' THEN
    SELECT b.household_id INTO child_household_id
    FROM boards b
    WHERE b.id = NEW.board_id;
  ELSE
    -- For INSERT, use NEW.board_id
    SELECT b.household_id INTO child_household_id
    FROM boards b
    WHERE b.id = NEW.board_id;
  END IF;

  -- Ensure they're in the same household
  IF parent_household_id IS DISTINCT FROM child_household_id THEN
    RAISE EXCEPTION 'Parent and child tasks must belong to the same household';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for household consistency
DROP TRIGGER IF EXISTS trg_check_parent_child_household ON tasks;
CREATE TRIGGER trg_check_parent_child_household
  BEFORE INSERT OR UPDATE OF parent_id, board_id ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION check_parent_child_same_household();

-- ========================================
-- 6. UPDATE RLS POLICIES FOR PARENT_ID
-- ========================================

-- Update SELECT policy to include parent-based queries
DROP POLICY IF EXISTS "Users can view household tasks" ON tasks;
CREATE POLICY "Users can view household tasks"
  ON tasks FOR SELECT
  USING (
    board_id IN (SELECT id FROM boards WHERE household_id = get_my_household_id())
    OR parent_id IN (
      SELECT t.id FROM tasks t
      JOIN boards b ON t.board_id = b.id
      WHERE b.household_id = get_my_household_id()
    )
  );

-- Update INSERT policy to check household consistency with parent
DROP POLICY IF EXISTS "Users can manage household tasks" ON tasks;
CREATE POLICY "Users can manage household tasks"
  ON tasks FOR ALL
  USING (
    board_id IN (SELECT id FROM boards WHERE household_id = get_my_household_id())
  );

-- ========================================
-- 7. HELPER FUNCTIONS
-- ========================================

-- AC3: get_epic_with_stories(epic_id)
-- Returns epic with nested stories
CREATE OR REPLACE FUNCTION get_epic_with_stories(epic_id UUID)
RETURNS JSONB AS $$
DECLARE
  epic_rec RECORD;
  stories JSONB;
  result JSONB;
BEGIN
  -- Get the epic (must be accessible via RLS)
  SELECT t INTO epic_rec
  FROM tasks t
  JOIN boards b ON t.board_id = b.id
  WHERE t.id = epic_id
    AND b.household_id = get_my_household_id();

  -- If epic doesn't exist or user can't access it, return NULL
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Get all stories for this epic
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'board_id', t.board_id,
      'title', t.title,
      'description', t.description,
      'column', t.column,
      'priority', t.priority,
      'position', t.position,
      'due_date', t.due_date,
      'labels', t.labels,
      'subtasks', t.subtasks,
      'assigned_to', t.assigned_to,
      'created_by', t.created_by,
      'completed_at', t.completed_at,
      'parent_id', t.parent_id,
      'created_at', t.created_at,
      'updated_at', t.updated_at
    )
  ), '[]'::jsonb) INTO stories
  FROM tasks t
  WHERE t.parent_id = epic_id;

  -- Build result with epic and nested stories
  result := jsonb_build_object(
    'id', epic_rec.id,
    'board_id', epic_rec.board_id,
    'title', epic_rec.title,
    'description', epic_rec.description,
    'column', epic_rec.column,
    'priority', epic_rec.priority,
    'position', epic_rec.position,
    'due_date', epic_rec.due_date,
    'labels', epic_rec.labels,
    'subtasks', epic_rec.subtasks,
    'assigned_to', epic_rec.assigned_to,
    'created_by', epic_rec.created_by,
    'completed_at', epic_rec.completed_at,
    'parent_id', epic_rec.parent_id,
    'created_at', epic_rec.created_at,
    'updated_at', epic_rec.updated_at,
    'stories', stories
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- AC3: get_stories_for_epic(epic_id)
-- Returns only stories for a given epic
CREATE OR REPLACE FUNCTION get_stories_for_epic(epic_id UUID)
RETURNS SETOF tasks AS $$
BEGIN
  RETURN QUERY
  SELECT t.*
  FROM tasks t
  JOIN boards b ON t.board_id = b.id
  WHERE t.parent_id = epic_id
    AND b.household_id = get_my_household_id();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- AC3: is_epic(task_id)
-- Checks if a task has children (is an epic)
CREATE OR REPLACE FUNCTION is_epic(task_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  has_children BOOLEAN;
BEGIN
  -- Check if task exists and has children (within user's household)
  SELECT EXISTS(
    SELECT 1
    FROM tasks t
    JOIN boards b ON t.board_id = b.id
    WHERE t.parent_id = task_id
      AND b.household_id = get_my_household_id()
  ) INTO has_children;

  -- Also verify task exists and is accessible
  IF NOT EXISTS(
    SELECT 1
    FROM tasks t
    JOIN boards b ON t.board_id = b.id
    WHERE t.id = task_id
      AND b.household_id = get_my_household_id()
  ) THEN
    RETURN FALSE;
  END IF;

  RETURN has_children;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 8. ADD REALTIME SUPPORT
-- ========================================
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
