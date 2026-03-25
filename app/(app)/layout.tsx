import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import Shell from '@/components/layout/Shell'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Load workspace and subscription info for the shell
  const { data: workspaceRows } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
  const workspace = workspaceRows?.[0] ?? null

  let planName = 'TRIAL'
  if (workspace) {
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('plan')
      .eq('workspace_id', workspace.id)
      .single()

    if (subscription) {
      planName = subscription.plan.toUpperCase()
    }
  }

  const displayName = user.email?.split('@')[0] ?? 'User'

  return (
    <Shell userName={displayName} planName={planName}>
      {children}
    </Shell>
  )
}
