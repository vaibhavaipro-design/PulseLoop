'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function createWorkspace(name: string) {
  const supabase = createSupabaseServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Create the workspace
  const { data: newWorkspace, error } = await supabase
    .from('workspaces')
    .insert({ user_id: user.id, name })
    .select()
    .single()

  if (error || !newWorkspace) throw new Error(error?.message || 'Failed to create workspace')

  // Determine the default plan (e.g. they should inherit agency plan if we are allowing them to do this from the agency tier,
  // but currently all workspaces need an entry in `subscriptions` to function properly with the query logic!)
  // In `get_limits` or `niches.ts` checking plans, it reads from `subscriptions`.
  const { error: subError } = await supabaseAdmin
    .from('subscriptions')
    .insert({
      workspace_id: newWorkspace.id,
      plan: 'agency' // Assuming only agency users can make workspaces anyway!
    })

  if (subError) throw new Error(subError.message)

  revalidatePath('/niches')
  return { success: true, workspaceId: newWorkspace.id }
}

export async function updateWorkspaceName(workspaceId: string, name: string) {
  const supabase = createSupabaseServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('workspaces')
    .update({ name })
    .eq('id', workspaceId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/niches')
  return { success: true }
}

export async function deleteWorkspace(workspaceId: string) {
  const supabase = createSupabaseServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Prevent deleting the very last workspace for an account
  const { data: workspaces, error: countError } = await supabase
    .from('workspaces')
    .select('id')
    .eq('user_id', user.id)

  if (countError) throw new Error(countError.message)
  if (workspaces && workspaces.length <= 1) {
    throw new Error('Cannot delete your only workspace.')
  }

  // Use supabaseAdmin to bypass RLS since there is currently no DELETE policy for workspaces table
  const { error } = await supabaseAdmin
    .from('workspaces')
    .delete()
    .eq('id', workspaceId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/niches')
  return { success: true }
}
