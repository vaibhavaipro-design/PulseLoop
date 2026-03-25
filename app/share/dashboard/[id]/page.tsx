import { supabaseAdmin } from '@/lib/supabase/admin'
import Link from 'next/link'

export default async function PublicDashboardPage({ params }: { params: { id: string } }) {
  // Public page — use admin client to bypass auth, but filter on share_active
  const { data: dashboard } = await supabaseAdmin
    .from('dashboards')
    .select(`
      id,
      dashboard_json,
      style,
      share_active,
      trend_reports ( title, niches ( name ) )
    `)
    .eq('share_id', params.id)
    .eq('share_active', true)
    .single()

  if (!dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-5">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
            🔒
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Private or Missing</h1>
          <p className="text-slate-500 text-sm">
            This dashboard is either no longer public or doesn&apos;t exist.
          </p>
          <Link href="/" className="mt-4 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-700">
            ← Back to PulseLoop
          </Link>
        </div>
      </div>
    )
  }

  const report = dashboard.trend_reports as any
  const niche = report?.niches?.name ?? 'General'
  const title = report?.title ?? 'Market Intelligence Dashboard'
  const dbJson = dashboard.dashboard_json ?? {}

  const header: { title?: string; subtitle?: string; date?: string } = dbJson.header ?? {}
  const kpiCards: Array<{ label: string; value: string | number; change?: string }> =
    Array.isArray(dbJson.kpi_cards) ? dbJson.kpi_cards : []
  const keyInsights: string[] = Array.isArray(dbJson.key_insights) ? dbJson.key_insights : []
  const signalBreakdown: Record<string, number> = dbJson.signal_breakdown?.by_platform ?? {}
  const sourceHealth: Record<string, any> = dbJson.source_health ?? {}

  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Public Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg leading-none">P</span>
            </div>
            <span className="font-bold text-slate-800 tracking-tight">PulseLoop</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:block">
              {niche} · Intelligence Dashboard
            </span>
            <Link
              href="/signup"
              className="h-8 px-4 rounded-full bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white transition-colors flex items-center justify-center"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-5 py-10">
        {/* Page title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
              {niche}
            </span>
            <span className="text-xs text-slate-400">{header.date ?? today}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {header.title ?? title}
          </h1>
          {header.subtitle && (
            <p className="text-slate-500 mt-2">{header.subtitle}</p>
          )}
        </div>

        {/* KPI Cards */}
        {kpiCards.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {kpiCards.map((kpi, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 text-center shadow-sm">
                <div className="text-2xl font-extrabold text-slate-900 tracking-tight">{kpi.value}</div>
                <div className="text-xs font-semibold text-slate-500 mt-1">{kpi.label}</div>
                {kpi.change && (
                  <div className={`text-[10px] font-bold mt-2 px-2 py-0.5 rounded-full inline-block ${
                    kpi.change.startsWith('+')
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-rose-50 text-rose-600'
                  }`}>
                    {kpi.change}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Key Insights */}
          {keyInsights.length > 0 && (
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-800 mb-4 pb-3 border-b border-slate-100">
                Key Insights
              </h2>
              <ul className="space-y-3">
                {keyInsights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Signal Breakdown */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            {Object.keys(signalBreakdown).length > 0 && (
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Signal Sources
                </h3>
                <ul className="space-y-2">
                  {Object.entries(signalBreakdown)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .slice(0, 6)
                    .map(([platform, count]) => {
                      const total = Object.values(signalBreakdown).reduce((s, v) => s + (v as number), 0)
                      const pct = total > 0 ? Math.round(((count as number) / total) * 100) : 0
                      return (
                        <li key={platform} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium text-slate-700 capitalize">{platform}</span>
                            <span className="font-bold text-slate-500">{pct}%</span>
                          </div>
                          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </li>
                      )
                    })}
                </ul>
              </div>
            )}

            {/* Generated by badge */}
            <div className="pt-4 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
                Powered by
              </p>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">P</span>
                </div>
                <span className="text-xs font-bold text-slate-700">PulseLoop</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                AI-powered market intelligence from 18 sources, tracked continuously.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Footer */}
        <div className="mt-16 pt-8 border-t border-slate-200 text-center">
          <h3 className="text-lg font-bold text-slate-800 mb-2">Want intelligence like this for your niche?</h3>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
            PulseLoop tracks 18 data sources continuously and delivers weekly dashboards, newsletters, and signal briefs — all in your brand voice.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-indigo-200"
          >
            Start your 7-day free trial
          </Link>
        </div>
      </main>
    </div>
  )
}
