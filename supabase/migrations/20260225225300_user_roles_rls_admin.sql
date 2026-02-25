-- RLS policies: only ADMIN can UPDATE/DELETE user_roles
-- STORY-10.2

-- Allow ADMIN to update roles
CREATE POLICY IF NOT EXISTS "admin_update_roles" ON user_roles
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'ADMIN'
  ));

-- Allow ADMIN to delete from user_roles
CREATE POLICY IF NOT EXISTS "admin_delete_roles" ON user_roles
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'ADMIN'
  ));
