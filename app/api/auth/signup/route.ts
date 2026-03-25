import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { signupRatelimit } from '@/lib/ratelimit'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { SignupSchema } from '@/lib/validation'
import { sendWelcomeEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  // ── 1. IP rate limit BEFORE creating account ──────────────────
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { success } = await signupRatelimit.limit(ip)
  if (!success)
    return NextResponse.json({ error: 'Too many signup attempts. Try again later.' }, { status: 429 })

  // ── 2. Validate input ────────────────────────────────────────
  let body: { email: string; password: string }
  try {
    const raw = await request.json()
    body = SignupSchema.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid email or password (min 8 characters).' }, { status: 400 })
  }

  // ── 3. Create auth user ──────────────────────────────────────
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
  })
  if (authError || !authData.user)
    return NextResponse.json({ error: authError?.message ?? 'Signup failed' }, { status: 400 })

  // ── 4. Create workspace ──────────────────────────────────────
  const { data: workspace } = await supabaseAdmin
    .from('workspaces')
    .insert({ user_id: authData.user.id, name: 'My Workspace' })
    .select('id')
    .single()

  if (!workspace) {
    // Cleanup: delete the auth user if workspace creation fails
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: 'Failed to create workspace.' }, { status: 500 })
  }

  // ── 5. Create subscription (plan = 'trial') ──────────────────
  const trialEnd = new Date()
  trialEnd.setDate(trialEnd.getDate() + 7)
  await supabaseAdmin.from('subscriptions').insert({
    workspace_id: workspace.id,
    plan: 'trial',
    trial_ends_at: trialEnd.toISOString(),
  })

  // ── 6. Initialize usage logs ─────────────────────────────────
  const currentMonth = new Date().toISOString().slice(0, 7)
  const usageTypes = ['trend_report', 'signal_brief', 'newsletter', 'dashboard']
  await supabaseAdmin.from('usage_logs').insert(
    usageTypes.map(type => ({
      workspace_id: workspace.id,
      action_type: type,
      month: currentMonth,
      count: 0,
    }))
  )

  // ── 7. Send welcome email (server-only) ──────────────────────
  try {
    await sendWelcomeEmail(authData.user.email!)
  } catch {
    // Don't fail signup if email fails — log and continue
    console.error('Welcome email failed for', authData.user.email)
  }

  return NextResponse.json({ success: true })
}
