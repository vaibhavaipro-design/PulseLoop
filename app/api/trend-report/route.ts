import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { userRatelimit, ipRatelimit } from '@/lib/ratelimit'
import { getPlanLimits } from '@/lib/plans'
import { TrendReportSchema } from '@/lib/validation'
import { ragQuery } from '@/lib/rag'
import { generateReport } from '@/lib/claude'

const ACTION_TYPE = 'trend_report'

export async function POST(request: NextRequest) {
  // ── 1. Auth ──────────────────────────────────────────────────
  const supabase = createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── 2. Rate limit — BOTH user AND IP ─────────────────────────
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const [userLimit, ipLimit] = await Promise.all([
    userRatelimit.limit(user.id),
    ipRatelimit.limit(ip),
  ])
  if (!userLimit.success || !ipLimit.success)
    return NextResponse.json({ error: 'Rate limit exceeded. Try again shortly.' }, { status: 429 })

  // ── 3. Validate request body ──────────────────────────────────
  let body: { nicheId: string; nicheQuery: string; workspaceId?: string; privateContext?: string }
  try {
    const raw = await request.json()
    body = TrendReportSchema.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // ── 4. Load workspace ─────────────────────────────────────────
  // If workspaceId provided (Agency multi-workspace), verify it belongs to the user
  const wsQuery = supabase.from('workspaces').select('id, name').eq('user_id', user.id)
  const { data: workspace, error: wsError } = body.workspaceId
    ? await wsQuery.eq('id', body.workspaceId).single()
    : await wsQuery.order('created_at').limit(1).single()
  if (!workspace || wsError)
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

  // ── 5. Load subscription via ADMIN client ─────────────────────
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('plan, trial_ends_at')
    .eq('workspace_id', workspace.id)
    .single()
  if (!subscription)
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })

  // Check trial expiry
  if (subscription.plan === 'trial' && new Date(subscription.trial_ends_at!) < new Date())
    return NextResponse.json({ error: 'Trial expired. Choose a plan to continue.' }, { status: 403 })

  // ── 6. Verify niche belongs to this workspace ─────────────────
  const { data: niche } = await supabase
    .from('niches')
    .select('id, name')
    .eq('id', body.nicheId)
    .eq('workspace_id', workspace.id)  // ← critical: ownership check
    .single()
  if (!niche)
    return NextResponse.json({ error: 'Niche not found' }, { status: 404 })

  // ── 7. Check plan limits ──────────────────────────────────────
  const limits = getPlanLimits(subscription.plan)
  const currentMonth = new Date().toISOString().slice(0, 7)
  const { data: usage } = await supabaseAdmin
    .from('usage_logs')
    .select('count')
    .eq('workspace_id', workspace.id)
    .eq('action_type', ACTION_TYPE)
    .eq('month', currentMonth)
    .maybeSingle()

  if ((usage?.count ?? 0) >= limits.reportsPerMonth)
    return NextResponse.json({ error: 'Monthly limit reached. Upgrade to continue.' }, { status: 403 })

  // ── 8. Load brand voice ───────────────────────────────────────
  const { data: brandVoice } = await supabase
    .from('brand_voice_profiles').select('content').eq('workspace_id', workspace.id).maybeSingle()

  // ── 9. RAG + Claude ───────────────────────────────────────────
  try {
    const signals = await ragQuery(workspace.id, body.nicheQuery)
    // Only Agency plan can inject private context
    const privateCtx = limits.privateUpload ? body.privateContext : undefined
    const result = await generateReport(signals, brandVoice?.content ?? null, body.nicheQuery, subscription.plan, privateCtx)

    // ── 10. Save via ADMIN client ─────────────────────────────────
    const { data: saved } = await supabaseAdmin
      .from('trend_reports')
      .insert({
        workspace_id: workspace.id,
        niche_id: niche.id,
        title: result.title,
        content_md: result.content_md,
        source_health: result.source_health,
      })
      .select('id')
      .single()

    // ── 11. Increment usage ─────────────────────────────────────
    await supabaseAdmin.rpc('increment_usage', {
      p_workspace_id: workspace.id,
      p_action_type: ACTION_TYPE,
      p_month: currentMonth,
    })

    return NextResponse.json({ id: saved?.id, ...result })

  } catch (error: any) {
    if (error.message === 'CAPACITY_EXCEEDED') {
      return NextResponse.json({
        error: 'Intelligence generation is temporarily at capacity. Please try again in a few hours.',
      }, { status: 503 })
    }
    console.error('Report generation failed', error)
    return NextResponse.json({ error: 'Generation failed. Please try again.' }, { status: 500 })
  }
}
