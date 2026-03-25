'use client'

interface UsageBarProps {
  used: number
  total: number
  label?: string
  showText?: boolean
  className?: string
}

export default function UsageBar({ used, total, label, showText = true, className = '' }: UsageBarProps) {
  const pct = total > 0 ? Math.min(Math.round((used / total) * 100), 100) : 0
  const isNearLimit = pct >= 90
  const isOverHalf = pct >= 50

  const barColor = isNearLimit
    ? 'bg-red-500'
    : isOverHalf
    ? 'bg-amber-500'
    : 'bg-indigo-500'

  return (
    <div className={className}>
      {(label || showText) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {label}
            </span>
          )}
          {showText && (
            <span className={`text-xs font-semibold ${isNearLimit ? 'text-red-500' : 'text-slate-500'}`}>
              {used} / {total}
            </span>
          )}
        </div>
      )}
      <div className="h-1 w-full rounded-full bg-slate-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isNearLimit && showText && (
        <p className="text-[10px] text-red-500 font-medium mt-1">
          Near limit — {total - used} remaining
        </p>
      )}
    </div>
  )
}
