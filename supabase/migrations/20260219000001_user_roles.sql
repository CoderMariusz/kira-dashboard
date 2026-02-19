-- ============================================================
-- Migration: 20260219000001_user_roles.sql
-- Description: Create user_roles table with RLS, trigger, seed
-- ============================================================

-- 1. TABELA user_roles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL CHECK (role IN ('ADMIN', 'HELPER_PLUS', 'HELPER')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 2. INDEKS na user_id (FK + uniq lookup w middleware)
-- ============================================================
CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON public.user_roles (user_id);

-- 3. TRIGGER FUNCTION — auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_roles_updated_at ON public.user_roles;
CREATE TRIGGER user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 4. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT — każdy zalogowany użytkownik widzi TYLKO swój wiersz
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
CREATE POLICY "user_roles_select_own"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Helper function: sprawdza czy bieżący caller jest ADMIN
-- Używamy SECURITY DEFINER żeby ominąć RLS podczas sprawdzania roli callera
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'ADMIN'
  );
$$;

-- Policy: INSERT — tylko ADMIN może dodawać role
DROP POLICY IF EXISTS "user_roles_insert_admin_only" ON public.user_roles;
CREATE POLICY "user_roles_insert_admin_only"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Policy: UPDATE — tylko ADMIN może zmieniać role
DROP POLICY IF EXISTS "user_roles_update_admin_only" ON public.user_roles;
CREATE POLICY "user_roles_update_admin_only"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Policy: DELETE — tylko ADMIN może usuwać role
DROP POLICY IF EXISTS "user_roles_delete_admin_only" ON public.user_roles;
CREATE POLICY "user_roles_delete_admin_only"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 5. SEED — rola ADMIN dla Mariusza
-- ============================================================
-- Używamy INSERT ... SELECT żeby bezpiecznie obsłużyć przypadek
-- gdy konto Mariusza nie istnieje jeszcze w auth.users
-- ON CONFLICT DO NOTHING: idempotentne przy ponownym wywołaniu
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'ADMIN'
FROM auth.users
WHERE email = 'mariusz@rodzina.pl'
ON CONFLICT (user_id) DO NOTHING;
