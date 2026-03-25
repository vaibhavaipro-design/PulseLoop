import Topbar from '@/components/layout/Topbar'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getPlanLimits, isLocked } from '@/lib/plans'
import type { Plan } from '@/lib/plans'
import DashboardsClient from './DashboardsClient'

export default async function DashboardsPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Load all workspaces (Agency can have multiple)
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('user_id', user!.id)
    .order('created_at')

  const primaryWorkspace = workspaces?.[0]

  const { data: subscription } = primaryWorkspace
    ? await supabaseAdmin
        .from('subscriptions')
        .select('plan, trial_ends_at')
        .eq('workspace_id', primaryWorkspace.id)
        .single()
    : { data: null }

  const plan = (subscription?.plan ?? 'trial') as Plan
  const locked = isLocked(plan, 'dashboards')
  const limits = getPlanLimits(plan)

  const workspaceIds = (workspaces ?? []).map(w => w.id)

  // Load dashboards for ALL workspaces (Agency tabs filter client-side)
  const { data: dashboards } = workspaceIds.length > 0
    ? await supabaseAdmin
        .from('dashboards')
        .select(`
          id,
          workspace_id,
          share_id,
          share_active,
          style,
          template,
          dashboard_json,
          created_at,
          trend_reports ( id, title, niches ( id, name, icon ) )
        `)
        .in('workspace_id', workspaceIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  // Load reports for generate panel (all workspaces)
  const { data: reports } = workspaceIds.length > 0
    ? await supabaseAdmin
        .from('trend_reports')
        .select('id, workspace_id, title, niches ( id, name, icon )')
        .in('workspace_id', workspaceIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  // Load niches for filter chips
  const { data: niches } = workspaceIds.length > 0
    ? await supabase
        .from('niches')
        .select('id, name, icon, workspace_id')
        .in('workspace_id', workspaceIds)
        .order('name')
    : { data: [] }

  // Current month usage (primary workspace)
  const currentMonth = new Date().toISOString().slice(0, 7)
  const { data: usage } = primaryWorkspace
    ? await supabaseAdmin
        .from('usage_logs')
        .select('count')
        .eq('workspace_id', primaryWorkspace.id)
        .eq('action_type', 'dashboard')
        .eq('month', currentMonth)
        .maybeSingle()
    : { data: null }

  const usedThisMonth = usage?.count ?? 0
  const dashboardLimit = limits.dashboards === Infinity ? Infinity : (limits.dashboards as number)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  return (
    <>
      <Topbar title="Dashboards" />
      <DashboardsClient
        dashboards={(dashboards ?? []) as any[]}
        reports={(reports ?? []) as any[]}
        workspaces={workspaces ?? []}
        niches={(niches ?? []) as any[]}
        plan={plan}
        locked={locked}
        dashboardLimit={dashboardLimit}
        usedThisMonth={usedThisMonth}
        primaryWorkspaceId={primaryWorkspace?.id ?? null}
        appUrl={appUrl}
      />
    </>
  )
}
