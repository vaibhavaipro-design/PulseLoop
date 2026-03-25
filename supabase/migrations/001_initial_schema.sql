-- 001_initial_schema.sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- workspaces: user-editable fields only
CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'My Workspace',
  created_at timestamptz DEFAULT now()
);

-- subscriptions: service role writes only
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'trial'
    CHECK (plan IN ('trial', 'starter', 'pro', 'agency')),
  trial_ends_at timestamptz,
  lemon_squeezy_customer_id text,
  lemon_squeezy_subscription_id text,
  updated_at timestamptz DEFAULT now()
);

-- brand_voice_profiles
CREATE TABLE brand_voice_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  content text NOT NULL,
  source text DEFAULT 'generated',
  updated_at timestamptz DEFAULT now()
);

-- niches
CREATE TABLE niches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  is_active boolean DEFAULT true,
  last_scraped_at timestamptz
);

-- signals: the core intelligence store
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

-- trend_reports
CREATE TABLE trend_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  niche_id uuid REFERENCES niches(id),
  title text,
  content_md text,
  source_health jsonb,
  created_at timestamptz DEFAULT now()
);

-- signal_briefs
CREATE TABLE signal_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  trend_report_id uuid REFERENCES trend_reports(id),
  content_md text,
  share_id text UNIQUE DEFAULT gen_random_uuid()::text,
  share_active boolean DEFAULT false
);

-- newsletters
CREATE TABLE newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  trend_report_id uuid REFERENCES trend_reports(id),
  content_md text,
  content_html text,
  subject_lines jsonb,
  angle text
);

-- linkedin_posts
CREATE TABLE linkedin_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  newsletter_id uuid REFERENCES newsletters(id),
  variants jsonb
);

-- dashboards
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

-- usage_logs: service role writes only
CREATE TABLE usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  month text NOT NULL,            -- 'YYYY-MM'
  count integer NOT NULL DEFAULT 0,
  UNIQUE (workspace_id, action_type, month)
);
