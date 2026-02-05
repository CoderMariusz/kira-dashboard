-- Epic 7: Advanced Features - Migration
-- Tables: household_invites, labels, task_labels

-- ========================================
-- 1. ENUM: invite_status
-- ========================================
DO $$ BEGIN
  CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'rejected', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ========================================
-- 2. TABLE: labels
-- ========================================
CREATE TABLE IF NOT EXISTS labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(household_id, name)
);

-- ========================================
-- 3. TABLE: task_labels (junction)
-- ========================================
CREATE TABLE IF NOT EXISTS task_labels (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  PRIMARY KEY (task_id, label_id)
);

-- ========================================
-- 4. TABLE: household_invites
-- ========================================
CREATE TABLE IF NOT EXISTS household_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES profiles(id),
  status invite_status NOT NULL DEFAULT 'pending',
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ
);

-- ========================================
-- 5. RLS: labels
-- ========================================
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "labels_select" ON labels
  FOR SELECT USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "labels_insert" ON labels
  FOR INSERT WITH CHECK (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "labels_update" ON labels
  FOR UPDATE USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "labels_delete" ON labels
  FOR DELETE USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );

-- ========================================
-- 6. RLS: task_labels
-- ========================================
ALTER TABLE task_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_labels_select" ON task_labels
  FOR SELECT USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN boards b ON t.board_id = b.id
      JOIN profiles p ON b.household_id = p.household_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "task_labels_insert" ON task_labels
  FOR INSERT WITH CHECK (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN boards b ON t.board_id = b.id
      JOIN profiles p ON b.household_id = p.household_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "task_labels_delete" ON task_labels
  FOR DELETE USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN boards b ON t.board_id = b.id
      JOIN profiles p ON b.household_id = p.household_id
      WHERE p.id = auth.uid()
    )
  );

-- ========================================
-- 7. RLS: household_invites
-- ========================================
ALTER TABLE household_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invites_select" ON household_invites
  FOR SELECT USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "invites_insert" ON household_invites
  FOR INSERT WITH CHECK (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "invites_update" ON household_invites
  FOR UPDATE USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );

-- ========================================
-- 8. INDEXES
-- ========================================
CREATE INDEX IF NOT EXISTS idx_labels_household ON labels(household_id);
CREATE INDEX IF NOT EXISTS idx_task_labels_task ON task_labels(task_id);
CREATE INDEX IF NOT EXISTS idx_task_labels_label ON task_labels(label_id);
CREATE INDEX IF NOT EXISTS idx_invites_household ON household_invites(household_id);
CREATE INDEX IF NOT EXISTS idx_invites_token ON household_invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_email ON household_invites(email);

-- ========================================
-- 9. REALTIME
-- ========================================
ALTER PUBLICATION supabase_realtime ADD TABLE labels;
ALTER PUBLICATION supabase_realtime ADD TABLE task_labels;
