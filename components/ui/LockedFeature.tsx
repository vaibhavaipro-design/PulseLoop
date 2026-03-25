'use client'

import Button from './Button'

interface LockedFeatureProps {
  feature: string
  requiredPlan?: string
  children?: React.ReactNode
}

export default function LockedFeature({ feature, requiredPlan = 'Pro', children }: LockedFeatureProps) {
  return (
    <div className="relative rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
      {/* Lock icon */}
      <div className="mx-auto mb-3 w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>

      <h3 className="text-sm font-semibold text-slate-800 mb-1">
        {feature} — {requiredPlan} only
      </h3>
      <p className="text-xs text-slate-500 mb-4 max-w-xs mx-auto">
        Upgrade to {requiredPlan} to unlock {feature.toLowerCase()} and the complete weekly intelligence loop.
      </p>

      <Button variant="upgrade" size="sm">
        Upgrade to {requiredPlan} →
      </Button>

      {children}
    </div>
  )
}
