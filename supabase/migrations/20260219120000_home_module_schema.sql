-- ============================================================
-- Migration: 20260219120000_home_module_schema.sql
-- Description: Home module schema (households, shopping, tasks, activity)
-- Story: STORY-4.1
-- ============================================================

-- 0. Invite code helper with pgcrypto fallback
-- ------------------------------------------------------------
-- Preferujemy gen_random_bytes(6) gdy dostępne; fallback bez pgcrypto.
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  generated_code text;
BEGIN
  BEGIN
    generated_code := encode(gen_random_bytes(6), 'hex');
  EXCEPTION
    WHEN undefined_function THEN
      generated_code := substring(md5(random()::text || clock_timestamp()::text), 1, 12);
  END;

  RETURN generated_code;
END;
$$;

-- 1. TABLES (kolejność FK ma znaczenie)
-- ------------------------------------------------------------

-- 1) households
CREATE TABLE IF NOT EXISTS public.households (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL DEFAULT 'Moja Rodzina',
  invite_code text        UNIQUE DEFAULT public.generate_invite_code(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 2) household_members
CREATE TABLE IF NOT EXISTS public.household_members (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         text        NOT NULL DEFAULT 'HELPER'
                           CHECK (role IN ('ADMIN', 'HELPER+', 'HELPER')),
  joined_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, user_id)
);

-- 3) columns (kanban columns)
CREATE TABLE IF NOT EXISTS public.columns (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  position     integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 4) shopping_items
CREATE TABLE IF NOT EXISTS public.shopping_items (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  category     text        NOT NULL DEFAULT 'Inne',
  quantity     integer     NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit         text,
  is_bought    boolean     NOT NULL DEFAULT false,
  bought_at    timestamptz,
  added_by     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- 5) tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  column_id    uuid        NOT NULL REFERENCES public.columns(id) ON DELETE CASCADE,
  title        text        NOT NULL,
  description  text,
  priority     text        NOT NULL DEFAULT 'medium'
                           CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  position     integer     NOT NULL DEFAULT 0,
  assigned_to  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date     date,
  created_by   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- 6) activity_log
