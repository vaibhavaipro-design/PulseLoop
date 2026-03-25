import Topbar from '@/components/layout/Topbar'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getPlanLimits, isLocked } from '@/lib/plans'
import type { Plan } from '@/lib/plans'
import NewsletterClient from './NewsletterClient'

export default async function NewslettersPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: workspaceRows } = await supabase
    .from('workspaces')
    .select('id')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: true })
    .limit(1)
  const workspace = workspaceRows?.[0] ?? null

  // Load subscription via admin
  const { data: subscription } = workspace
    ? await supabaseAdmin
        .from('subscriptions')
        .select('plan, trial_ends_at')
        .eq('workspace_id', workspace.id)
        .single()
    : { data: null }

  const plan = (subscription?.plan ?? 'trial') as Plan
  const locked = isLocked(plan, 'newsletters')
  const limits = getPlanLimits(plan)

  // Load newsletters with their linkedin_posts and report info
  const { data: newsletters } = workspace
    ? await supabaseAdmin
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
        .order('id', { ascending: false })
    : { data: [] }

  // Load linkedin_posts keyed by newsletter_id
  const { data: linkedinPosts } = workspace
    ? await supabaseAdmin
        .from('linkedin_posts')
        .select('id, newsletter_id, variants')
        .eq('workspace_id', workspace.id)
    : { data: [] }

  const linkedinByNewsletter: Record<string, any> = {}
  linkedinPosts?.forEach((lp) => {
    if (lp.newsletter_id) linkedinByNewsletter[lp.newsletter_id] = lp
  })

  // Load trend reports for the generate modal dropdown
  const { data: reports } = workspace
    ? await supabase
        .from('trend_reports')
        .select('id, title, niches ( name )')
        .eq('workspace_id', workspace.id)
        .order('id', { ascending: false })
    : { data: [] }

  // Current month usage
  const currentMonth = new Date().toISOString().slice(0, 7)
  const { data: usage } = workspace
    ? await supabaseAdmin
        .from('usage_logs')
        .select('count')
        .eq('workspace_id', workspace.id)
        .eq('action_type', 'newsletter')
        .eq('month', currentMonth)
        .maybeSingle()
    : { data: null }
  const usedThisMonth = usage?.count ?? 0

  return (
    <>
      <Topbar title="Newsletters" />
      <NewsletterClient
        newsletters={newsletters ?? []}
        linkedinByNewsletter={linkedinByNewsletter}
        reports={reports ?? []}
        plan={plan}
        locked={locked}
        limitPerMonth={limits.newsletters as number}
        usedThisMonth={usedThisMonth}
        workspaceId={workspace?.id ?? ''}
      />
    </>
  )
}
