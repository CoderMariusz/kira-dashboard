-- Migration: Add token tracking columns to bridge_runs
-- 2026-02-24: EPIC-5 fix — tokens were always null because sync script
-- didn't include metric_points data. These columns receive values from
-- the updated sync_bridge_to_supabase.py which now joins metric_points.

ALTER TABLE bridge_runs
  ADD COLUMN IF NOT EXISTS tokens_in  INTEGER,
  ADD COLUMN IF NOT EXISTS tokens_out INTEGER,
  ADD COLUMN IF NOT EXISTS cost_usd   NUMERIC(12, 6);

-- Index for cost/token queries (Models page analytics)
CREATE INDEX IF NOT EXISTS idx_bridge_runs_model_tokens
  ON bridge_runs (project_id, model, tokens_in)
  WHERE tokens_in IS NOT NULL;

COMMENT ON COLUMN bridge_runs.tokens_in  IS 'Input tokens for this run (from metric_points)';
COMMENT ON COLUMN bridge_runs.tokens_out IS 'Output tokens for this run (from metric_points)';
COMMENT ON COLUMN bridge_runs.cost_usd   IS 'Estimated USD cost (tokens × model pricing)';
