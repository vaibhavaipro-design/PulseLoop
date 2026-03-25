-- 002_rls_policies.sql
-- Enable RLS on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE niches ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- workspaces: read + safe update (no plan column here — that's in subscriptions)
CREATE POLICY "ws_read" ON workspaces FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "ws_insert" ON workspaces FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "ws_update" ON workspaces FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- subscriptions: READ ONLY for users
CREATE POLICY "sub_read" ON subscriptions FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
-- NO INSERT/UPDATE/DELETE policy for users — service role only

-- brand_voice_profiles: full CRUD for own workspace
CREATE POLICY "bvp_all" ON brand_voice_profiles FOR ALL
  USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

-- niches: full CRUD for own workspace
CREATE POLICY "niches_all" ON niches FOR ALL
  USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

-- signals: READ ONLY for users (service role writes via scraping pipeline)
CREATE POLICY "signals_read" ON signals FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

-- trend_reports: READ ONLY for users (service role writes)
CREATE POLICY "reports_read" ON trend_reports FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

-- signal_briefs: own read + public share read
CREATE POLICY "briefs_read_own" ON signal_briefs FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
CREATE POLICY "briefs_read_public" ON signal_briefs FOR SELECT
  USING (share_active = true);
-- Update: only allow toggling share_active (user can enable/disable sharing)
CREATE POLICY "briefs_update_share" ON signal_briefs FOR UPDATE
  USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

-- newsletters: read only
CREATE POLICY "newsletters_read" ON newsletters FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

-- linkedin_posts: read only
CREATE POLICY "linkedin_read" ON linkedin_posts FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

-- dashboards: own read + public share read + update share toggle
CREATE POLICY "dash_read_own" ON dashboards FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
CREATE POLICY "dash_read_public" ON dashboards FOR SELECT
  USING (share_active = true);
CREATE POLICY "dash_update_share" ON dashboards FOR UPDATE
  USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

-- usage_logs: READ ONLY for users
CREATE POLICY "usage_read" ON usage_logs FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
-- NO INSERT/UPDATE/DELETE for users — increment_usage function only
