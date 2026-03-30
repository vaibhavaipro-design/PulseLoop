import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!z.string().uuid().safeParse(params.id).success)
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const supabase = createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: workspace } = await supabase
    .from('workspaces').select('id').eq('user_id', user.id).order('created_at').limit(1).single()
  if (!workspace)
    return NextResponse.json({ error: 'No workspace' }, { status: 404 })

  const { error } = await supabaseAdmin
    .from('linkedin_posts')
    .delete()
    .eq('id', params.id)
    .eq('workspace_id', workspace.id)

  if (error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })

  return NextResponse.json({ success: true })
}
