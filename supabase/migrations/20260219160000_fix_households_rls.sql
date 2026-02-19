-- ============================================================
-- Migration: 20260219160000_fix_households_rls.sql
-- Description: Fix missing RLS policies on households table.
-- Root cause: 20260219120000 policies referenced get_my_household_ids()
-- which was never created. RLS enabled + no working SELECT policy = empty results.
-- Fix: create missing function + recreate households policies using
-- the existing get_user_household_id() helper.
-- ============================================================

-- 1. Create the missing get_my_household_ids() function
-- (referenced by original policy name, but we'll replace the policies anyway)
CREATE OR REPLACE FUNCTION public.get_my_household_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT household_id
  FROM public.household_members
  WHERE user_id = auth.uid()
$$;

-- 2. Ensure RLS is enabled on households
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

-- 3. Drop any stale policies (may or may not exist)
DROP POLICY IF EXISTS households_select_members ON public.households;
DROP POLICY IF EXISTS households_insert_authenticated ON public.households;
DROP POLICY IF EXISTS households_update_admin ON public.households;
DROP POLICY IF EXISTS households_delete_admin ON public.households;
DROP POLICY IF EXISTS households_select ON public.households;
DROP POLICY IF EXISTS households_all ON public.households;

-- 4. Create correct SELECT policy — members can see their household
CREATE POLICY households_select
  ON public.households FOR SELECT TO authenticated
  USING (id = public.get_user_household_id());

-- 5. INSERT — any authenticated user can create a household
CREATE POLICY households_insert
  ON public.households FOR INSERT TO authenticated
  WITH CHECK (true);

-- 6. UPDATE — only ADMIN of that household
CREATE POLICY households_update
  ON public.households FOR UPDATE TO authenticated
  USING (
    id IN (
      SELECT household_id FROM public.household_members
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

-- 7. DELETE — only ADMIN of that household
CREATE POLICY households_delete
  ON public.households FOR DELETE TO authenticated
  USING (
    id IN (
      SELECT household_id FROM public.household_members
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

-- 8. Clean up test data
DELETE FROM public.activity_log WHERE action = 'test' AND entity_type = 'test';

SELECT 'households RLS fixed!' as status;
