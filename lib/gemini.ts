import 'server-only'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Lazily initialize Google AI to avoid build-time crashes if key is missing
function getEmbeddingModel() {
  const key = process.env.GEMINI_API_KEY
  if (!key || key.includes('placeholder')) {
    console.warn('GEMINI_API_KEY is missing or placeholder. Gemini features will not work.')
    return null
  }
  const genAI = new GoogleGenerativeAI(key)
  return genAI.getGenerativeModel(
    { model: 'text-embedding-004' },
    { apiVersion: 'v1beta' }
  )
}

/**
 * Generate a 768-dimension embedding vector from text.
 * Used in the RAG pipeline for both storing and querying signals.
 */
export async function embedText(text: string): Promise<number[]> {
  const model = getEmbeddingModel()
  if (!model) throw new Error('GEMINI_MODEL_NOT_INITIALIZED')
  
  const result = await model.embedContent(text)
  return result.embedding.values
}

/**
 * Batch embed multiple texts at once.
 * More efficient for bulk signal storage.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const model = getEmbeddingModel()
  if (!model) throw new Error('GEMINI_MODEL_NOT_INITIALIZED')

  const results = await Promise.all(
    texts.map(text => model.embedContent(text))
  )
  return results.map(r => r.embedding.values)
}

