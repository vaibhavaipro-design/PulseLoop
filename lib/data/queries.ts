import 'server-only'
import { cache } from 'react'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * React.cache() deduplicates calls within a single render tree (per-request).
 * Layout + page can call the same cached function; only the first caller hits
 * the database. Subsequent callers receive the memoised result at zero cost.
 */

export const getUser = cache(async () => {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

/**
 * Returns the primary workspace AND its subscription in a single DB round-trip
 * via a Supabase join. Use this in any page that only needs the first workspace
 * (layout, overview, newsletters, brand-voice, sources, settings, dashboards).
 */
export const getWorkspaceWithSub = cache(async (userId: string) => {
  const { data: rows } = await supabaseAdmin
    .from('workspaces')
    .select('id, name, subscriptions(plan, trial_ends_at)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)

  const row = rows?.[0] ?? null
  if (!row) return { workspace: null, subscription: null }

  // Supabase returns the related rows as an array (one-to-many FK direction)
  const subs = row.subscriptions as unknown
  const sub = Array.isArray(subs) ? (subs[0] ?? null) : (subs ?? null)

  return {
    workspace: { id: row.id as string, name: row.name as string },
    subscription: sub as { plan: string; trial_ends_at: string | null } | null,
  }
})

/**
 * Returns ALL workspaces for the user. Use this in pages that show a workspace
 * switcher (niches, reports, signal-briefs). The subscription for the primary
 * workspace can then be fetched via getSubscription() in parallel with other
 * page data.
 */
export const getAllWorkspaces = cache(async (userId: string) => {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('user_id', userId)
    .order('created_at')
  return (data ?? []) as { id: string; name: string }[]
})

/**
 * Cached subscription lookup by workspace ID. Safe to call in parallel with
 * other page queries once you have the workspace ID.
 */
export const getSubscription = cache(async (workspaceId: string) => {
  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('plan, trial_ends_at')
    .eq('workspace_id', workspaceId)
    .single()
  return data as { plan: string; trial_ends_at: string | null } | null
})
