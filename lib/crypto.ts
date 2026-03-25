import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

// AES-256-GCM encryption for BYOK (Bring Your Own Key) — Agency plan
const ALGO = 'aes-256-gcm'
const KEY = Buffer.from(process.env.ENCRYPTION_SECRET!, 'hex')

/**
 * Encrypt a plaintext string (e.g., a user's API key).
 * Returns a colon-separated string: iv:authTag:ciphertext (all hex-encoded).
 */
export function encryptKey(plaintext: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGO, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv, tag, encrypted].map(b => b.toString('hex')).join(':')
}

/**
 * Decrypt a ciphertext string back to the original plaintext.
 * Input must be in the format: iv:authTag:ciphertext (all hex-encoded).
 */
export function decryptKey(ciphertext: string): string {
  const [ivHex, tagHex, encHex] = ciphertext.split(':')
  const decipher = createDecipheriv(ALGO, KEY, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return decipher.update(Buffer.from(encHex, 'hex')) + decipher.final('utf8')
}
