import Topbar from '@/components/layout/Topbar'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getPlanLimits, isLocked } from '@/lib/plans'
import type { Plan } from '@/lib/plans'
import { redirect } from 'next/navigation'
import { getUser, getAllWorkspaces, getSubscription } from '@/lib/data/queries'
import SignalBriefsClient from './SignalBriefsClient'

export default async function SignalBriefsPage() {
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

  const [subscription, briefsResult, reportsResult, nichesResult, usageResult] =
    workspaceIds.length > 0
      ? await Promise.all([
          primaryWorkspace ? getSubscription(primaryWorkspace.id) : Promise.resolve(null),
          supabaseAdmin
            .from('signal_briefs')
            .select(`
              id,
              workspace_id,
              share_id,
              share_active,
              content_md,
              created_at,
              trend_reports ( id, title, source_health, niches ( id, name, icon ) )
            `)
            .in('workspace_id', workspaceIds)
            .order('created_at', { ascending: false }),
          supabaseAdmin
            .from('trend_reports')
            .select('id, workspace_id, title, niches ( id, name, icon )')
            .in('workspace_id', workspaceIds)
            .order('created_at', { ascending: false }),
          supabase
            .from('niches')
            .select('id, name, icon, workspace_id')
            .in('workspace_id', workspaceIds)
            .order('name'),
          primaryWorkspace
            ? supabaseAdmin
                .from('usage_logs')
                .select('count')
                .eq('workspace_id', primaryWorkspace.id)
                .eq('action_type', 'signal_brief')
                .eq('month', currentMonth)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ])
      : [null, { data: [] }, { data: [] }, { data: [] }, { data: null }]

  const plan = ((subscription?.plan ?? 'trial') as Plan)
  const locked = isLocked(plan, 'signalBriefs')
  const limits = getPlanLimits(plan)
  const usedThisMonth = usageResult.data?.count ?? 0
  const briefLimit = limits.signalBriefs as number

  return (
    <>
      <Topbar title="Signal Briefs" />
      <SignalBriefsClient
        briefs={(briefsResult.data ?? []) as any[]}
        reports={(reportsResult.data ?? []) as any[]}
        workspaces={workspaces}
        niches={(nichesResult.data ?? []) as any[]}
        plan={plan}
        locked={locked}
        usedThisMonth={usedThisMonth}
        briefLimit={briefLimit}
        primaryWorkspaceId={primaryWorkspace?.id ?? null}
      />
    </>
  )
}
