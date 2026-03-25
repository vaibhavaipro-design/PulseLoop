'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function toggleBriefShare(briefId: string, shareActive: boolean) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // RLS ensures they can only update briefs in their workspace
  const { error } = await supabase
    .from('signal_briefs')
    .update({ share_active: shareActive })
    .eq('id', briefId)

  if (error) throw new Error('Failed to update sharing settings')

  revalidatePath('/signal-briefs')
}
