import Topbar from '@/components/layout/Topbar'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getPlanLimits } from '@/lib/plans'
import type { Plan } from '@/lib/plans'
import { redirect } from 'next/navigation'
import { getUser, getAllWorkspaces, getSubscription } from '@/lib/data/queries'
import ReportsClient from './ReportsClient'

export default async function ReportsPage() {
  // Step 1: auth (cached)
  const user = await getUser()
  if (!user) redirect('/login')

  // Step 2: all workspaces (cached)
  const workspaces = await getAllWorkspaces(user.id)
  const primaryWorkspace = workspaces[0] ?? null
  const workspaceIds = workspaces.map(w => w.id)

  // Step 3: all remaining queries in parallel
  const supabase = createSupabaseServerClient()
  const currentMonth = new Date().toISOString().slice(0, 7)

  const [subscription, reportsResult, nichesResult, usageResult, contentCountResult] =
    primaryWorkspace
      ? await Promise.all([
          getSubscription(primaryWorkspace.id),
          supabaseAdmin
            .from('trend_reports')
            .select('id, title, created_at, source_health, workspace_id, niches ( id, name, icon )')
            .in('workspace_id', workspaceIds)
            .order('created_at', { ascending: false }),
          supabase
            .from('niches')
            .select('id, name, icon, workspace_id')
            .in('workspace_id', workspaceIds)
            .order('name'),
          supabaseAdmin
            .from('usage_logs')
            .select('count')
            .eq('workspace_id', primaryWorkspace.id)
            .eq('action_type', 'trend_report')
            .eq('month', currentMonth)
            .maybeSingle(),
          supabaseAdmin
            .from('newsletters')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', primaryWorkspace.id),
        ])
      : [null, { data: [] }, { data: [] }, { data: null }, { count: 0 }]

  const plan = ((subscription?.plan ?? 'trial') as Plan)
  const limits = getPlanLimits(plan)
  const usedThisMonth = usageResult.data?.count ?? 0
  const contentCount = contentCountResult.count ?? 0

  return (
    <>
      <Topbar title="Trend Reports" />
      <ReportsClient
        plan={plan}
        limits={limits}
        workspaces={workspaces}
        primaryWorkspaceId={primaryWorkspace?.id ?? null}
        reports={(reportsResult.data ?? []) as any[]}
        niches={(nichesResult.data ?? []) as any[]}
        usedThisMonth={usedThisMonth}
        contentGenerated={contentCount}
      />
    </>
  )
}
