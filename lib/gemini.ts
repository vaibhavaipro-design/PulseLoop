import 'server-only'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Gemini 2.5 Flash-Lite for embeddings — free tier, server-only
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' })

/**
 * Generate a 1536-dimension embedding vector from text.
 * Used in the RAG pipeline for both storing and querying signals.
 */
export async function embedText(text: string): Promise<number[]> {
  const result = await embeddingModel.embedContent(text)
  return result.embedding.values
}

/**
 * Batch embed multiple texts at once.
 * More efficient for bulk signal storage.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const results = await Promise.all(
    texts.map(text => embeddingModel.embedContent(text))
  )
  return results.map(r => r.embedding.values)
}
