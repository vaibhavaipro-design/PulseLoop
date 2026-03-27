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
  const { data: report } = await supabaseAdmin
    .from('trend_reports')
    .select('id, workspace_id')
    .eq('id', params.id)
    .single()
  if (!report)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: workspaceOwned } = await supabaseAdmin
    .from('workspaces')
    .select('id')
    .eq('id', report.workspace_id)
    .eq('user_id', user.id)
    .single()
  if (!workspaceOwned)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabaseAdmin
    .from('trend_reports')
    .delete()
    .eq('id', params.id)
    .eq('workspace_id', report.workspace_id)

  if (error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })

  return NextResponse.json({ success: true })
}
