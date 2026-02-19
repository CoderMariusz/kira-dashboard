-- ============================================================
-- Migration: 20260219150000_fix_user_roles_rls.sql
-- Description: Apply missing RLS policies on user_roles
-- (20260219000001 was marked applied without running SQL)
-- ============================================================

-- 1. Upewnij się że RLS jest włączone
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. SELECT — każdy zalogowany widzi tylko swój wiersz
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
CREATE POLICY "user_roles_select_own"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. Helper: is_admin()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'ADMIN'
  );
$$;

-- 4. INSERT/UPDATE/DELETE — tylko ADMIN
DROP POLICY IF EXISTS "user_roles_insert_admin_only" ON public.user_roles;
CREATE POLICY "user_roles_insert_admin_only"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "user_roles_update_admin_only" ON public.user_roles;
CREATE POLICY "user_roles_update_admin_only"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "user_roles_delete_admin_only" ON public.user_roles;
CREATE POLICY "user_roles_delete_admin_only"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.is_admin());

-- 5. Trigger updated_at (może już istnieć)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS user_roles_updated_at ON public.user_roles;
CREATE TRIGGER user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. Seed: upewnij się że wszyscy 4 userzy mają ADMIN
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'ADMIN' FROM auth.users
WHERE email IN (
  'mariusz.krawczyk@outlook.com',
  'coder.mariusz@gmail.com',
  'admin@kira.local',
  'angelikakubacka1@gmail.com'
)
ON CONFLICT (user_id) DO UPDATE SET role = 'ADMIN';

SELECT 'user_roles RLS fixed!' as status,
       count(*) as users_with_roles
FROM public.user_roles;
