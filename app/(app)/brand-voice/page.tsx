import Topbar from '@/components/layout/Topbar'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import BrandVoiceWizard from './BrandVoiceWizard'
import type { Plan } from '@/lib/plans'

export default async function BrandVoicePage() {
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

  const { data: brandVoice } = workspace
    ? await supabaseAdmin
        .from('brand_voice_profiles')
        .select('content, source, updated_at')
        .eq('workspace_id', workspace.id)
        .maybeSingle()
    : { data: null }

  return (
    <>
      <Topbar title="Brand Voice" />
      <BrandVoiceWizard
        existingProfile={brandVoice?.content ?? null}
        existingSource={brandVoice?.source ?? null}
        existingUpdatedAt={brandVoice?.updated_at ?? null}
        plan={plan}
      />
    </>
  )
}
