import Topbar from '@/components/layout/Topbar'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import type { Plan } from '@/lib/plans'
import SourcesClient from './SourcesClient'

export default async function SourcesPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('user_id', user.id)
    .order('created_at')

  const primaryWorkspace = workspaces?.[0]

  const { data: subscription } = primaryWorkspace
    ? await supabaseAdmin
        .from('subscriptions')
        .select('plan')
        .eq('workspace_id', primaryWorkspace.id)
        .single()
    : { data: null }

  const plan = (subscription?.plan ?? 'trial') as Plan
  const isAgency = plan === 'agency'

  // Fetch signal stats from last 7 days grouped by platform
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [signalStatsRes, nichesRes] = primaryWorkspace
    ? await Promise.all([
        supabaseAdmin
          .from('signals')
          .select('platform, timestamp')
          .eq('workspace_id', primaryWorkspace.id)
          .gte('timestamp', sevenDaysAgo),
        supabase
          .from('niches')
          .select('id, last_scraped_at')
          .eq('workspace_id', primaryWorkspace.id),
      ])
    : [{ data: [] }, { data: [] }]

  // Aggregate into map: platform -> { count, lastSeen }
  const signalStatsByPlatform: Record<string, { count: number; lastSeen: string }> = {}
  ;(signalStatsRes.data ?? []).forEach((s: { platform: string; timestamp: string }) => {
    const key = s.platform
    if (!signalStatsByPlatform[key]) {
      signalStatsByPlatform[key] = { count: 0, lastSeen: s.timestamp }
    }
    signalStatsByPlatform[key].count++
    if (s.timestamp > signalStatsByPlatform[key].lastSeen) {
      signalStatsByPlatform[key].lastSeen = s.timestamp
    }
  })

  // Get the most recent last_scraped_at across all niches
  const lastScrapedAt = (nichesRes.data ?? [])
    .map((n: { last_scraped_at: string | null }) => n.last_scraped_at)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null

  return (
    <>
      <Topbar title="Sources" />
      <SourcesClient
        plan={plan}
        isAgency={isAgency}
        workspaces={workspaces ?? []}
        signalStatsByPlatform={signalStatsByPlatform}
        lastScrapedAt={lastScrapedAt}
      />
    </>
  )
}
