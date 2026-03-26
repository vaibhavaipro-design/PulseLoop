-- Migration 008: Fix embedding column from vector(1536) to vector(768)
-- text-embedding-004 and embedding-001 both produce 768-dim vectors, not 1536.

-- Drop the ivfflat index before altering the column type
DROP INDEX IF EXISTS signals_embedding_idx;

-- Truncate existing signals since old embeddings (if any) are wrong dimensions
TRUNCATE TABLE signals;

-- Alter embedding column to correct dimension
ALTER TABLE signals ALTER COLUMN embedding TYPE vector(768);

-- Recreate the index
CREATE INDEX ON signals USING ivfflat (embedding vector_cosine_ops);

-- Drop and recreate match_signals function with correct vector dimension
DROP FUNCTION IF EXISTS match_signals(vector, float, int, uuid);

CREATE OR REPLACE FUNCTION match_signals(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_workspace_id uuid
)
RETURNS TABLE (
  id uuid,
  workspace_id uuid,
  niche_id uuid,
  text text,
  platform text,
  source_url text,
  signal_type text,
  signal_source text,
  signal_timestamp timestamptz,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    signals.id,
    signals.workspace_id,
    signals.niche_id,
    signals.text,
    signals.platform,
    signals.source_url,
    signals.signal_type,
    signals.signal_source,
    signals.timestamp,
    1 - (signals.embedding <=> query_embedding) AS similarity
  FROM signals
  WHERE signals.workspace_id = p_workspace_id
    AND signals.expires_at > now()
    AND 1 - (signals.embedding <=> query_embedding) > match_threshold
  ORDER BY signals.embedding <=> query_embedding
  LIMIT match_count;
$$;
