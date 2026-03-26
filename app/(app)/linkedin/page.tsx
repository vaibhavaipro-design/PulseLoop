import Topbar from '@/components/layout/Topbar'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { isLocked, getPlanLimits } from '@/lib/plans'
import type { Plan } from '@/lib/plans'
import { redirect } from 'next/navigation'
import LinkedInClient from './LinkedInClient'

export default async function LinkedInPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: workspaceRows } = await supabase
    .from('workspaces')
    .select('id')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: true })
    .limit(1)
  const workspace = workspaceRows?.[0] ?? null

  const { data: subscription } = workspace
    ? await supabaseAdmin
        .from('subscriptions')
        .select('plan')
        .eq('workspace_id', workspace.id)
        .single()
    : { data: null }

  const plan = (subscription?.plan ?? 'trial') as Plan
  const locked = isLocked(plan, 'linkedinPosts')
  const limits = getPlanLimits(plan)

  const currentMonth = new Date().toISOString().slice(0, 7)

  const [linkedinPostsRes, newslettersRes, trendReportsRes, usageRes] = workspace
    ? await Promise.all([
        supabaseAdmin
          .from('linkedin_posts')
          .select(`id, variants, newsletter_id, newsletters ( id, angle, trend_reports ( title, niches ( name ) ) )`)
          .eq('workspace_id', workspace.id)
          .order('id', { ascending: false }),
        supabaseAdmin
          .from('newsletters')
          .select('id, angle, trend_reports ( id, title, niches ( name ) )')
          .eq('workspace_id', workspace.id)
          .order('id', { ascending: false })
          .limit(20),
        supabaseAdmin
          .from('trend_reports')
          .select('id, title, niches ( name )')
          .eq('workspace_id', workspace.id)
          .order('id', { ascending: false })
          .limit(20),
        supabaseAdmin
          .from('usage_logs')
          .select('count')
          .eq('workspace_id', workspace.id)
          .eq('action_type', 'linkedin')
          .eq('month', currentMonth)
          .maybeSingle(),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: null }]

  return (
    <>
      <Topbar title="LinkedIn Posts" />
      <LinkedInClient
        posts={(linkedinPostsRes.data ?? []) as any}
        newsletters={(newslettersRes.data ?? []) as any}
        trendReports={(trendReportsRes.data ?? []) as any}
        plan={plan}
        locked={locked}
        workspaceId={workspace?.id ?? ''}
        setsUsedThisMonth={usageRes.data?.count ?? 0}
        setsLimit={limits.linkedinPosts}
      />
    </>
  )
}
