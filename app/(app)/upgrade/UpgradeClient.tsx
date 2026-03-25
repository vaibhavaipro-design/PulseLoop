'use client'

import { useState } from 'react'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '€39',
    period: '/month',
    description: 'For solo consultants tracking 1–3 niches.',
    highlight: false,
    features: [
      '1 workspace',
      '3 niches',
      '4 Trend Reports / month',
      'Scrape every 6 hours',
      'EU data sources',
    ],
    locked: [
      'Signal Briefs',
      'Newsletters',
      'LinkedIn Posts',
      'Dashboards',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '€89',
    period: '/month',
    description: 'For active consultants with multiple niches.',
    highlight: true,
    features: [
      '1 workspace',
      '7 niches',
      '12 Trend Reports / month',
      '12 Signal Briefs / month',
      '4 Newsletters / month',
      '4 LinkedIn Post sets / month',
      '12 Dashboards / month',
      'Scrape every 2 hours',
      'Public share links',
    ],
    locked: [],
  },
  {
    id: 'agency',
    name: 'Agency',
    price: '€199',
    period: '/month',
    description: 'For agencies managing multiple client workspaces.',
    highlight: false,
    features: [
      '5 workspaces',
      '5 niches per workspace',
      '12 Reports / workspace / month',
      'Unlimited dashboards',
      'Scrape every hour',
      'White-label reports',
      'Private file uploads',
      'Custom signal types',
      'Priority support',
    ],
    locked: [],
  },
]

interface Props {
  currentPlan: string
}

export default function UpgradeClient({ currentPlan }: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleUpgrade = async (planId: string) => {
    setLoading(planId)
    setError(null)
    try {
      const res = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create checkout')
      // Backend creates URL — frontend redirects only
      window.location.href = data.checkoutUrl
    } catch (err: any) {
      setError(err.message)
      setLoading(null)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
            Choose your plan
          </h1>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            7-day free trial included. No credit card required to start.
            EU data stays in EU Frankfurt.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id
            const isHigher =
              (plan.id === 'pro' && (currentPlan === 'trial' || currentPlan === 'starter')) ||
              (plan.id === 'agency' && currentPlan !== 'agency') ||
              (plan.id === 'starter' && currentPlan === 'trial')

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl border-2 overflow-hidden flex flex-col transition-all ${
                  plan.highlight
                    ? 'border-indigo-500 shadow-lg shadow-indigo-100'
                    : 'border-slate-200 shadow-sm'
                }`}
              >
                {plan.highlight && (
                  <div className="bg-indigo-600 text-white text-center py-1.5 text-[11px] font-bold uppercase tracking-widest">
                    Most Popular
                  </div>
                )}

                <div className="p-6 flex-1 flex flex-col">
                  <div className="mb-5">
                    <h3 className="text-lg font-extrabold text-slate-900">{plan.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{plan.description}</p>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{plan.price}</span>
                      <span className="text-sm text-slate-400 font-medium">{plan.period}</span>
                    </div>
                  </div>

                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                        <svg className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                    {plan.locked.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-slate-400">
                        <svg className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={isCurrent || loading !== null}
                    className={`w-full h-10 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                      isCurrent
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : plan.highlight
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    {loading === plan.id ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                        </svg>
                        Redirecting...
                      </>
                    ) : isCurrent ? (
                      'Current plan'
                    ) : isHigher ? (
                      `Upgrade to ${plan.name}`
                    ) : (
                      `Switch to ${plan.name}`
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs text-slate-400 mt-8">
          All plans billed in EUR. Cancel anytime. EU VAT may apply.{' '}
          <a href="/settings" className="text-indigo-500 hover:text-indigo-600 font-medium">
            ← Back to settings
          </a>
        </p>
      </div>
    </div>
  )
}
