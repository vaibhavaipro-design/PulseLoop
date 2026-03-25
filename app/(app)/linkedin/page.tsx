import Topbar from '@/components/layout/Topbar'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { isLocked } from '@/lib/plans'
import type { Plan } from '@/lib/plans'
import LinkedInClient from './LinkedInClient'

export default async function LinkedInPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

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

  // Load linkedin_posts with newsletter + report join
  const { data: linkedinPosts } = workspace
    ? await supabaseAdmin
        .from('linkedin_posts')
        .select(`
          id,
          variants,
          newsletter_id,
          newsletters ( id, angle, trend_reports ( title, niches ( name ) ) )
        `)
        .eq('workspace_id', workspace.id)
        .order('id', { ascending: false })
    : { data: [] }

  return (
    <>
      <Topbar title="LinkedIn Posts" />
      <LinkedInClient posts={linkedinPosts ?? []} plan={plan} locked={locked} />
    </>
  )
}
