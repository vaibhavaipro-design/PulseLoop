import 'server-only'
import { supabaseAdmin } from './supabase/admin'
import { embedText, embedQuery } from './gemini'

/**
 * Query signals using RAG (Retrieval-Augmented Generation).
 * Embeds the query, then uses pgvector cosine similarity to find matching signals.
 * Workspace isolation is enforced at the SQL level.
 */
export async function ragQuery(
  workspaceId: string,
  nicheQuery: string,
  threshold = 0.65,
  count = 40
) {
  let embedding: number[]
  try {
    embedding = await embedQuery(nicheQuery)
  } catch (embeddingError) {
    // Embedding service unavailable — generate report without RAG context.
    // This happens when GEMINI_API_KEY is missing or invalid.
    console.warn('Embedding failed, falling back to zero-context generation:', embeddingError)
    return []
  }

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

const ZERO_EMBEDDING = new Array(768).fill(0)

/**
 * Batch embed and store multiple signals at once.
 * More efficient for the scraping pipeline.
 * Falls back to a zero vector if Gemini embeddings are unavailable —
 * signals are still stored and searchable by text, just not via RAG.
 */
export async function embedAndStoreBatch(signals: Array<{
  workspace_id: string
  niche_id: string
  text: string
  platform: string
  source_url: string
  signal_type: string
  signal_source?: string
  expires_at?: string
}>) {
  const embeddingResults = await Promise.allSettled(
    signals.map(s => embedText(s.text))
  )

  const failures = embeddingResults.filter(r => r.status === 'rejected')
  if (failures.length > 0) {
    const firstErr = (failures[0] as PromiseRejectedResult).reason
    console.error(`[embedAndStoreBatch] ${failures.length}/${signals.length} embeddings failed. First error:`, firstErr)
  }

  const defaultExpiry = new Date()
  defaultExpiry.setDate(defaultExpiry.getDate() + 90)

  const rows = signals.map((signal, i) => {
    const result = embeddingResults[i]
    const embedding = result.status === 'fulfilled' ? result.value : ZERO_EMBEDDING
    return {
      workspace_id: signal.workspace_id,
      niche_id: signal.niche_id,
      text: signal.text,
      platform: signal.platform,
      source_url: signal.source_url,
      signal_type: signal.signal_type,
      signal_source: signal.signal_source ?? 'public',
      embedding,
      expires_at: signal.expires_at ?? defaultExpiry.toISOString(),
      timestamp: new Date().toISOString(),
    }
  })

  const { error } = await supabaseAdmin.from('signals').upsert(rows)
  if (error) throw new Error(`Batch signal storage failed: ${error.message}`)
}
