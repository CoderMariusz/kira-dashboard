-- Migration: NightClaw tables for digest, research, and skills diff tracking
-- Created: 2026-02-26
-- Story: STORY-12.2

-- ─── nightclaw_digests ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nightclaw_digests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date       DATE NOT NULL UNIQUE,    -- one per day
  content_md     TEXT NOT NULL,           -- raw markdown digest
  summary        TEXT,                    -- 3-5 sentences summary
  stories_done   INT NOT NULL DEFAULT 0,
  stories_failed INT NOT NULL DEFAULT 0,
  models_used    TEXT[],                  -- ['kimi-k2.5', 'sonnet-4.6']
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── nightclaw_research ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nightclaw_research (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,     -- 'anti-pattern-date-extraction-research'
  title       TEXT NOT NULL,
  problem     TEXT NOT NULL,
  solution    TEXT,                     -- NULL if pending
  source_url  TEXT,
  status      TEXT NOT NULL DEFAULT 'pending', -- pending|applied|skipped
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── nightclaw_skills_diff ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nightclaw_skills_diff (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date       DATE NOT NULL,
  skill_name     TEXT NOT NULL,         -- 'kira-orchestrator'
  skill_path     TEXT NOT NULL,         -- 'skills/kira-orchestrator/SKILL.md'
  diff_content   TEXT NOT NULL,         -- raw git diff
  lines_added    INT NOT NULL DEFAULT 0,
  lines_removed  INT NOT NULL DEFAULT 0,
  modified_at    TIMESTAMPTZ NOT NULL,  -- from git log
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(run_date, skill_name)
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_nightclaw_digests_date    ON nightclaw_digests(run_date DESC);
CREATE INDEX IF NOT EXISTS idx_nightclaw_research_status ON nightclaw_research(status);
CREATE INDEX IF NOT EXISTS idx_nightclaw_skills_date     ON nightclaw_skills_diff(run_date DESC);

-- ─── RLS Policies ─────────────────────────────────────────────────────────────
-- Enable RLS on all tables
ALTER TABLE nightclaw_digests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE nightclaw_research    ENABLE ROW LEVEL SECURITY;
ALTER TABLE nightclaw_skills_diff ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all nightclaw data
CREATE POLICY "auth_read_digests"     ON nightclaw_digests    FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_research"    ON nightclaw_research   FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_skills_diff" ON nightclaw_skills_diff FOR SELECT TO authenticated USING (true);

-- Note: Writes are restricted to service_role only (no policies = no access for authenticated)
