import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // ── 1. Auth ──────────────────────────────────────────────────
  const supabase = createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── 2. Load workspace (ownership anchor) ─────────────────────
  const { data: workspace } = await supabase
    .from('workspaces').select('id').eq('user_id', user.id).single()
  if (!workspace)
    return NextResponse.json({ error: 'No workspace' }, { status: 404 })

  // ── 3. Verify dashboard ownership and revoke share in one step
  //       Both .eq('id') AND .eq('workspace_id') required — never trust ID alone
  const { error } = await supabase
    .from('dashboards')
    .update({ share_active: false })
    .eq('id', params.id)
    .eq('workspace_id', workspace.id)

  if (error)
    return NextResponse.json({ error: 'Not found or update failed' }, { status: 404 })

  return NextResponse.json({ success: true })
}
