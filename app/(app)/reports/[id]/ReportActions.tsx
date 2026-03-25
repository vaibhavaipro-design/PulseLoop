'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ReportActions({ reportId }: { reportId: string }) {
  const router = useRouter()
  const [loadingType, setLoadingType] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generateAction = async (type: string, endpoint: string) => {
    setLoadingType(type)
    setError(null)

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Generation failed')
      }

      // Route to appropriate page upon success
      if (type === 'brief') router.push(`/signal-briefs`)
      if (type === 'newsletter') router.push(`/newsletters`)
      if (type === 'dashboard') router.push(`/dashboards`) // Future

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingType(null)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 font-medium">
          {error}
        </div>
      )}

      {/* Signal Brief */}
      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-8 h-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-lg shrink-0">📋</div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Signal Brief</h4>
            <p className="text-[11px] text-slate-500 leading-tight mt-0.5">300-word public summary</p>
          </div>
        </div>
        <button
          onClick={() => generateAction('brief', '/api/signal-brief')}
          disabled={!!loadingType}
          className="w-full py-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
        >
          {loadingType === 'brief' ? 'Generating...' : 'Generate Brief'}
        </button>
      </div>

      {/* Newsletter */}
      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-8 h-8 rounded bg-amber-100 text-amber-600 flex items-center justify-center text-lg shrink-0">✉️</div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Newsletter</h4>
            <p className="text-[11px] text-slate-500 leading-tight mt-0.5">Full draft + LinkedIn posts</p>
          </div>
        </div>
        <button
          onClick={() => generateAction('newsletter', '/api/newsletter-builder')}
          disabled={!!loadingType}
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50 shadow-sm"
        >
          {loadingType === 'newsletter' ? 'Generating...' : 'Build Newsletter'}
        </button>
      </div>

      {/* Dashboard */}
      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-8 h-8 rounded bg-violet-100 text-violet-600 flex items-center justify-center text-lg shrink-0">📈</div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Dashboard</h4>
            <p className="text-[11px] text-slate-500 leading-tight mt-0.5">Client-ready visual report</p>
          </div>
        </div>
        <button
          disabled={true}
          className="w-full py-2 bg-slate-100 text-slate-400 border border-slate-200 text-xs font-bold rounded-lg transition-all cursor-not-allowed"
        >
          Coming Soon
        </button>
      </div>
    </div>
  )
}