CREATE TABLE IF NOT EXISTS public.activity_log (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  actor_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name   text,
  action       text        NOT NULL,
  entity_type  text        NOT NULL,
  entity_id    uuid,
  entity_name  text,
  details      jsonb       NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 2. INDEXES
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_household_members_household ON public.household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_user      ON public.household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_household    ON public.shopping_items(household_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_is_bought    ON public.shopping_items(household_id, is_bought);
CREATE INDEX IF NOT EXISTS idx_columns_household           ON public.columns(household_id);
CREATE INDEX IF NOT EXISTS idx_tasks_household             ON public.tasks(household_id);
CREATE INDEX IF NOT EXISTS idx_tasks_column                ON public.tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_tasks_position              ON public.tasks(column_id, position);
CREATE INDEX IF NOT EXISTS idx_activity_log_household      ON public.activity_log(household_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created        ON public.activity_log(created_at DESC);

-- 3. TRIGGERS + FUNCTIONS
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_households_updated_at ON public.households;
CREATE TRIGGER tr_households_updated_at
  BEFORE UPDATE ON public.households
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS tr_shopping_items_updated_at ON public.shopping_items;
CREATE TRIGGER tr_shopping_items_updated_at
  BEFORE UPDATE ON public.shopping_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS tr_tasks_updated_at ON public.tasks;
CREATE TRIGGER tr_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.set_shopping_bought_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_bought = true AND OLD.is_bought = false THEN
    NEW.bought_at = now();
  ELSIF NEW.is_bought = false AND OLD.is_bought = true THEN
    NEW.bought_at = NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_shopping_items_bought_at ON public.shopping_items;
CREATE TRIGGER tr_shopping_items_bought_at
  BEFORE UPDATE ON public.shopping_items
  FOR EACH ROW EXECUTE FUNCTION public.set_shopping_bought_at();

-- Helper for RLS to avoid recursive household_members checks
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

-- 4. ROW LEVEL SECURITY
-- ------------------------------------------------------------
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- households
DROP POLICY IF EXISTS households_select_members ON public.households;
CREATE POLICY households_select_members
  ON public.households FOR SELECT TO authenticated
  USING (id IN (SELECT public.get_my_household_ids()));

DROP POLICY IF EXISTS households_insert_authenticated ON public.households;
CREATE POLICY households_insert_authenticated
  ON public.households FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS households_update_admin ON public.households;
CREATE POLICY households_update_admin
  ON public.households FOR UPDATE TO authenticated
  USING (
    id IN (
      SELECT household_id
      FROM public.household_members
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS households_delete_admin ON public.households;
CREATE POLICY households_delete_admin
  ON public.households FOR DELETE TO authenticated
  USING (
    id IN (
      SELECT household_id
      FROM public.household_members
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

-- household_members
DROP POLICY IF EXISTS household_members_select ON public.household_members;
CREATE POLICY household_members_select
  ON public.household_members FOR SELECT TO authenticated
  USING (household_id IN (SELECT public.get_my_household_ids()));

DROP POLICY IF EXISTS household_members_insert_admin ON public.household_members;
CREATE POLICY household_members_insert_admin
  ON public.household_members FOR INSERT TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_id
      FROM public.household_members
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS household_members_delete_admin ON public.household_members;
CREATE POLICY household_members_delete_admin
  ON public.household_members FOR DELETE TO authenticated
  USING (
    household_id IN (
      SELECT household_id
      FROM public.household_members
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

-- columns
DROP POLICY IF EXISTS columns_select ON public.columns;
CREATE POLICY columns_select
  ON public.columns FOR SELECT TO authenticated
  USING (household_id IN (SELECT public.get_my_household_ids()));

DROP POLICY IF EXISTS columns_insert_admin ON public.columns;
CREATE POLICY columns_insert_admin
  ON public.columns FOR INSERT TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_id
      FROM public.household_members
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS columns_update_admin ON public.columns;
CREATE POLICY columns_update_admin
  ON public.columns FOR UPDATE TO authenticated
  USING (
    household_id IN (
      SELECT household_id
      FROM public.household_members
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id
      FROM public.household_members
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS columns_delete_admin ON public.columns;
CREATE POLICY columns_delete_admin
  ON public.columns FOR DELETE TO authenticated
  USING (
    household_id IN (
      SELECT household_id
      FROM public.household_members
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

-- shopping_items
DROP POLICY IF EXISTS shopping_select ON public.shopping_items;
CREATE POLICY shopping_select
  ON public.shopping_items FOR SELECT TO authenticated
  USING (household_id IN (SELECT public.get_my_household_ids()));

DROP POLICY IF EXISTS shopping_insert ON public.shopping_items;
CREATE POLICY shopping_insert
  ON public.shopping_items FOR INSERT TO authenticated
  WITH CHECK (household_id IN (SELECT public.get_my_household_ids()));

DROP POLICY IF EXISTS shopping_update ON public.shopping_items;
CREATE POLICY shopping_update
  ON public.shopping_items FOR UPDATE TO authenticated
  USING (household_id IN (SELECT public.get_my_household_ids()))
  WITH CHECK (household_id IN (SELECT public.get_my_household_ids()));

DROP POLICY IF EXISTS shopping_delete ON public.shopping_items;
CREATE POLICY shopping_delete
  ON public.shopping_items FOR DELETE TO authenticated
  USING (household_id IN (SELECT public.get_my_household_ids()));

-- tasks
DROP POLICY IF EXISTS tasks_select ON public.tasks;
CREATE POLICY tasks_select
  ON public.tasks FOR SELECT TO authenticated
  USING (household_id IN (SELECT public.get_my_household_ids()));

DROP POLICY IF EXISTS tasks_insert ON public.tasks;
CREATE POLICY tasks_insert
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (household_id IN (SELECT public.get_my_household_ids()));

DROP POLICY IF EXISTS tasks_update ON public.tasks;
CREATE POLICY tasks_update
  ON public.tasks FOR UPDATE TO authenticated
  USING (household_id IN (SELECT public.get_my_household_ids()))
  WITH CHECK (household_id IN (SELECT public.get_my_household_ids()));

DROP POLICY IF EXISTS tasks_delete ON public.tasks;
CREATE POLICY tasks_delete
  ON public.tasks FOR DELETE TO authenticated
  USING (household_id IN (SELECT public.get_my_household_ids()));

-- activity_log (immutable: only SELECT + INSERT)
DROP POLICY IF EXISTS activity_select ON public.activity_log;
CREATE POLICY activity_select
  ON public.activity_log FOR SELECT TO authenticated
  USING (household_id IN (SELECT public.get_my_household_ids()));

DROP POLICY IF EXISTS activity_insert ON public.activity_log;
CREATE POLICY activity_insert
  ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (household_id IN (SELECT public.get_my_household_ids()));

-- 5. REALTIME PUBLICATION
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'shopping_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.shopping_items;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'activity_log'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'columns'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.columns;
  END IF;
END;
$$;

-- ============================================================
-- rollback (manual)
-- ============================================================
/*
DROP TRIGGER IF EXISTS tr_tasks_updated_at ON public.tasks;
DROP TRIGGER IF EXISTS tr_shopping_items_updated_at ON public.shopping_items;
DROP TRIGGER IF EXISTS tr_shopping_items_bought_at ON public.shopping_items;
DROP TRIGGER IF EXISTS tr_households_updated_at ON public.households;

DROP FUNCTION IF EXISTS public.update_updated_at();
DROP FUNCTION IF EXISTS public.set_shopping_bought_at();
DROP FUNCTION IF EXISTS public.get_my_household_ids();
DROP FUNCTION IF EXISTS public.generate_invite_code();

DROP TABLE IF EXISTS public.activity_log CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.shopping_items CASCADE;
DROP TABLE IF EXISTS public.columns CASCADE;
DROP TABLE IF EXISTS public.household_members CASCADE;
DROP TABLE IF EXISTS public.households CASCADE;
*/
