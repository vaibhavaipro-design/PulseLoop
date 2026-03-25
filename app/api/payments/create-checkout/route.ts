import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { userRatelimit, ipRatelimit } from '@/lib/ratelimit'
import { getPlanLimits } from '@/lib/plans'
import { z } from 'zod'

const RequestSchema = z.object({
  plan: z.enum(['starter', 'pro', 'agency']),
})

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
  let body: { plan: string }
  try {
    body = RequestSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid plan selected.' }, { status: 400 })
  }

  // ── 4. Load workspace ────────────────────────────────────────
  const { data: workspace } = await supabase
    .from('workspaces').select('id').eq('user_id', user.id).single()
  if (!workspace)
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

  // ── 5. Get variant ID for the selected plan ──────────────────
  const { getPlanVariantId } = await import('@/lib/payments')
  const variantId = getPlanVariantId(body.plan)
  if (!variantId)
    return NextResponse.json({ error: 'Invalid plan variant.' }, { status: 400 })

  // ── 6. Create checkout session (server-side only) ────────────
  const { createCheckoutSession } = await import('@/lib/payments')
  try {
    const { checkoutUrl } = await createCheckoutSession(
      variantId,
      workspace.id,
      user.email!,
    )

    return NextResponse.json({ checkoutUrl })
  } catch (error) {
    console.error('Checkout creation failed:', error)
    return NextResponse.json({ error: 'Failed to create checkout session.' }, { status: 500 })
  }
}
