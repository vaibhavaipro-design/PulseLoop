-- Migration 009: Add missing created_at column to signal_briefs, newsletters, dashboards
-- These tables were created without created_at, causing page queries to silently fail.

ALTER TABLE signal_briefs ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE newsletters    ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE dashboards     ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
