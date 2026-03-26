import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { userRatelimit, ipRatelimit } from '@/lib/ratelimit'
import { getPlanLimits, isLocked } from '@/lib/plans'
import { DashboardSchema } from '@/lib/validation'
import { generateDashboard } from '@/lib/claude'
import type { Plan } from '@/lib/plans'

const ACTION_TYPE = 'dashboard'

export async function POST(request: NextRequest) {
  // ── 1. Auth ──────────────────────────────────────────────────
  const supabase = createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── 2. Rate limit ────────────────────────────────────────────
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const [userLimit, ipLimit] = await Promise.all([
    userRatelimit.limit(user.id), ipRatelimit.limit(ip),
  ])
  if (!userLimit.success || !ipLimit.success)
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 })

  // ── 3. Validate ──────────────────────────────────────────────
  let body: { reportId: string; style?: string; template?: string }
  try {
    body = DashboardSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // ── 4. Load workspace ────────────────────────────────────────
  const { data: workspace } = await supabase
    .from('workspaces').select('id').eq('user_id', user.id).order('created_at').limit(1).single()
  if (!workspace)
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

  // ── 5. Load subscription via admin ───────────────────────────
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions').select('plan, trial_ends_at').eq('workspace_id', workspace.id).single()
  if (!subscription)
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })

  // ── 6. Check trial expiry ────────────────────────────────────
  if (subscription.plan === 'trial' && new Date(subscription.trial_ends_at!) < new Date())
    return NextResponse.json({ error: 'Trial expired.' }, { status: 403 })

  // ── 7. Feature lock check (dashboards = 0 for starter) ──────
  if (isLocked(subscription.plan as Plan, 'dashboards'))
    return NextResponse.json({ error: 'Dashboards are locked on your plan. Upgrade to Pro.' }, { status: 403 })

  // ── 8. Check plan limits ─────────────────────────────────────
  const limits = getPlanLimits(subscription.plan)
  const currentMonth = new Date().toISOString().slice(0, 7)
  if (limits.dashboards !== Infinity) {
    const { data: usage } = await supabaseAdmin
      .from('usage_logs').select('count')
      .eq('workspace_id', workspace.id).eq('action_type', ACTION_TYPE).eq('month', currentMonth).maybeSingle()
    if ((usage?.count ?? 0) >= (limits.dashboards as number))
      return NextResponse.json({ error: 'Monthly dashboard limit reached.' }, { status: 403 })
  }

  // ── 9. Load report with ownership check ──────────────────────
  const { data: report } = await supabase
    .from('trend_reports').select('id, title, content_md')
    .eq('id', body.reportId).eq('workspace_id', workspace.id).single()
  if (!report)
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  // ── 10. Generate dashboard JSON ──────────────────────────────
  try {
    const style = body.style ?? 'minimal'
    const template = body.template ?? 'weekly-brief'
    const dashboardJson = await generateDashboard(
      report.content_md ?? '',
      style,
      template,
      subscription.plan
    )

    // ── 11. Save via admin + increment usage ─────────────────
    const { data: saved } = await supabaseAdmin
      .from('dashboards')
      .insert({
        workspace_id: workspace.id,
        trend_report_id: report.id,
        dashboard_json: dashboardJson,
        style,
        template,
        share_active: false,
      })
      .select('id, share_id').single()

    await supabaseAdmin.rpc('increment_usage', {
      p_workspace_id: workspace.id, p_action_type: ACTION_TYPE, p_month: currentMonth,
    })

    return NextResponse.json({ id: saved?.id, shareId: saved?.share_id, dashboardJson })
  } catch (error: any) {
    if (error.message === 'CAPACITY_EXCEEDED')
      return NextResponse.json({ error: 'Generation capacity exceeded. Try again in a few hours.' }, { status: 503 })
    console.error('Dashboard generation failed', error)
    return NextResponse.json({ error: 'Generation failed.' }, { status: 500 })
  }
}
