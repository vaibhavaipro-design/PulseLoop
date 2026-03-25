'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { generateBrandVoice } from '@/lib/claude'

async function saveBrandVoiceContent(workspaceId: string, content: string, source: string) {
  // Update existing profile if one exists, otherwise insert
  const { data: existing } = await supabaseAdmin
    .from('brand_voice_profiles')
    .select('id')
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabaseAdmin
      .from('brand_voice_profiles')
      .update({ content, source, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) throw new Error('Failed to save brand voice')
  } else {
    const { error } = await supabaseAdmin
      .from('brand_voice_profiles')
      .insert({ workspace_id: workspaceId, content, source })
    if (error) throw new Error('Failed to save brand voice')
  }
}

export async function analyzeBrandVoice(sample: string) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: workspace } = await supabase
    .from('workspaces').select('id').eq('user_id', user.id).single()
  if (!workspace) throw new Error('Workspace not found')

  const extractedVoice = await generateBrandVoice([sample])
  if (!extractedVoice) throw new Error('Failed to analyze brand voice')

  await saveBrandVoiceContent(workspace.id, extractedVoice, 'generated')
  revalidatePath('/settings')
  return extractedVoice
}

export async function saveManualBrandVoice(voicePrompt: string) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: workspace } = await supabase
    .from('workspaces').select('id').eq('user_id', user.id).single()
  if (!workspace) throw new Error('Workspace not found')

  await saveBrandVoiceContent(workspace.id, voicePrompt, 'manual')
  revalidatePath('/settings')
}

export async function deleteBrandVoice() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: workspace } = await supabase
    .from('workspaces').select('id').eq('user_id', user.id).single()
  if (!workspace) throw new Error('Workspace not found')

  // User client respects RLS bvp_all policy
  const { error } = await supabase
    .from('brand_voice_profiles')
    .delete()
    .eq('workspace_id', workspace.id)
  if (error) throw new Error('Failed to delete brand voice')

  revalidatePath('/settings')
}
