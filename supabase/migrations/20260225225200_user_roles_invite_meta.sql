-- Migration: Add invited_by and invited_at columns to user_roles table
-- Story: STORY-10.1

ALTER TABLE user_roles
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_user_roles_invited_by ON user_roles(invited_by);
