// supabase/functions/send-monday-digest/index.ts
// Triggered by pg_cron every Monday morning at 7 AM UTC.
// Reads completed reports, builds email content, sends via Resend.
// No external HTTP endpoint — runs entirely within Supabase.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL = 'PulseLoop <hello@pulseloop.io>'

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`Failed to send email to ${to}:`, error)
  }
}

Deno.serve(async () => {
  try {
    // Get all active workspaces with their users and niches
    const { data: workspaces, error: wsError } = await supabase
      .from('workspaces')
      .select('id, user_id, name')

    if (wsError || !workspaces) {
      console.error('Failed to fetch workspaces:', wsError)
      return new Response(JSON.stringify({ error: 'Failed to fetch workspaces' }), { status: 500 })
    }

    let emailsSent = 0

    for (const workspace of workspaces) {
      // Get user email
      const { data: userData } = await supabase.auth.admin.getUserById(workspace.user_id)
      if (!userData?.user?.email) continue

      // Check subscription is active
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan, trial_ends_at')
        .eq('workspace_id', workspace.id)
        .single()

      if (!sub) continue
      if (sub.plan === 'trial' && new Date(sub.trial_ends_at) < new Date()) continue

      // Get niches with recent reports
      const { data: niches } = await supabase
        .from('niches')
        .select('id, name')
        .eq('workspace_id', workspace.id)
        .eq('is_active', true)

      if (!niches || niches.length === 0) continue

      for (const niche of niches) {
        // Get the most recent report for this niche (last 7 days)
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)

        const { data: reports } = await supabase
          .from('trend_reports')
          .select('title, content_md, created_at')
          .eq('workspace_id', workspace.id)
          .eq('niche_id', niche.id)
          .gte('created_at', weekAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(1)

        if (!reports || reports.length === 0) continue

        const report = reports[0]
        const preview = report.content_md?.slice(0, 300) ?? 'New report available.'
        const topSignal = report.title ?? 'New Intelligence Ready'
        const weekOf = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

        await sendEmail(
          userData.user.email,
          `${niche.name} — ${topSignal} | Week of ${weekOf}`,
          `
          <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <p style="color: #6366F1; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
              PulseLoop Weekly Digest
            </p>
            <h1 style="color: #0F172A; font-size: 24px; margin-bottom: 16px;">
              ${niche.name} — Week of ${weekOf}
            </h1>
            <div style="background: #F8FAFC; border-left: 4px solid #6366F1; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
              <p style="color: #1E293B; font-size: 16px; line-height: 1.6; margin: 0;">
                ${preview}...
              </p>
            </div>
            <a href="https://pulseloop.io/overview"
              style="display: inline-block; background: #6366F1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              View Full Report →
            </a>
            <p style="color: #94A3B8; font-size: 13px; margin-top: 32px;">
              You receive this email because you have an active niche on PulseLoop.
            </p>
          </div>
          `
        )

        emailsSent++
      }
    }

    console.log(`Monday digest: sent ${emailsSent} emails`)
    return new Response(JSON.stringify({ success: true, emailsSent }), { status: 200 })
  } catch (err) {
    console.error('Monday digest failed:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 })
  }
})
