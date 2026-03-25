import 'server-only'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

// Fallback for local development when keys are not configured
const isLocalPlaceholder = process.env.UPSTASH_REDIS_REST_URL?.includes('placeholder')

const mockLimiter = {
  limit: async (ip: string) => {
    console.log(`[MOCK RATELIMIT] Allowed: ${ip}`)
    return { success: true }
  }
}

// Per-user: 10 AI requests per minute
export const userRatelimit = isLocalPlaceholder ? mockLimiter : new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'rl:user',
})

// Per-IP: 20 requests per minute
export const ipRatelimit = isLocalPlaceholder ? mockLimiter : new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  prefix: 'rl:ip',
})

// Per-IP: signup abuse protection
export const signupRatelimit = isLocalPlaceholder ? mockLimiter : new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  prefix: 'rl:signup',
})
