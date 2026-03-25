import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { userRatelimit, ipRatelimit } from '@/lib/ratelimit'
import { getPlanLimits, isLocked } from '@/lib/plans'
import { SignalBriefSchema } from '@/lib/validation'
import { generateSignalBrief } from '@/lib/claude'
import type { Plan } from '@/lib/plans'

const ACTION_TYPE = 'signal_brief'

export async function POST(request: NextRequest) {
  // ── 1. Auth ──────────────────────────────────────────────────
  const supabase = createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── 2. Rate limit ────────────────────────────────────────────
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const [userLimit, ipLimit] = await Promise.all([
    userRatelimit.limit(user.id),
    ipRatelimit.limit(ip),
  ])
  if (!userLimit.success || !ipLimit.success)
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 })

  // ── 3. Validate ──────────────────────────────────────────────
  let body: { reportId: string }
  try {
    body = SignalBriefSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // ── 4. Load workspace + subscription ─────────────────────────
  const { data: workspace } = await supabase
    .from('workspaces').select('id').eq('user_id', user.id).single()
  if (!workspace)
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

  const { data: subscription } = await supabaseAdmin
    .from('subscriptions').select('plan, trial_ends_at').eq('workspace_id', workspace.id).single()
  if (!subscription)
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })

  if (subscription.plan === 'trial' && new Date(subscription.trial_ends_at!) < new Date())
    return NextResponse.json({ error: 'Trial expired.' }, { status: 403 })

  // ── 5. Check feature lock ────────────────────────────────────
  if (isLocked(subscription.plan as Plan, 'signalBriefs'))
    return NextResponse.json({ error: 'Signal Briefs are locked on your plan. Upgrade to Pro.' }, { status: 403 })

  // ── 6. Check limits ──────────────────────────────────────────
  const limits = getPlanLimits(subscription.plan)
  const currentMonth = new Date().toISOString().slice(0, 7)
  const { data: usage } = await supabaseAdmin
    .from('usage_logs').select('count')
    .eq('workspace_id', workspace.id).eq('action_type', ACTION_TYPE).eq('month', currentMonth).maybeSingle()

  if ((usage?.count ?? 0) >= limits.signalBriefs)
    return NextResponse.json({ error: 'Monthly signal brief limit reached.' }, { status: 403 })

  // ── 7. Load report (with ownership check) ────────────────────
  const { data: report } = await supabase
    .from('trend_reports').select('id, content_md')
    .eq('id', body.reportId).eq('workspace_id', workspace.id).single()
  if (!report)
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  // ── 8. Load brand voice ──────────────────────────────────────
  const { data: brandVoice } = await supabase
    .from('brand_voice_profiles').select('content').eq('workspace_id', workspace.id).maybeSingle()

  // ── 9. Generate ──────────────────────────────────────────────
  try {
    const content = await generateSignalBrief(report.content_md!, brandVoice?.content ?? null, subscription.plan)

    // ── 10. Save ─────────────────────────────────────────────────
    const { data: saved } = await supabaseAdmin
      .from('signal_briefs')
      .insert({
        workspace_id: workspace.id,
        trend_report_id: report.id,
        content_md: content,
      })
      .select('id, share_id').single()

    // ── 11. Increment usage ──────────────────────────────────────
    await supabaseAdmin.rpc('increment_usage', {
      p_workspace_id: workspace.id, p_action_type: ACTION_TYPE, p_month: currentMonth,
    })

    return NextResponse.json({ id: saved?.id, shareId: saved?.share_id, content })
  } catch (error: any) {
    if (error.message === 'CAPACITY_EXCEEDED')
      return NextResponse.json({ error: 'Generation capacity exceeded. Try again later.' }, { status: 503 })
    console.error('Signal brief generation failed', error)
    return NextResponse.json({ error: 'Generation failed.' }, { status: 500 })
  }
}
