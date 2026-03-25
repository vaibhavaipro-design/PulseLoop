import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'

// PLAN MAP: translate Lemon Squeezy variant IDs to internal plan names
const VARIANT_TO_PLAN: Record<string, string> = {
  [process.env.LS_VARIANT_STARTER!]: 'starter',
  [process.env.LS_VARIANT_PRO!]: 'pro',
  [process.env.LS_VARIANT_AGENCY!]: 'agency',
}

export async function POST(request: NextRequest) {
  // ── 1. VERIFY SIGNATURE FIRST — before reading anything ──────
  const sig = request.headers.get('X-Signature')
  const rawBody = await request.text()   // must read as text, not json

  const expected = crypto
    .createHmac('sha256', process.env.LEMON_SQUEEZY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex')

  if (!sig || sig !== expected) {
    console.warn('Invalid webhook signature attempt', { ip: request.headers.get('x-forwarded-for') })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // ── 2. Parse event ────────────────────────────────────────────
  const event = JSON.parse(rawBody)
  const eventType: string = event.meta?.event_name

  // ── 3. Look up plan from variant ID — NEVER trust body for plan name ──
  const variantId = String(event.data?.attributes?.variant_id)
  const plan = VARIANT_TO_PLAN[variantId]

  // ── 4. Get workspace by Lemon Squeezy customer ID ─────────────
  const customerId = String(event.data?.attributes?.customer_id)
  const subscriptionId = String(event.data?.id)

  if (eventType === 'subscription_created' || eventType === 'subscription_updated') {
    if (!plan) {
      console.error('Unknown variant ID in webhook', { variantId })
      return NextResponse.json({ error: 'Unknown variant' }, { status: 400 })
    }

    // Find workspace by customer ID (set during first checkout)
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('workspace_id')
      .eq('lemon_squeezy_customer_id', customerId)
      .single()

    if (sub) {
      await supabaseAdmin.from('subscriptions').update({
        plan,
        lemon_squeezy_subscription_id: subscriptionId,
        updated_at: new Date().toISOString(),
      }).eq('workspace_id', sub.workspace_id)
    }
  }

  if (eventType === 'subscription_cancelled' || eventType === 'subscription_expired') {
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('workspace_id')
      .eq('lemon_squeezy_subscription_id', subscriptionId)
      .single()

    if (sub) {
      await supabaseAdmin.from('subscriptions').update({
        plan: 'starter',  // grace period — see PRD cancellation flow
        updated_at: new Date().toISOString(),
      }).eq('workspace_id', sub.workspace_id)
    }
  }

  return NextResponse.json({ received: true })
}
