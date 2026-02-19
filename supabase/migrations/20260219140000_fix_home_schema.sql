-- ============================================================
-- Migration: 20260219140000_fix_home_schema.sql
-- Description: Fix home module schema - handle pre-existing tables from archive
-- Renames old tables, creates correct new tables per STORY-4.1 spec
-- ============================================================

-- 1. Archiwizuj stare tabele z archiwum (zły schema bez household_id)
-- ------------------------------------------------------------
DO $$
BEGIN
  -- shopping_items: stara kolumna list_id zamiast household_id
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='shopping_items' AND column_name='list_id') THEN
    ALTER TABLE public.shopping_items RENAME TO _archive_shopping_items;
    RAISE NOTICE 'Renamed shopping_items → _archive_shopping_items';
  END IF;

  -- tasks: stara kolumna board_id + kolumna column (text) zamiast column_id (uuid)
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='tasks' AND column_name='board_id') THEN
    ALTER TABLE public.tasks RENAME TO _archive_tasks;
    RAISE NOTICE 'Renamed tasks → _archive_tasks';
  END IF;

  -- activity_log: sprawdź czy ma stary schema
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='activity_log' AND column_name='household_id') THEN
    -- Ma household_id — prawdopodobnie OK, zostaw
    RAISE NOTICE 'activity_log has household_id — keeping as is';
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables
                WHERE table_schema='public' AND table_name='activity_log') THEN
    ALTER TABLE public.activity_log RENAME TO _archive_activity_log;
    RAISE NOTICE 'Renamed activity_log → _archive_activity_log';
  END IF;
END $$;

-- 2. Utwórz household_members (jeśli nie istnieje)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.household_members (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         text        NOT NULL DEFAULT 'HELPER'
                           CHECK (role IN ('ADMIN', 'HELPER+', 'HELPER')),
  joined_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, user_id)
);

-- 3. Utwórz columns (kanban columns)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.columns (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  position     integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 4. Nowe shopping_items z household_id
-- ------------------------------------------------------------
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

-- 5. Nowe tasks z column_id
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  column_id    uuid        NOT NULL REFERENCES public.columns(id) ON DELETE CASCADE,
  title        text        NOT NULL,
  description  text,
  priority     text        NOT NULL DEFAULT 'medium'
                           CHECK (priority IN ('urgent','high','medium','low')),
  position     integer     NOT NULL DEFAULT 0,
  due_date     date,
  label        text,
  subtasks     text[],
  assigned_to  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- 6. activity_log (jeśli nie istnieje / stara wersja przeArchiwizowana)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_log (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  actor_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name   text,
  entity_type  text        NOT NULL,
  entity_id    uuid,
  action       text        NOT NULL,
  metadata     jsonb       NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 7. Indexy
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_household_members_household ON public.household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_user      ON public.household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_columns_household           ON public.columns(household_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_household    ON public.shopping_items(household_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_bought       ON public.shopping_items(is_bought);
CREATE INDEX IF NOT EXISTS idx_tasks_household             ON public.tasks(household_id);
CREATE INDEX IF NOT EXISTS idx_tasks_column                ON public.tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_household      ON public.activity_log(household_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created        ON public.activity_log(created_at DESC);

-- 8. Włącz RLS
-- ------------------------------------------------------------
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.columns           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log      ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies (uproszczone: authenticated ma dostęp do własnego household)
-- Helper function
CREATE OR REPLACE FUNCTION public.get_user_household_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT household_id FROM public.household_members
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- household_members policies
DROP POLICY IF EXISTS household_members_select ON public.household_members;
CREATE POLICY household_members_select ON public.household_members
  FOR SELECT TO authenticated
  USING (household_id = public.get_user_household_id());

DROP POLICY IF EXISTS household_members_insert ON public.household_members;
CREATE POLICY household_members_insert ON public.household_members
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS household_members_delete ON public.household_members;
CREATE POLICY household_members_delete ON public.household_members
  FOR DELETE TO authenticated
  USING (household_id = public.get_user_household_id());

-- columns policies
DROP POLICY IF EXISTS columns_select ON public.columns;
CREATE POLICY columns_select ON public.columns
  FOR SELECT TO authenticated
  USING (household_id = public.get_user_household_id());

DROP POLICY IF EXISTS columns_all ON public.columns;
CREATE POLICY columns_all ON public.columns
  FOR ALL TO authenticated
  USING (household_id = public.get_user_household_id())
  WITH CHECK (household_id = public.get_user_household_id());

-- shopping_items policies
DROP POLICY IF EXISTS shopping_items_all ON public.shopping_items;
CREATE POLICY shopping_items_all ON public.shopping_items
  FOR ALL TO authenticated
  USING (household_id = public.get_user_household_id())
  WITH CHECK (household_id = public.get_user_household_id());

-- tasks policies
DROP POLICY IF EXISTS tasks_all ON public.tasks;
CREATE POLICY tasks_all ON public.tasks
  FOR ALL TO authenticated
  USING (household_id = public.get_user_household_id())
  WITH CHECK (household_id = public.get_user_household_id());

-- activity_log policies
DROP POLICY IF EXISTS activity_log_select ON public.activity_log;
CREATE POLICY activity_log_select ON public.activity_log
  FOR SELECT TO authenticated
  USING (household_id = public.get_user_household_id());

DROP POLICY IF EXISTS activity_log_insert ON public.activity_log;
CREATE POLICY activity_log_insert ON public.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 10. Updated_at triggers
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS shopping_items_updated_at ON public.shopping_items;
CREATE TRIGGER shopping_items_updated_at
  BEFORE UPDATE ON public.shopping_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS tasks_updated_at ON public.tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Dodaj Mariusza do istniejącego household
-- (zostanie pominięte jeśli już jest)
INSERT INTO public.household_members (household_id, user_id, role)
SELECT h.id, u.id, 'ADMIN'
FROM public.households h
CROSS JOIN auth.users u
WHERE u.email IN ('mariusz.krawczyk@outlook.com', 'coder.mariusz@gmail.com',
                  'admin@kira.local', 'angelikakubacka1@gmail.com')
  AND h.name = 'Rodzina Krawczyk'
ON CONFLICT (household_id, user_id) DO NOTHING;

SELECT 'Migration 20260219140000 complete!' as status,
       (SELECT count(*) FROM public.household_members) as members_count,
       (SELECT count(*) FROM public.shopping_items) as shopping_count,
       (SELECT count(*) FROM public.tasks) as tasks_count;

-- 11. is_household_member function (potrzebna dla household_invites RLS)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_household_member(p_household_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = p_household_id AND user_id = auth.uid()
  )
$$;

-- 12. Re-apply household_invites RLS (bo 20260219130000 nie dokończył)
-- ------------------------------------------------------------
ALTER TABLE IF EXISTS public.household_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invites_select ON public.household_invites;
CREATE POLICY invites_select ON public.household_invites
  FOR SELECT TO authenticated
  USING (public.is_household_member(household_id));

DROP POLICY IF EXISTS invites_insert ON public.household_invites;
CREATE POLICY invites_insert ON public.household_invites
  FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(household_id));

DROP POLICY IF EXISTS invites_update ON public.household_invites;
CREATE POLICY invites_update ON public.household_invites
  FOR UPDATE TO authenticated
  USING (public.is_household_member(household_id));
