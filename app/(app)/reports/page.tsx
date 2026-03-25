import Topbar from '@/components/layout/Topbar'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getPlanLimits } from '@/lib/plans'
import type { Plan } from '@/lib/plans'
import ReportsClient from './ReportsClient'

export default async function ReportsPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Load all workspaces (agency can have multiple)
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('user_id', user!.id)
    .order('created_at')

  const primaryWorkspace = workspaces?.[0]

  // Load subscription
  const { data: subscription } = primaryWorkspace
    ? await supabaseAdmin
        .from('subscriptions')
        .select('plan')
        .eq('workspace_id', primaryWorkspace.id)
        .single()
    : { data: null }

  const plan = (subscription?.plan ?? 'trial') as Plan
  const limits = getPlanLimits(plan)

  // Load reports for primary workspace with niche info
  const { data: reports } = primaryWorkspace
    ? await supabaseAdmin
        .from('trend_reports')
        .select(`
          id,
          title,
          created_at,
          source_health,
          niches ( id, name, icon )
        `)
        .eq('workspace_id', primaryWorkspace.id)
        .order('created_at', { ascending: false })
    : { data: [] }

  // Load niches for ALL workspaces (agency has multiple)
  const workspaceIds = (workspaces ?? []).map(w => w.id)
  const { data: niches } = workspaceIds.length > 0
    ? await supabase
        .from('niches')
        .select('id, name, icon, workspace_id')
        .in('workspace_id', workspaceIds)
        .order('name')
    : { data: [] }

  // Usage this month
  const currentMonth = new Date().toISOString().slice(0, 7)
  const { data: usage } = primaryWorkspace
    ? await supabaseAdmin
        .from('usage_logs')
        .select('count')
        .eq('workspace_id', primaryWorkspace.id)
        .eq('action_type', 'trend_report')
        .eq('month', currentMonth)
        .maybeSingle()
    : { data: null }

  const usedThisMonth = usage?.count ?? 0

  // Count content generated from reports (newsletters + briefs + dashboards)
  const { count: contentCount } = primaryWorkspace
    ? await supabaseAdmin
        .from('newsletters')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', primaryWorkspace.id)
    : { count: 0 }

  return (
    <>
      <Topbar title="Trend Reports" />
      <ReportsClient
        plan={plan}
        limits={limits}
        workspaces={workspaces ?? []}
        primaryWorkspaceId={primaryWorkspace?.id ?? null}
        reports={(reports ?? []) as any[]}
        niches={niches ?? []}
        usedThisMonth={usedThisMonth}
        contentGenerated={contentCount ?? 0}
      />
    </>
  )
}
