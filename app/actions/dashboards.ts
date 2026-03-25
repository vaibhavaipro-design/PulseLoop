'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function toggleDashboardShare(dashboardId: string, shareActive: boolean) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // RLS "dash_update_share" policy ensures user can only update their own workspace dashboards
  const { error } = await supabase
    .from('dashboards')
    .update({ share_active: shareActive })
    .eq('id', dashboardId)

  if (error) throw new Error('Failed to update sharing settings')

  revalidatePath('/dashboards')
}

export async function deleteDashboard(dashboardId: string) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('dashboards')
    .delete()
    .eq('id', dashboardId)

  if (error) throw new Error('Failed to delete dashboard')
  revalidatePath('/dashboards')
}
