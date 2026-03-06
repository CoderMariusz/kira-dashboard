-- Home module tables
CREATE TABLE shopping_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Inne',
  quantity INTEGER DEFAULT 1,
  unit TEXT,
  bought BOOLEAN DEFAULT FALSE,
  bought_at TIMESTAMPTZ,
  added_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  column_id TEXT DEFAULT 'todo' CHECK (column_id IN ('todo','doing','done')),
  assigned_to TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  due_date DATE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE activity_log (
  id BIGSERIAL PRIMARY KEY,
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT CHECK (entity_type IN ('shopping','task','user','system')),
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bridge sync tables
CREATE TABLE bridge_stories (
  id TEXT PRIMARY KEY,
  epic_id TEXT,
  title TEXT,
  status TEXT,
  domain TEXT,
  model TEXT,
  project_key TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bridge_runs (
  id TEXT PRIMARY KEY,
  story_id TEXT REFERENCES bridge_stories(id),
  model TEXT,
  status TEXT,
  duration_seconds REAL,
  tokens_in INTEGER,
  tokens_out INTEGER,
  cost_usd REAL,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_shopping_bought ON shopping_items(bought);
CREATE INDEX idx_tasks_column ON tasks(column_id);
CREATE INDEX idx_activity_created ON activity_log(created_at DESC);
CREATE INDEX idx_bridge_stories_project ON bridge_stories(project_key);
CREATE INDEX idx_bridge_runs_story ON bridge_runs(story_id);

-- Updated_at auto-trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shopping_updated BEFORE UPDATE ON shopping_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tasks_updated BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
