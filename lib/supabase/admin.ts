import 'server-only'
import { createClient } from '@supabase/supabase-js'

// lib/supabase/admin.ts — SERVICE ROLE client
// Use ONLY for:
// 1. Writing to subscriptions table (webhook handler)
// 2. Writing to usage_logs (via rpc call only)
// 3. Writing to signals (scraping pipeline)
// 4. Writing to trend_reports, briefs, newsletters (generation pipeline)
// 5. Storage operations
// NEVER for reading user data in user-facing routes — use server client instead

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
