'use client'

import Button from './Button'

interface UpgradeNudgeProps {
  message?: string
  submessage?: string
  plan?: string
}

export default function UpgradeNudge({
  message = 'Unlock the full weekly loop — upgrade to Pro',
  submessage = 'Signal Briefs and Newsletters are locked on Starter. Pro unlocks all 4 content types from every Trend Report.',
  plan = 'Pro',
}: UpgradeNudgeProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3 mb-4 animate-fade-in">
      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-base flex-shrink-0 shadow-sm">
        ⚡
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-indigo-600">{message}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{submessage}</p>
      </div>
      <Button variant="primary" size="sm" className="flex-shrink-0">
        Upgrade to {plan} →
      </Button>
    </div>
  )
}
