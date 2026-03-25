-- 003_functions.sql

-- match_signals: RAG query function using pgvector cosine similarity
-- Used by lib/rag.ts to find relevant signals for a workspace
CREATE OR REPLACE FUNCTION match_signals(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_workspace_id uuid
)
RETURNS TABLE (id uuid, text text, platform text, similarity float)
LANGUAGE sql STABLE
AS $$
  SELECT signals.id, signals.text, signals.platform,
    1 - (signals.embedding <=> query_embedding) AS similarity
  FROM signals
  WHERE workspace_id = p_workspace_id
    AND 1 - (signals.embedding <=> query_embedding) > match_threshold
  ORDER BY signals.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- increment_usage: SECURITY DEFINER means runs as owner, not caller
-- Users cannot bypass this — they can never directly write to usage_logs
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

-- Schedule nightly cleanup via pg_cron
SELECT cron.schedule(
  'nightly-signal-cleanup',
  '0 2 * * *',
  $$DELETE FROM signals WHERE expires_at < NOW()$$
);
