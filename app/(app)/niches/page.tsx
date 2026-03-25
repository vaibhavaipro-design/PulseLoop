import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getPlanLimits } from '@/lib/plans'
import { redirect } from 'next/navigation'
import { getUser, getAllWorkspaces, getSubscription } from '@/lib/data/queries'
import NicheClientCard from './NicheClientCard'
import NichesClientShell from './NichesClientShell'

export default async function NichesPage({ searchParams }: { searchParams: { ws?: string } }) {
  // Step 1: auth (cached — free on initial full-page render)
  const user = await getUser()
  if (!user) redirect('/login')

  // Step 2: all workspaces (cached)
  const workspaces = await getAllWorkspaces(user.id)
  if (!workspaces.length) redirect('/login')

  const activeWorkspace = searchParams.ws
    ? workspaces.find(w => w.id === searchParams.ws) ?? workspaces[0]
    : workspaces[0]

  // Step 3: subscription + niches + signal counts + report counts — all in parallel
  const supabase = createSupabaseServerClient()
  const [subscription, nichesResult, signalCountsResult, reportCountsResult] = await Promise.all([
    getSubscription(activeWorkspace.id),
    supabase
      .from('niches')
      .select('*')
      .eq('workspace_id', activeWorkspace.id)
      .order('name'),
    supabase
      .from('signals')
      .select('niche_id')
      .eq('workspace_id', activeWorkspace.id),
    supabase
      .from('trend_reports')
      .select('niche_id')
      .eq('workspace_id', activeWorkspace.id),
  ])

  const planName = subscription?.plan ?? 'starter'
  const limits = getPlanLimits(planName)

  const nicheList = nichesResult.data ?? []
  const totalCount = nicheList.length
  const activeCount = nicheList.filter(n => n.is_active).length
  const pausedCount = nicheList.filter(n => !n.is_active).length

  const signalCountMap: Record<string, number> = {}
  signalCountsResult.data?.forEach(s => {
    signalCountMap[s.niche_id] = (signalCountMap[s.niche_id] ?? 0) + 1
  })
  const totalSignals = Object.values(signalCountMap).reduce((a, b) => a + b, 0)

  const reportCountMap: Record<string, number> = {}
  reportCountsResult.data?.forEach(r => {
    reportCountMap[r.niche_id] = (reportCountMap[r.niche_id] ?? 0) + 1
  })

  const scrapeFreq =
    planName === 'agency' ? 'every hour' :
    planName === 'pro' ? 'every 2 hrs' :
    'every 6 hrs'

  return (
    <NichesClientShell
      user={user}
      plan={planName}
      limits={limits}
      niches={nicheList}
      totalCount={totalCount}
      activeCount={activeCount}
      pausedCount={pausedCount}
      totalSignals={totalSignals}
      signalCountMap={signalCountMap}
      reportCountMap={reportCountMap}
      scrapeFreq={scrapeFreq}
      workspaceName={activeWorkspace.name || 'Workspace'}
      allWorkspaces={workspaces}
      activeWorkspace={activeWorkspace}
    />
  )
}
