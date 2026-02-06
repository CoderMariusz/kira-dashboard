-- Fix infinite recursion in RLS policy
-- The previous policy referenced tasks table within itself causing recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view household tasks" ON tasks;

-- Create fixed policy without self-reference
-- Parent access is handled through board_id relationship, not direct parent_id lookup
CREATE POLICY "Users can view household tasks"
  ON tasks FOR SELECT
  USING (
    board_id IN (SELECT id FROM boards WHERE household_id = get_my_household_id())
    OR household_id = get_my_household_id()
  );

-- Ensure manage policy is also correct
DROP POLICY IF EXISTS "Users can manage household tasks" ON tasks;
CREATE POLICY "Users can manage household tasks"
  ON tasks FOR ALL
  USING (
    board_id IN (SELECT id FROM boards WHERE household_id = get_my_household_id())
    OR household_id = get_my_household_id()
  );
