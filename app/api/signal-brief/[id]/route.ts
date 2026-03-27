import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership before delete
  const { data: brief } = await supabaseAdmin
    .from('signal_briefs')
    .select('id, workspace_id')
    .eq('id', params.id)
    .single()
  if (!brief)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: workspaceOwned } = await supabaseAdmin
    .from('workspaces')
    .select('id')
    .eq('id', brief.workspace_id)
    .eq('user_id', user.id)
    .single()
  if (!workspaceOwned)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabaseAdmin
    .from('signal_briefs')
    .delete()
    .eq('id', params.id)
    .eq('workspace_id', brief.workspace_id)

  if (error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })

  return NextResponse.json({ success: true })
}
