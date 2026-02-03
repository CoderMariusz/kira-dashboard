-- Kira Family Dashboard - Full Schema Migration
-- Run this in Supabase SQL Editor

-- ========================================
-- 1. ENUMS
-- ========================================

CREATE TYPE task_column AS ENUM (
  'idea',      -- Pomysły / Pomysł
  'plan',      -- Plan (tylko Praca)
  'doing',     -- W realizacji
  'done'       -- Zrobione
);

CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TYPE board_type AS ENUM ('home', 'work');

-- ========================================
-- 2. TABLES
-- ========================================

-- Households (rodziny/grupy)
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Moja Rodzina',
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles (users linked to households)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE SET NULL,
  display_name TEXT,
  avatar_url TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Boards (Dom, Praca)
CREATE TABLE boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type board_type NOT NULL,
  columns TEXT[] NOT NULL, -- ['idea', 'doing', 'done'] or ['idea', 'plan', 'doing', 'done']
  icon TEXT DEFAULT '📋',
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tasks (Kanban cards)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  column task_column NOT NULL DEFAULT 'idea',
  priority task_priority DEFAULT 'medium',
  position INT DEFAULT 0,
  due_date DATE,
  labels TEXT[] DEFAULT '{}',
  subtasks JSONB DEFAULT '[]', -- [{id, text, done}]
  assigned_to UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Shopping Lists
CREATE TABLE shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Lista Zakupów',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Shopping Categories
CREATE TABLE shopping_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📦',
  color TEXT DEFAULT '#6366f1',
  position INT DEFAULT 0,
  is_default BOOLEAN DEFAULT false, -- system categories
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Shopping Items
CREATE TABLE shopping_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  category_id UUID REFERENCES shopping_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  quantity TEXT,
  store TEXT,
  is_bought BOOLEAN DEFAULT false,
  bought_by UUID REFERENCES profiles(id),
  bought_at TIMESTAMPTZ,
  added_by UUID REFERENCES profiles(id),
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Activity Log
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id),
  actor_name TEXT, -- for Kira or system actions
  action TEXT NOT NULL, -- 'task_created', 'task_moved', 'shopping_added', etc.
  entity_type TEXT NOT NULL, -- 'task', 'shopping_item', etc.
  entity_id UUID,
  entity_name TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- 3. INDEXES
-- ========================================

CREATE INDEX idx_profiles_household ON profiles(household_id);
CREATE INDEX idx_boards_household ON boards(household_id);
CREATE INDEX idx_tasks_board ON tasks(board_id);
CREATE INDEX idx_tasks_column ON tasks(column);
CREATE INDEX idx_tasks_position ON tasks(board_id, column, position);
CREATE INDEX idx_shopping_lists_household ON shopping_lists(household_id);
CREATE INDEX idx_shopping_items_list ON shopping_items(list_id);
CREATE INDEX idx_shopping_items_category ON shopping_items(category_id);
CREATE INDEX idx_shopping_categories_household ON shopping_categories(household_id);
CREATE INDEX idx_activity_log_household ON activity_log(household_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);

-- ========================================
-- 4. HELPER FUNCTIONS
-- ========================================

-- Get current user's household ID
CREATE OR REPLACE FUNCTION get_my_household_id()
RETURNS UUID AS $$
  SELECT household_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ========================================
-- 5. TRIGGERS
-- ========================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_households_updated_at
  BEFORE UPDATE ON households
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_boards_updated_at
  BEFORE UPDATE ON boards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_shopping_lists_updated_at
  BEFORE UPDATE ON shopping_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_shopping_items_updated_at
  BEFORE UPDATE ON shopping_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-set completed_at when task moves to 'done'
CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.column = 'done' AND (OLD.column IS NULL OR OLD.column != 'done') THEN
    NEW.completed_at = now();
  ELSIF NEW.column != 'done' AND OLD.column = 'done' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_tasks_completed_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_task_completed_at();

