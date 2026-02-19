-- Migration: household_invites table
-- Description: Zaproszenia do household (STORY-4.7)
-- ============================================================

-- 1) ENUM: invite_status
-- ------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'rejected', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2) TABLE: household_invites
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.household_invites (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  email        text        NOT NULL,
  invited_by   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status       text        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  token        text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at   timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_at   timestamptz NOT NULL DEFAULT now(),
  accepted_at  timestamptz,
  UNIQUE (household_id, email, status)
);

CREATE INDEX IF NOT EXISTS idx_household_invites_household ON public.household_invites(household_id);
CREATE INDEX IF NOT EXISTS idx_household_invites_token     ON public.household_invites(token);
CREATE INDEX IF NOT EXISTS idx_household_invites_email     ON public.household_invites(email);
CREATE INDEX IF NOT EXISTS idx_household_invites_status    ON public.household_invites(household_id, status);

-- 3) RLS: household_invites
-- ------------------------------------------------------------
ALTER TABLE public.household_invites ENABLE ROW LEVEL SECURITY;

-- Helper function: is user a member of given household?
CREATE OR REPLACE FUNCTION public.is_household_member(p_household_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = p_household_id
      AND user_id = auth.uid()
  );
$$;

-- Members can see invites for their household
DROP POLICY IF EXISTS household_invites_select ON public.household_invites;
CREATE POLICY household_invites_select
  ON public.household_invites FOR SELECT TO authenticated
  USING (public.is_household_member(household_id));

-- Only ADMIN can insert invites (via API with service role or with role check)
DROP POLICY IF EXISTS household_invites_insert_admin ON public.household_invites;
CREATE POLICY household_invites_insert_admin
  ON public.household_invites FOR INSERT TO authenticated
  WITH CHECK (
    public.is_household_member(household_id)
    AND EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_id = public.household_invites.household_id
        AND user_id = auth.uid()
        AND role = 'ADMIN'
    )
  );

-- Only ADMIN can update/revoke invites
DROP POLICY IF EXISTS household_invites_update_admin ON public.household_invites;
CREATE POLICY household_invites_update_admin
  ON public.household_invites FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_id = public.household_invites.household_id
        AND user_id = auth.uid()
        AND role = 'ADMIN'
    )
  );
