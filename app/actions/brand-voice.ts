'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  extractVoiceTraits,
  buildVoiceProfile,
  generateVoiceTestSample,
  type VoiceTraits,
} from '@/lib/claude'

async function saveBrandVoiceContent(workspaceId: string, content: string, source: string) {
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

// ── Step 1 → 2: extract structured traits from writing samples ────
export async function analyzeWritingSamples(
  samples: string[]
): Promise<VoiceTraits> {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const nonEmpty = samples.filter(s => s.trim().length > 20)
  if (nonEmpty.length === 0) throw new Error('Please paste at least one writing sample.')

  return extractVoiceTraits(nonEmpty)
}

// ── Step 3 → 4: build final profile from samples + calibration ────
export async function buildFinalProfile(
  samples: string[],
  calibration: { scales: number[]; radios: string[] }
): Promise<string> {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  return buildVoiceProfile(samples.filter(Boolean), calibration)
}

// ── Step 4 → 5: generate test sample with the profile ─────────────
export async function runVoiceTest(
  profile: string,
  contentType: string
): Promise<string> {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  return generateVoiceTestSample(profile, contentType)
}

// ── Step 5: save & activate ───────────────────────────────────────
export async function activateBrandVoice(profile: string) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: workspace } = await supabase
    .from('workspaces').select('id').eq('user_id', user.id).single()
  if (!workspace) throw new Error('Workspace not found')

  await saveBrandVoiceContent(workspace.id, profile, 'wizard')
  revalidatePath('/brand-voice')
  revalidatePath('/settings')
}

// ── Legacy: settings page quick-analyze (single sample) ──────────
const NEUTRAL_CALIBRATION = { scales: [3, 3, 3, 3, 3], radios: ['first-person', 'text-only', 'inline'] }

export async function analyzeBrandVoice(sample: string) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: workspace } = await supabase
    .from('workspaces').select('id').eq('user_id', user.id).single()
  if (!workspace) throw new Error('Workspace not found')

  const profile = await buildVoiceProfile([sample], NEUTRAL_CALIBRATION)
  await saveBrandVoiceContent(workspace.id, profile, 'generated')
  revalidatePath('/settings')
  revalidatePath('/brand-voice')
  return profile
}

// ── Direct manual save (settings page) ───────────────────────────
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

  const { error } = await supabase
    .from('brand_voice_profiles')
    .delete()
    .eq('workspace_id', workspace.id)
  if (error) throw new Error('Failed to delete brand voice')

  revalidatePath('/brand-voice')
  revalidatePath('/settings')
}