-- Auto-set bought_at when item is marked as bought
CREATE OR REPLACE FUNCTION set_shopping_bought_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_bought = true AND (OLD.is_bought IS NULL OR OLD.is_bought = false) THEN
    NEW.bought_at = now();
    NEW.bought_by = COALESCE(NEW.bought_by, auth.uid());
  ELSIF NEW.is_bought = false AND OLD.is_bought = true THEN
    NEW.bought_at = NULL;
    NEW.bought_by = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_shopping_items_bought_at
  BEFORE UPDATE ON shopping_items
  FOR EACH ROW EXECUTE FUNCTION set_shopping_bought_at();

-- ========================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ========================================

ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Households: only members can see/edit their household
CREATE POLICY "Users can view their household"
  ON households FOR SELECT
  USING (id = get_my_household_id());

CREATE POLICY "Users can update their household"
  ON households FOR UPDATE
  USING (id = get_my_household_id());

-- Profiles: users can see household members, edit own
CREATE POLICY "Users can view household profiles"
  ON profiles FOR SELECT
  USING (household_id = get_my_household_id() OR id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Boards: household members only
CREATE POLICY "Users can view household boards"
  ON boards FOR SELECT
  USING (household_id = get_my_household_id());

CREATE POLICY "Users can manage household boards"
  ON boards FOR ALL
  USING (household_id = get_my_household_id());

-- Tasks: through board → household
CREATE POLICY "Users can view household tasks"
  ON tasks FOR SELECT
  USING (board_id IN (SELECT id FROM boards WHERE household_id = get_my_household_id()));

CREATE POLICY "Users can manage household tasks"
  ON tasks FOR ALL
  USING (board_id IN (SELECT id FROM boards WHERE household_id = get_my_household_id()));

-- Shopping Lists: household members only
CREATE POLICY "Users can view household shopping lists"
  ON shopping_lists FOR SELECT
  USING (household_id = get_my_household_id());

CREATE POLICY "Users can manage household shopping lists"
  ON shopping_lists FOR ALL
  USING (household_id = get_my_household_id());

-- Shopping Categories: household + defaults
CREATE POLICY "Users can view categories"
  ON shopping_categories FOR SELECT
  USING (household_id = get_my_household_id() OR is_default = true);

CREATE POLICY "Users can manage household categories"
  ON shopping_categories FOR ALL
  USING (household_id = get_my_household_id() AND is_default = false);

-- Shopping Items: through list → household
CREATE POLICY "Users can view household shopping items"
  ON shopping_items FOR SELECT
  USING (list_id IN (SELECT id FROM shopping_lists WHERE household_id = get_my_household_id()));

CREATE POLICY "Users can manage household shopping items"
  ON shopping_items FOR ALL
  USING (list_id IN (SELECT id FROM shopping_lists WHERE household_id = get_my_household_id()));

-- Activity Log: household members only
CREATE POLICY "Users can view household activity"
  ON activity_log FOR SELECT
  USING (household_id = get_my_household_id());

CREATE POLICY "Users can insert household activity"
  ON activity_log FOR INSERT
  WITH CHECK (household_id = get_my_household_id());

-- ========================================
-- 7. ENABLE REALTIME
-- ========================================

ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE shopping_items;
ALTER PUBLICATION supabase_realtime ADD TABLE shopping_categories;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;

-- ========================================
-- 8. DEFAULT SHOPPING CATEGORIES
-- ========================================

INSERT INTO shopping_categories (name, icon, color, position, is_default) VALUES
  ('Owoce i Warzywa', '🥬', '#22c55e', 1, true),
  ('Nabiał', '🥛', '#3b82f6', 2, true),
  ('Pieczywo', '🍞', '#f59e0b', 3, true),
  ('Mięso i Ryby', '🥩', '#ef4444', 4, true),
  ('Napoje', '🥤', '#8b5cf6', 5, true),
  ('Słodycze', '🍫', '#ec4899', 6, true),
  ('Chemia', '🧴', '#06b6d4', 7, true),
  ('Mrożonki', '🧊', '#64748b', 8, true),
  ('Inne', '📦', '#6366f1', 99, true);

-- ========================================
-- DONE!
-- ========================================
