import Topbar from '@/components/layout/Topbar'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getPlanLimits, isLocked } from '@/lib/plans'
import type { Plan } from '@/lib/plans'
import { redirect } from 'next/navigation'
import { getUser, getWorkspaceWithSub, getAllWorkspaces } from '@/lib/data/queries'
import NewsletterClient from './NewsletterClient'

export default async function NewslettersPage() {
  // Step 1: auth + workspace + subscription — 2 round-trips total via JOIN.
  // Both cached: free on initial full-page render (layout already resolved them).
  const user = await getUser()
  if (!user) redirect('/login')

  const [{ workspace, subscription }, allWorkspaces] = await Promise.all([
    getWorkspaceWithSub(user.id),
    getAllWorkspaces(user.id),
  ])
  const workspaceIds = allWorkspaces.map(w => w.id)

  const plan = ((subscription?.plan ?? 'trial') as Plan)
  const locked = isLocked(plan, 'newsletters')
  const limits = getPlanLimits(plan)

  // Step 2: all page data in parallel
  const supabase = createSupabaseServerClient()
  const currentMonth = new Date().toISOString().slice(0, 7)

  const [newslettersResult, linkedinResult, reportsResult, usageResult, signalBriefsResult] = workspace
    ? await Promise.all([
        supabaseAdmin
          .from('newsletters')
          .select(`
            id,
            workspace_id,
            content_md,
            content_html,
            subject_lines,
            angle,
            trend_report_id,
            trend_reports ( id, title, niches ( name ) )
          `)
          .in('workspace_id', workspaceIds)
          .order('created_at', { ascending: false }),
        supabaseAdmin
          .from('linkedin_posts')
          .select('id, newsletter_id, variants')
          .in('workspace_id', workspaceIds),
        supabase
          .from('trend_reports')
          .select('id, title, workspace_id, niches ( name )')
          .in('workspace_id', workspaceIds)
          .order('created_at', { ascending: false }),
        supabaseAdmin
          .from('usage_logs')
          .select('count')
          .eq('workspace_id', workspace.id)
          .eq('action_type', 'newsletter')
          .eq('month', currentMonth)
          .maybeSingle(),
        supabaseAdmin
          .from('signal_briefs')
          .select('id, workspace_id, content_md')
          .in('workspace_id', workspaceIds)
          .order('created_at', { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: null }, { data: [] }]

  const linkedinByNewsletter: Record<string, any> = {}
  linkedinResult.data?.forEach(lp => {
    if (lp.newsletter_id) linkedinByNewsletter[lp.newsletter_id] = lp
  })

  const usedThisMonth = usageResult.data?.count ?? 0

  return (
    <>
      <Topbar title="Newsletters" />
      <NewsletterClient
        newsletters={(newslettersResult.data ?? []) as any[]}
        linkedinByNewsletter={linkedinByNewsletter}
        reports={(reportsResult.data ?? []) as any[]}
        signalBriefs={(signalBriefsResult.data ?? []) as any[]}
        plan={plan}
        locked={locked}
        limitPerMonth={limits.newsletters as number}
        usedThisMonth={usedThisMonth}
        workspaceId={workspace?.id ?? ''}
        workspaces={allWorkspaces}
      />
    </>
  )
}
