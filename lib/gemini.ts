import 'server-only'

const GEMINI_EMBED_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent'
const GEMINI_BATCH_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents'

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY
  if (!key || key.includes('placeholder')) {
    throw new Error('GEMINI_MODEL_NOT_INITIALIZED')
  }
  return key
}

/**
 * Generate a 768-dimension embedding vector from text for document storage.
 * Used in the scraping pipeline when storing new signals.
 */
export async function embedText(text: string): Promise<number[]> {
  const key = getApiKey()

  try {
    const response = await fetch(`${GEMINI_EMBED_URL}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_DOCUMENT',
        outputDimensionality: 768,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Gemini API Error ${response.status}: ${errText}`)
    }

    const data = await response.json()
    return data.embedding.values

  } catch (error: any) {
    console.error('[embedText] Fetch exception:', error.message)
    throw error
  }
}

/**
 * Generate a 768-dimension embedding vector from a search query.
 * Used in the RAG pipeline when querying for relevant signals.
 */
export async function embedQuery(text: string): Promise<number[]> {
  const key = getApiKey()

  try {
    const response = await fetch(`${GEMINI_EMBED_URL}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_QUERY',
        outputDimensionality: 768,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Gemini API Error ${response.status}: ${errText}`)
    }

    const data = await response.json()
    return data.embedding.values

  } catch (error: any) {
    console.error('[embedQuery] Fetch exception:', error.message)
    throw error
  }
}

/**
 * Batch embed multiple texts at once using batchEmbedContents.
 * More rate-limit friendly than individual embedText calls.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const key = getApiKey()

  try {
    const response = await fetch(`${GEMINI_BATCH_URL}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: texts.map(text => ({
          model: 'models/gemini-embedding-001',
          content: { parts: [{ text }] },
          taskType: 'RETRIEVAL_DOCUMENT',
          outputDimensionality: 768,
        })),
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Gemini API Error ${response.status}: ${errText}`)
    }

    const data = await response.json()
    return data.embeddings.map((e: { values: number[] }) => e.values)

  } catch (error: any) {
    console.error('[embedBatch] Fetch exception:', error.message)
    throw error
  }
}
