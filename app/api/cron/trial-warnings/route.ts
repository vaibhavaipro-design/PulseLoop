import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendTrialWarningEmail } from '@/lib/email'

export async function GET(request: NextRequest) {
  // ── CRON_SECRET — ABSOLUTE FIRST THING ───────────────────────
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn('Unauthorized cron trial-warnings attempt', { ip: request.headers.get('x-forwarded-for') })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  let emailsSent = 0

  for (const daysLeft of [3, 2, 1, 0]) {
    const windowStart = new Date(now)
    windowStart.setDate(windowStart.getDate() + daysLeft)
    windowStart.setHours(0, 0, 0, 0)

    const windowEnd = new Date(windowStart)
    windowEnd.setDate(windowEnd.getDate() + 1)

    const { data: trialSubs } = await supabaseAdmin
      .from('subscriptions')
      .select('workspace_id, trial_ends_at')
      .eq('plan', 'trial')
      .gte('trial_ends_at', windowStart.toISOString())
      .lt('trial_ends_at', windowEnd.toISOString())

    if (!trialSubs || trialSubs.length === 0) continue

    for (const sub of trialSubs) {
      try {
        const { data: workspace } = await supabaseAdmin
          .from('workspaces').select('user_id').eq('id', sub.workspace_id).single()
        if (!workspace) continue

        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(workspace.user_id)
        if (!user?.email) continue

        await sendTrialWarningEmail(user.email, daysLeft)
        emailsSent++
      } catch (err) {
        console.error(`Trial warning failed for workspace ${sub.workspace_id}:`, err)
      }
    }
  }

  return NextResponse.json({ success: true, emailsSent })
}
