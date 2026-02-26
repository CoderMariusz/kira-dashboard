-- STORY-12.13: Enable Supabase Realtime for bridge_stories and bridge_runs tables.
-- The default publication 'supabase_realtime' must include these tables
-- for postgres_changes subscriptions to fire.
--
-- RLS (SELECT) is already configured from STORY-12.1 migrations.
-- These statements are idempotent: ADD TABLE is a no-op if already present.

ALTER PUBLICATION supabase_realtime ADD TABLE bridge_stories;
ALTER PUBLICATION supabase_realtime ADD TABLE bridge_runs;
