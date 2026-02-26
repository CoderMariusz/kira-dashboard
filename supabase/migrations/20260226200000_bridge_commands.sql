-- STORY-12.9: Bridge Commands Table
-- Queue for async write operations when Bridge is not directly accessible (Vercel)
-- Bridge polls this table and executes commands locally

CREATE TABLE IF NOT EXISTS bridge_commands (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  TEXT NOT NULL DEFAULT 'kira-dashboard',
  story_id    TEXT NOT NULL,
  command     TEXT NOT NULL,     -- 'advance' | 'start'
  payload     JSONB NOT NULL DEFAULT '{}',   -- {"status": "REVIEW"} | {}
  status      TEXT NOT NULL DEFAULT 'pending',  -- pending|processing|completed|failed
  result      JSONB,            -- output po wykonaniu
  error       TEXT,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Status constraint
ALTER TABLE bridge_commands DROP CONSTRAINT IF EXISTS bridge_commands_status_check;
ALTER TABLE bridge_commands ADD CONSTRAINT bridge_commands_status_check
  CHECK (status IN ('pending', 'processing', 'completed', 'failed'));

-- Command constraint
ALTER TABLE bridge_commands DROP CONSTRAINT IF EXISTS bridge_commands_command_check;
ALTER TABLE bridge_commands ADD CONSTRAINT bridge_commands_command_check
  CHECK (command IN ('advance', 'start'));

-- Index for Bridge polling (pending commands ordered by creation time)
CREATE INDEX IF NOT EXISTS bridge_commands_pending_idx
  ON bridge_commands (status, created_at)
  WHERE status = 'pending';

-- Enable RLS
ALTER TABLE bridge_commands ENABLE ROW LEVEL SECURITY;

-- ADMIN can read/write all commands
DROP POLICY IF EXISTS "admin_all_commands" ON bridge_commands;
CREATE POLICY "admin_all_commands" ON bridge_commands
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );
