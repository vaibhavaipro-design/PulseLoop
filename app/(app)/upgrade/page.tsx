import Topbar from '@/components/layout/Topbar'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import UpgradeClient from './UpgradeClient'

export default async function UpgradePage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: workspace } = await supabase
    .from('workspaces').select('id').eq('user_id', user!.id).single()

  const { data: subscription } = workspace
    ? await supabaseAdmin
        .from('subscriptions')
        .select('plan')
        .eq('workspace_id', workspace.id)
        .single()
    : { data: null }

  const currentPlan = subscription?.plan ?? 'trial'

  return (
    <>
      <Topbar title="Upgrade Plan" />
      <UpgradeClient currentPlan={currentPlan} />
    </>
  )
}
