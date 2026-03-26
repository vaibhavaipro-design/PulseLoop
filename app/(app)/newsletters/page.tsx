import Topbar from '@/components/layout/Topbar'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getPlanLimits, isLocked } from '@/lib/plans'
import type { Plan } from '@/lib/plans'
import { redirect } from 'next/navigation'
import { getUser, getWorkspaceWithSub } from '@/lib/data/queries'
import NewsletterClient from './NewsletterClient'

export default async function NewslettersPage() {
  // Step 1: auth + workspace + subscription — 2 round-trips total via JOIN.
  // Both cached: free on initial full-page render (layout already resolved them).
  const user = await getUser()
  if (!user) redirect('/login')

  const { workspace, subscription } = await getWorkspaceWithSub(user.id)

  const plan = ((subscription?.plan ?? 'trial') as Plan)
  const locked = isLocked(plan, 'newsletters')
  const limits = getPlanLimits(plan)

  // Step 2: all page data in parallel
  const supabase = createSupabaseServerClient()
  const currentMonth = new Date().toISOString().slice(0, 7)

  const [newslettersResult, linkedinResult, reportsResult, usageResult, workspacesResult] = workspace
    ? await Promise.all([
        supabaseAdmin
          .from('newsletters')
          .select(`
            id,
            content_md,
            subject_lines,
            angle,
            trend_report_id,
            trend_reports ( id, title, niches ( name ) )
          `)
          .eq('workspace_id', workspace.id)
          .order('created_at', { ascending: false }),
        supabaseAdmin
          .from('linkedin_posts')
          .select('id, newsletter_id, variants')
          .eq('workspace_id', workspace.id),
        supabase
          .from('trend_reports')
          .select('id, title, niches ( name )')
          .eq('workspace_id', workspace.id)
          .order('created_at', { ascending: false }),
        supabaseAdmin
          .from('usage_logs')
          .select('count')
          .eq('workspace_id', workspace.id)
          .eq('action_type', 'newsletter')
          .eq('month', currentMonth)
          .maybeSingle(),
        supabase
          .from('workspaces')
          .select('id, name')
          .eq('user_id', user.id)
          .order('created_at'),
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
        plan={plan}
        locked={locked}
        limitPerMonth={limits.newsletters as number}
        usedThisMonth={usedThisMonth}
        workspaceId={workspace?.id ?? ''}
        workspaces={(workspacesResult.data ?? []) as Array<{ id: string; name: string }>}
      />
    </>
  )
}
