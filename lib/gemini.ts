import 'server-only'
import { GoogleGenerativeAI, TaskType } from '@google/generative-ai'

// Lazily initialize Google AI to avoid build-time crashes if key is missing
function getEmbeddingModel() {
  const key = process.env.GEMINI_API_KEY
  if (!key || key.includes('placeholder')) {
    console.warn('GEMINI_API_KEY is missing or placeholder. Gemini features will not work.')
    return null
  }
  const genAI = new GoogleGenerativeAI(key)
  return genAI.getGenerativeModel(
    { model: 'gemini-embedding-001' },
    { apiVersion: 'v1' }
  )
}

/**
 * Generate a 768-dimension embedding vector from text for document storage.
 * Used in the scraping pipeline when storing new signals.
 */
export async function embedText(text: string): Promise<number[]> {
  const model = getEmbeddingModel()
  if (!model) throw new Error('GEMINI_MODEL_NOT_INITIALIZED')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await model.embedContent({
    content: { role: 'user', parts: [{ text }] },
    taskType: TaskType.RETRIEVAL_DOCUMENT,
    outputDimensionality: 768,
  } as any)
  return result.embedding.values
}

/**
 * Generate a 768-dimension embedding vector from a search query.
 * Used in the RAG pipeline when querying for relevant signals.
 */
export async function embedQuery(text: string): Promise<number[]> {
  const model = getEmbeddingModel()
  if (!model) throw new Error('GEMINI_MODEL_NOT_INITIALIZED')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await model.embedContent({
    content: { role: 'user', parts: [{ text }] },
    taskType: TaskType.RETRIEVAL_QUERY,
    outputDimensionality: 768,
  } as any)
  return result.embedding.values
}

/**
 * Batch embed multiple texts at once using batchEmbedContents.
 * More rate-limit friendly than Promise.all of individual calls.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const model = getEmbeddingModel()
  if (!model) throw new Error('GEMINI_MODEL_NOT_INITIALIZED')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await model.batchEmbedContents({
    requests: texts.map(t => ({
      content: { role: 'user', parts: [{ text: t }] },
      taskType: TaskType.RETRIEVAL_DOCUMENT,
      outputDimensionality: 768,
    })),
  } as any)
  return result.embeddings.map((e: any) => e.values)
}
