'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NicheSchema } from '@/lib/validation'
import { getPlanLimits } from '@/lib/plans'

export async function createNiche(formData: FormData) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const name = formData.get('name') as string
  const slug = formData.get('slug') as string

  // Validate
  const result = NicheSchema.safeParse({ name, slug })
  if (!result.success) {
    throw new Error('Invalid niche data. Slug must be lowercase holding only letters, numbers, and dashes.')
  }

  // Get workspace - use the explicitly passed ID if available, otherwise fallback
  const workspaceId = formData.get('workspaceId') as string | null
  
  let workspace: { id: string } | null = null
  if (workspaceId) {
    const { data } = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', workspaceId)
      .eq('user_id', user.id)
      .single()
    workspace = data
  } else {
    const { data } = await supabase
      .from('workspaces')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at')
      .limit(1)
      .single()
    workspace = data
  }

  if (!workspace) throw new Error('Workspace not found')

  const description = formData.get('description') as string | null
  const icon = formData.get('icon') as string | null
  const keywordsStr = formData.get('keywords') as string | null
  const sourcesStr = formData.get('sources') as string | null
  const scrapeFreq = formData.get('scrapeFreq') as string | null
  const signalMemory = formData.get('signalMemory') as string | null
  const activateImmediately = formData.get('activateImmediately') === 'true'

  const customSignalTypes = formData.get('customSignalTypes') as string | null

  const keywords = keywordsStr ? JSON.parse(keywordsStr) : []
  const sourcesArray = sourcesStr ? JSON.parse(sourcesStr) : []

  // Check limits
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('plan')
    .eq('workspace_id', workspace.id)
    .single()

  if (!subscription) throw new Error('Subscription not found')

  const limits = getPlanLimits(subscription.plan)

  const { count } = await supabase
    .from('niches')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspace.id)

  if ((count ?? 0) >= limits.nichesPerWorkspace) {
    throw new Error(`Limit reached. Your ${subscription.plan} plan allows up to ${limits.nichesPerWorkspace} niches.`)
  }

  // Insert niche
  const { data, error } = await supabase
    .from('niches')
    .insert({
      workspace_id: workspace.id,
      name: result.data.name,
      slug: result.data.slug,
      is_active: activateImmediately,
      description,
      icon,
      keywords,
      sources: sourcesArray,
      scrape_freq: scrapeFreq,
      signal_memory: signalMemory,
      custom_signal_types: customSignalTypes
    })
    .select('id')
    .single()

  if (error) {
    console.error('Create niche error:', error)
    if (error.code === '23505') throw new Error('A niche with this slug already exists')
    throw new Error('Failed to create niche')
  }

  // Fire-and-forget: trigger initial scrape for the new niche
  const newNicheId = data?.id
  if (newNicheId) {
    fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/scrape/${newNicheId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => { /* ignore scrape errors */ })
  }

  revalidatePath('/niches')
  revalidatePath('/overview')
  return { success: true }
}

export async function toggleNicheStatus(nicheId: string, isActive: boolean) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Get workspace to verify ownership
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at')
    .limit(1)
    .single()

  if (!workspace) throw new Error('Workspace not found')

  const { error } = await supabase
    .from('niches')
    .update({ is_active: isActive })
    .eq('id', nicheId)
    .eq('workspace_id', workspace.id)

  if (error) throw new Error('Failed to update niche status')

  revalidatePath('/niches')
  revalidatePath('/overview')
}

export async function deleteNiche(nicheId: string) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Get workspace to verify ownership
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at')
    .limit(1)
    .single()

  if (!workspace) throw new Error('Workspace not found')

  const { error } = await supabase
    .from('niches')
    .delete()
    .eq('id', nicheId)
    .eq('workspace_id', workspace.id)

  if (error) throw new Error('Failed to delete niche')

  revalidatePath('/niches')
  revalidatePath('/overview')
  return { success: true }
}

export async function updateNiche(nicheId: string, formData: FormData) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const name = formData.get('name') as string
  const slug = formData.get('slug') as string

  // Validate
  const result = NicheSchema.safeParse({ name, slug })
  if (!result.success) {
    throw new Error('Invalid niche data. Slug must be lowercase holding only letters, numbers, and dashes.')
  }

  const description = formData.get('description') as string | null
  const icon = formData.get('icon') as string | null
  const keywordsStr = formData.get('keywords') as string | null
  const sourcesStr = formData.get('sources') as string | null
  const scrapeFreq = formData.get('scrapeFreq') as string | null
  const signalMemory = formData.get('signalMemory') as string | null
  const activateImmediately = formData.get('activateImmediately')

  const customSignalTypes = formData.get('customSignalTypes') as string | null

  const keywords = keywordsStr ? JSON.parse(keywordsStr) : []
  const sourcesArray = sourcesStr ? JSON.parse(sourcesStr) : []

  const updateData: any = {
    name: result.data.name,
    slug: result.data.slug,
    description,
    icon,
    keywords,
    sources: sourcesArray,
    scrape_freq: scrapeFreq,
    signal_memory: signalMemory,
    custom_signal_types: customSignalTypes
  }

  if (activateImmediately !== null) {
    updateData.is_active = activateImmediately === 'true'
  }

  const { error } = await supabase
    .from('niches')
    .update(updateData)
    .eq('id', nicheId)

  if (error) {
    console.error('Update niche error:', error)
    if (error.code === '23505') throw new Error('A niche with this slug already exists')
    throw new Error('Failed to update niche')
  }

  revalidatePath('/niches')
  revalidatePath('/overview')
  return { success: true }
}
