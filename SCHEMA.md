# SCHEMA.md — PulseLoop Database Schema & Environment Variables

> Run migrations in order: 001 → 002 → 003 → 004

---

## 001_initial_schema.sql

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'My Workspace',
  created_at timestamptz DEFAULT now()
);

-- service role writes only
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial', 'starter', 'pro', 'agency')),
  trial_ends_at timestamptz,
  lemon_squeezy_customer_id text,
  lemon_squeezy_subscription_id text,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE brand_voice_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  content text NOT NULL,
  source text DEFAULT 'generated',
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE niches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  is_active boolean DEFAULT true,
  last_scraped_at timestamptz
);

-- core intelligence store
CREATE TABLE signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  niche_id uuid REFERENCES niches(id) ON DELETE CASCADE,
  text text NOT NULL,
  embedding vector(1536),
  signal_type text DEFAULT 'trend',
  signal_source text DEFAULT 'public',
  platform text,
  source_url text,
  timestamp timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX ON signals USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX ON signals (workspace_id, niche_id, expires_at);

CREATE TABLE trend_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  niche_id uuid REFERENCES niches(id),
  title text,
  content_md text,
  source_health jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE signal_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  trend_report_id uuid REFERENCES trend_reports(id),
  content_md text,
  share_id text UNIQUE DEFAULT gen_random_uuid()::text,
  share_active boolean DEFAULT false
);

CREATE TABLE newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  trend_report_id uuid REFERENCES trend_reports(id),
  content_md text,
  content_html text,
  subject_lines jsonb,
  angle text
);

CREATE TABLE linkedin_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  newsletter_id uuid REFERENCES newsletters(id),
  variants jsonb
);

CREATE TABLE dashboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  trend_report_id uuid REFERENCES trend_reports(id),
  share_id text UNIQUE DEFAULT gen_random_uuid()::text,
  share_active boolean DEFAULT false,
  dashboard_json jsonb,
  style text,
  template text
);

-- service role writes only
CREATE TABLE usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  month text NOT NULL,   -- 'YYYY-MM'
  count integer NOT NULL DEFAULT 0,
  UNIQUE (workspace_id, action_type, month)
);
```

---

## 002_rls_policies.sql

```sql
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

CREATE POLICY "ws_read"   ON workspaces FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "ws_insert" ON workspaces FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "ws_update" ON workspaces FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- subscriptions: READ ONLY for users — NO INSERT/UPDATE/DELETE (service role only)
CREATE POLICY "sub_read" ON subscriptions FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

CREATE POLICY "bvp_all" ON brand_voice_profiles FOR ALL
  USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

CREATE POLICY "niches_all" ON niches FOR ALL
  USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

-- signals: READ ONLY (service role writes via scraping pipeline)
CREATE POLICY "signals_read" ON signals FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

CREATE POLICY "reports_read" ON trend_reports FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

CREATE POLICY "briefs_read_own"    ON signal_briefs FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
CREATE POLICY "briefs_read_public" ON signal_briefs FOR SELECT USING (share_active = true);
CREATE POLICY "briefs_update_share" ON signal_briefs FOR UPDATE
  USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

CREATE POLICY "newsletters_read" ON newsletters FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

CREATE POLICY "linkedin_read" ON linkedin_posts FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

CREATE POLICY "dash_read_own"    ON dashboards FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
CREATE POLICY "dash_read_public" ON dashboards FOR SELECT USING (share_active = true);
CREATE POLICY "dash_update_share" ON dashboards FOR UPDATE
  USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

-- usage_logs: READ ONLY — NO INSERT/UPDATE/DELETE (increment_usage function only)
CREATE POLICY "usage_read" ON usage_logs FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
```

---

## 003_functions.sql

```sql
-- SECURITY DEFINER: runs as owner, not caller — users cannot bypass
CREATE OR REPLACE FUNCTION increment_usage(
  p_workspace_id uuid,
  p_action_type text,
  p_month text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO usage_logs (workspace_id, action_type, month, count)
  VALUES (p_workspace_id, p_action_type, p_month, 1)
  ON CONFLICT (workspace_id, action_type, month)
  DO UPDATE SET count = usage_logs.count + 1;
END;
$$;

SELECT cron.schedule(
  'nightly-signal-cleanup',
  '0 2 * * *',
  $$DELETE FROM signals WHERE expires_at < NOW()$$
);
```

---

## 004_storage.sql

```sql
-- Run after creating 'reports' bucket in Supabase dashboard (set as PRIVATE)
CREATE POLICY "storage_own_files" ON storage.objects
FOR ALL USING (
  bucket_id = 'reports'
  AND auth.uid()::text = (storage.foldername(name))[1]
) WITH CHECK (
  bucket_id = 'reports'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## Environment Variables

```bash
# ── SAFE FOR FRONTEND ─────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# ── SERVER-SIDE ONLY — never NEXT_PUBLIC_ ────────────────────────
SUPABASE_SERVICE_ROLE_KEY=          # bypasses ALL RLS
ANTHROPIC_API_KEY=                  # sk-ant-...
GEMINI_API_KEY=                     # AIza...
LEMON_SQUEEZY_API_KEY=
LEMON_SQUEEZY_WEBHOOK_SECRET=
LS_VARIANT_STARTER=
LS_VARIANT_PRO=
LS_VARIANT_AGENCY=
RESEND_API_KEY=                     # re_...
SERPAPI_KEY=
OPENAI_API_KEY=                     # optional in beta
CRON_SECRET=                        # openssl rand -hex 32
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
ENCRYPTION_SECRET=                  # openssl rand -hex 32
```

---

*PulseLoop · SCHEMA.md · March 2026*
