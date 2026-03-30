import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  // ── 0. Validate ID format ────────────────────────────────────
  if (!z.string().uuid().safeParse(params.id).success)
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  // ── 1. Auth ──────────────────────────────────────────────────
  const supabase = createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── 2. Load workspace via user client (RLS ensures ownership) ─
  const { data: workspace } = await supabase
    .from('workspaces').select('id').eq('user_id', user.id).order('created_at').limit(1).single()
  if (!workspace)
    return NextResponse.json({ error: 'No workspace' }, { status: 404 })

  // ── 3. Verify ownership + delete in one step ─────────────────
  //       Both .eq('id') AND .eq('workspace_id') required — never trust ID alone
  const { error } = await supabaseAdmin
    .from('trend_reports')
    .delete()
    .eq('id', params.id)
    .eq('workspace_id', workspace.id)

  if (error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })

  return NextResponse.json({ success: true })
}
