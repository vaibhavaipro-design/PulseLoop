-- 007_brand_voice_unique.sql
-- Add unique constraint on brand_voice_profiles.workspace_id
-- (one brand voice profile per workspace, enables upsert pattern)
ALTER TABLE brand_voice_profiles
  ADD CONSTRAINT brand_voice_profiles_workspace_id_key UNIQUE (workspace_id);
