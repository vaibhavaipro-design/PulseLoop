import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getPlanLimits } from '@/lib/plans'
import { redirect } from 'next/navigation'
import NicheClientCard from './NicheClientCard'
import NichesClientShell from './NichesClientShell'

export default async function NichesPage({ searchParams }: { searchParams: { ws?: string } }) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load ALL workspaces
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('user_id', user.id)
    .order('created_at')

  if (!workspaces || workspaces.length === 0) redirect('/login')

  const activeWorkspace = searchParams.ws 
    ? workspaces.find(w => w.id === searchParams.ws) || workspaces[0]
    : workspaces[0]

  // Load subscription plan from admin client
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('plan, trial_ends_at')
    .eq('workspace_id', activeWorkspace.id)
    .single()

  const planName = sub?.plan || 'starter'
  const limits = getPlanLimits(planName)

  // Load niches
  const { data: niches } = await supabase
    .from('niches')
    .select('*')
    .eq('workspace_id', activeWorkspace.id)
    .order('name')

  const nicheList = niches ?? []
  const totalCount = nicheList.length
  const activeCount = nicheList.filter(n => n.is_active).length
  const pausedCount = nicheList.filter(n => !n.is_active).length

  // Get signal counts per niche
  const { data: signalCounts } = await supabase
    .from('signals')
    .select('niche_id')
    .eq('workspace_id', activeWorkspace.id)

  const signalCountMap: Record<string, number> = {}
  signalCounts?.forEach(s => {
    signalCountMap[s.niche_id] = (signalCountMap[s.niche_id] || 0) + 1
  })

  const totalSignals = Object.values(signalCountMap).reduce((a, b) => a + b, 0)

  // Get report counts per niche
  const { data: reportCounts } = await supabase
    .from('trend_reports')
    .select('niche_id')
    .eq('workspace_id', activeWorkspace.id)

  const reportCountMap: Record<string, number> = {}
  reportCounts?.forEach(r => {
    reportCountMap[r.niche_id] = (reportCountMap[r.niche_id] || 0) + 1
  })

  // Scrape frequency label
  const scrapeFreq = planName === 'agency' ? 'every hour' : planName === 'pro' ? 'every 2 hrs' : 'every 6 hrs'

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
