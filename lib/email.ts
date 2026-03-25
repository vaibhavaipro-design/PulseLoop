import 'server-only'
import { Resend } from 'resend'

// Lazily initialize Resend to avoid build-time crashes if key is missing
function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key || key.includes('placeholder')) {
    console.warn('RESEND_API_KEY is missing or placeholder. Emails will not be sent.')
    return null
  }
  return new Resend(key)
}

const FROM_EMAIL = 'PulseLoop <hello@pulseloop.io>'

/**
 * Send welcome email after signup.
 */
export async function sendWelcomeEmail(email: string) {
  const resend = getResend()
  if (!resend) return

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Welcome to PulseLoop — Your Market Intelligence OS',
    html: `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #0F172A; font-size: 24px; margin-bottom: 16px;">Welcome to PulseLoop 🚀</h1>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          Your 7-day Pro trial is now active. Here's what you can do:
        </p>
        <ul style="color: #475569; font-size: 16px; line-height: 2;">
          <li>Create up to 3 niches and start capturing signals</li>
          <li>Generate trend reports, signal briefs, and dashboards</li>
          <li>Build newsletters and LinkedIn posts in your brand voice</li>
        </ul>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          <strong>Pro tip:</strong> Set up your brand voice first — every output will match your writing style.
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/overview"
          style="display: inline-block; background: #6366F1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">
          Go to your Dashboard →
        </a>
        <p style="color: #94A3B8; font-size: 14px; margin-top: 32px;">
          Questions? Reply to this email — it goes straight to the founder.
        </p>
      </div>
    `,
  })
}

/**
 * Send trial expiry warning emails (Day 5, 6, 7).
 */
export async function sendTrialWarningEmail(email: string, daysLeft: number) {
  const resend = getResend()
  if (!resend) return

  const subjects: Record<number, string> = {
    3: 'Your PulseLoop trial ends in 3 days',
    2: 'Your PulseLoop trial ends tomorrow',
    1: '⚠️ Last day of your PulseLoop trial',
    0: 'Your PulseLoop trial has ended',
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: subjects[daysLeft] ?? `PulseLoop trial: ${daysLeft} days left`,
    html: `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #0F172A; font-size: 24px; margin-bottom: 16px;">
          ${daysLeft > 0 ? `${daysLeft} day${daysLeft > 1 ? 's' : ''} left on your trial` : 'Your trial has ended'}
        </h1>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          ${daysLeft > 0
            ? 'Your signals are still being collected. Choose a plan to keep generating reports.'
            : 'Your 847 signals are waiting for you. Choose a plan to unlock them.'}
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings"
          style="display: inline-block; background: #6366F1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">
          Choose a Plan →
        </a>
      </div>
    `,
  })
}

/**
 * Send Monday Digest email with report preview.
 */
export async function sendMondayDigest(
  email: string,
  nicheName: string,
  topSignal: string,
  weekOf: string,
  reportPreview: string
) {
  const resend = getResend()
  if (!resend) return

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `${nicheName} — ${topSignal} | Week of ${weekOf}`,
    html: `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <p style="color: #6366F1; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
          PulseLoop Weekly Digest
        </p>
        <h1 style="color: #0F172A; font-size: 24px; margin-bottom: 16px;">
          ${nicheName} — Week of ${weekOf}
        </h1>
        <div style="background: #F8FAFC; border-left: 4px solid #6366F1; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
          <p style="color: #1E293B; font-size: 16px; line-height: 1.6; margin: 0;">
            ${reportPreview}
          </p>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/overview"
          style="display: inline-block; background: #6366F1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          View Full Report →
        </a>
        <p style="color: #94A3B8; font-size: 13px; margin-top: 32px;">
          You receive this email because you have an active niche on PulseLoop.
        </p>
      </div>
    `,
  })
}

/**
 * Send usage warning email (at 90% of plan limit).
 */
export async function sendUsageWarningEmail(
  email: string,
  feature: string,
  used: number,
  limit: number
) {
  const resend = getResend()
  if (!resend) return

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `PulseLoop: You've used ${Math.round((used / limit) * 100)}% of your ${feature} quota`,
    html: `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #0F172A; font-size: 24px; margin-bottom: 16px;">
          Usage Alert: ${feature}
        </h1>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          You've used ${used} of ${limit} ${feature} this month.
          Upgrade your plan for higher limits.
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings"
          style="display: inline-block; background: #6366F1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">
          Upgrade Plan →
        </a>
      </div>
    `,
  })
}

