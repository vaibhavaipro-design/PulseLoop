import 'server-only'
import { cache } from 'react'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * React.cache() deduplicates calls within a single render tree (per-request).
 * Both the layout and child pages can call these functions — only the first
 * caller triggers a real network round-trip; subsequent callers get the
 * memoised result for free.
 */

export const getUser = cache(async () => {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

export const getWorkspace = cache(async (userId: string) => {
  const supabase = createSupabaseServerClient()
  const { data: rows } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
  return rows?.[0] ?? null
})

export const getSubscription = cache(async (workspaceId: string) => {
  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('plan, trial_ends_at')
    .eq('workspace_id', workspaceId)
    .single()
  return data
})
