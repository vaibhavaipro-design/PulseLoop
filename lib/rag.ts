import 'server-only'
import { supabaseAdmin } from './supabase/admin'
import { embedText } from './gemini'

/**
 * Query signals using RAG (Retrieval-Augmented Generation).
 * Embeds the query, then uses pgvector cosine similarity to find matching signals.
 * Workspace isolation is enforced at the SQL level.
 */
export async function ragQuery(
  workspaceId: string,
  nicheQuery: string,
  threshold = 0.78,
  count = 10
) {
  const embedding = await embedText(nicheQuery)

  const { data: signals, error } = await supabaseAdmin.rpc('match_signals', {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: count,
    p_workspace_id: workspaceId,   // ← workspace isolation enforced at SQL level
  })

  if (error) throw new Error(`RAG query failed: ${error.message}`)
  return signals ?? []
}

/**
 * Embed a signal and store it in the database.
 * Used by the scraping pipeline to store new signals.
 * 90-day rolling window — signals auto-expire.
 */
export async function embedAndStore(signal: {
  workspace_id: string
  niche_id: string
  text: string
  platform: string
  source_url: string
  signal_type: string
  signal_source?: string
}) {
  const embedding = await embedText(signal.text)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 90)  // 90-day rolling window

  const { error } = await supabaseAdmin.from('signals').upsert({
    ...signal,
    signal_source: signal.signal_source ?? 'public',
    embedding,
    expires_at: expiresAt.toISOString(),
    timestamp: new Date().toISOString(),
  })

  if (error) throw new Error(`Signal storage failed: ${error.message}`)
}

/**
 * Batch embed and store multiple signals at once.
 * More efficient for the scraping pipeline.
 */
export async function embedAndStoreBatch(signals: Array<{
  workspace_id: string
  niche_id: string
  text: string
  platform: string
  source_url: string
  signal_type: string
  signal_source?: string
}>) {
  const embeddings = await Promise.all(
    signals.map(s => embedText(s.text))
  )

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 90)

  const rows = signals.map((signal, i) => ({
    ...signal,
    signal_source: signal.signal_source ?? 'public',
    embedding: embeddings[i],
    expires_at: expiresAt.toISOString(),
    timestamp: new Date().toISOString(),
  }))

  const { error } = await supabaseAdmin.from('signals').upsert(rows)
  if (error) throw new Error(`Batch signal storage failed: ${error.message}`)
}
