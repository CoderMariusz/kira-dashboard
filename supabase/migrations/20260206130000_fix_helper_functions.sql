-- Fix helper functions that have record field access issues

-- Drop existing functions first (parameter names changed)
DROP FUNCTION IF EXISTS get_epic_with_stories(UUID);
DROP FUNCTION IF EXISTS get_stories_for_epic(UUID);
DROP FUNCTION IF EXISTS is_epic(UUID);

-- AC3: get_epic_with_stories(epic_id) - FIXED
-- Returns epic with nested stories
CREATE OR REPLACE FUNCTION get_epic_with_stories(epic_id UUID)
RETURNS JSONB AS $$
DECLARE
  epic_data JSONB;
  stories JSONB;
  result JSONB;
BEGIN
  -- Get the epic as JSONB directly (must be accessible via RLS)
  SELECT jsonb_build_object(
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
  ) INTO epic_data
  FROM tasks t
  JOIN boards b ON t.board_id = b.id
  WHERE t.id = epic_id
    AND b.household_id = get_my_household_id();

  -- If epic doesn't exist or user can't access it, return NULL
  IF epic_data IS NULL THEN
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

  -- Add stories to epic data
  result := epic_data || jsonb_build_object('stories', stories);

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- AC3: get_stories_for_epic(epic_id) - FIXED
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

-- AC3: is_epic(task_id) - FIXED  
-- Checks if a task has children (is an epic)
CREATE OR REPLACE FUNCTION is_epic(task_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  has_children BOOLEAN;
  task_exists BOOLEAN;
BEGIN
  -- First verify task exists and is accessible
  SELECT EXISTS(
    SELECT 1
    FROM tasks t
    JOIN boards b ON t.board_id = b.id
    WHERE t.id = task_id
      AND b.household_id = get_my_household_id()
  ) INTO task_exists;

  IF NOT task_exists THEN
    RETURN FALSE;
  END IF;

  -- Check if task has children
  SELECT EXISTS(
    SELECT 1
    FROM tasks t
    WHERE t.parent_id = task_id
  ) INTO has_children;

  RETURN has_children;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
