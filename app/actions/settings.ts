'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function updateDisplayName(displayName: string) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const trimmed = displayName.trim()
  if (!trimmed || trimmed.length > 60) return { error: 'Name must be 1–60 characters' }

  const { error } = await supabase.auth.updateUser({
    data: { display_name: trimmed }
  })
  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}

export async function changePassword(newPassword: string) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!newPassword || newPassword.length < 8) {
    return { error: 'Password must be at least 8 characters' }
  }
  if (newPassword.length > 128) {
    return { error: 'Password must be 128 characters or fewer' }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }

  return { success: true }
}

export async function deleteAccount() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Step 1: Delete all workspaces (cascades to all data) — MUST be before deleteUser
  const { error: wsError } = await supabaseAdmin
    .from('workspaces')
    .delete()
    .eq('user_id', user.id)
  if (wsError) return { error: 'Failed to delete workspace data' }

  // Step 2: Delete the auth user — service role required
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
  if (authError) return { error: 'Failed to delete account' }

  return { success: true }
}
