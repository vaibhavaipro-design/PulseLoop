import Topbar from '@/components/layout/Topbar'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Plan } from '@/lib/plans'
import SourcesClient from './SourcesClient'

export default async function SourcesPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('user_id', user!.id)
    .order('created_at')

  const primaryWorkspace = workspaces?.[0]

  const { data: subscription } = primaryWorkspace
    ? await supabaseAdmin
        .from('subscriptions')
        .select('plan')
        .eq('workspace_id', primaryWorkspace.id)
        .single()
    : { data: null }

  const plan = (subscription?.plan ?? 'trial') as Plan
  const isAgency = plan === 'agency'

  return (
    <>
      <Topbar title="Sources" />
      <SourcesClient
        plan={plan}
        isAgency={isAgency}
        workspaces={workspaces ?? []}
      />
    </>
  )
}
