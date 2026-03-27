import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { userRatelimit, ipRatelimit } from '@/lib/ratelimit'
import { getPlanLimits, isLocked } from '@/lib/plans'
import { LinkedinPostsSchema } from '@/lib/validation'
import { generateLinkedinPosts } from '@/lib/claude'
import type { Plan } from '@/lib/plans'

const ACTION_TYPE = 'linkedin'

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
  let body: { newsletterId: string }
  try {
    body = LinkedinPostsSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // ── 4. Load newsletter + verify ownership ───────────────────
  const { data: newsletter } = await supabase
    .from('newsletters').select('id, workspace_id, content_md')
    .eq('id', body.newsletterId).single()
  if (!newsletter)
    return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 })

  const { data: workspace } = await supabase
    .from('workspaces').select('id').eq('id', newsletter.workspace_id).eq('user_id', user.id).single()
  if (!workspace)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // ── 5. Subscription (admin) ──────────────────────────────────
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions').select('plan, trial_ends_at').eq('workspace_id', workspace.id).single()
  if (!subscription)
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })

  // ── 6. Trial expiry ──────────────────────────────────────────
  if (subscription.plan === 'trial' && new Date(subscription.trial_ends_at!) < new Date())
    return NextResponse.json({ error: 'Trial expired.' }, { status: 403 })

  // ── 7. Feature lock ──────────────────────────────────────────
  if (isLocked(subscription.plan as Plan, 'linkedinPosts'))
    return NextResponse.json({ error: 'LinkedIn Posts are locked on your plan. Upgrade to Pro.' }, { status: 403 })

  // ── 8. Plan limits ───────────────────────────────────────────
  const limits = getPlanLimits(subscription.plan)
  const currentMonth = new Date().toISOString().slice(0, 7)
  const { data: usage } = await supabaseAdmin
    .from('usage_logs').select('count')
    .eq('workspace_id', workspace.id).eq('action_type', ACTION_TYPE).eq('month', currentMonth).maybeSingle()
  if ((usage?.count ?? 0) >= limits.linkedinPosts)
    return NextResponse.json({ error: 'Monthly LinkedIn posts limit reached.' }, { status: 403 })

  // Newsletter already loaded above with ownership check

  // ── 10. Brand voice ──────────────────────────────────────────
  const { data: brandVoice } = await supabase
    .from('brand_voice_profiles').select('content').eq('workspace_id', workspace.id).maybeSingle()

  // ── 11. Generate + save ──────────────────────────────────────
  try {
    const variants = await generateLinkedinPosts(
      newsletter.content_md ?? '',
      brandVoice?.content ?? null,
      subscription.plan,
    )

    const { data: saved } = await supabaseAdmin
      .from('linkedin_posts')
      .insert({ workspace_id: workspace.id, newsletter_id: newsletter.id, variants })
      .select('id').single()

    await supabaseAdmin.rpc('increment_usage', {
      p_workspace_id: workspace.id, p_action_type: ACTION_TYPE, p_month: currentMonth,
    })

    return NextResponse.json({ id: saved?.id, variants })
  } catch (error: any) {
    console.error('LinkedIn post generation failed', error)
    return NextResponse.json({ error: 'Generation failed.' }, { status: 500 })
  }
}
