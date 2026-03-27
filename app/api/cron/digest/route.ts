import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendMondayDigest } from '@/lib/email'

export async function GET(request: NextRequest) {
  // ── CRON_SECRET — ABSOLUTE FIRST THING ───────────────────────
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn('Unauthorized cron digest attempt', { ip: request.headers.get('x-forwarded-for') })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Query trend_reports from last 7 days with niche info
  const { data: recentReports, error: reportsError } = await supabaseAdmin
    .from('trend_reports')
    .select('id, title, content_md, workspace_id, created_at, niches ( name )')
    .gte('created_at', sevenDaysAgo)
    .order('created_at', { ascending: false })

  if (reportsError) {
    console.error('Digest cron: failed to query trend_reports', reportsError)
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 })
  }

  if (!recentReports || recentReports.length === 0) {
    return NextResponse.json({ message: 'No recent reports', emailsSent: 0 })
  }

  // Deduplicate: one report per workspace (first = most recent due to order)
  const workspaceReports = new Map<string, typeof recentReports[number]>()
  for (const report of recentReports) {
    if (!workspaceReports.has(report.workspace_id)) {
      workspaceReports.set(report.workspace_id, report)
    }
  }

  let emailsSent = 0

  const entries = Array.from(workspaceReports.entries())
  for (const [workspaceId, report] of entries) {
    try {
      const { data: workspace } = await supabaseAdmin
        .from('workspaces').select('user_id').eq('id', workspaceId).single()
      if (!workspace) continue

      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(workspace.user_id)
      if (!user?.email) continue

      // Build preview: first 300 chars, strip markdown headings
      const preview = (report.content_md ?? '').replace(/^#{1,6}\s+.+$/gm, '').trim().slice(0, 300)
      const nicheName = (report.niches as any)?.name ?? 'Your Niche'
      const topSignal =
        preview.split('\n').find((l: string) => l.trim().length > 20)?.slice(0, 80) ?? 'New intelligence brief'
      const weekOf = new Date(report.created_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })

      await sendMondayDigest(user.email, nicheName, topSignal, weekOf, preview)
      emailsSent++
    } catch (err) {
      console.error(`Digest email failed for workspace ${workspaceId}:`, err)
    }
  }

  return NextResponse.json({ success: true, emailsSent })
}
