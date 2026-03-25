import { createSupabaseServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import Link from 'next/link'

export default async function PublicSignalBriefPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient()

  // The RLS policy "briefs_read_public" ensures we can only read this if share_active = true
  // No auth required!
  const { data: brief } = await supabase
    .from('signal_briefs')
    .select(`
      id,
      content_md,
      trend_reports ( title, niches ( name ) ),
      workspaces ( name )
    `)
    .eq('share_id', params.id)
    .single()

  if (!brief) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-5">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
            🔒
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Private or Missing</h1>
          <p className="text-slate-500 text-sm">
            This Signal Brief is either no longer public or doesn&apos;t exist.
          </p>
        </div>
      </div>
    )
  }

  const title = (brief.trend_reports as any)?.title ?? 'Market Intelligence Brief'
  const nicheName = ((brief.trend_reports as any)?.niches as any)?.name ?? 'General'

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Public Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg leading-none">P</span>
            </div>
            <span className="font-bold text-slate-800 tracking-tight">PulseLoop</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:block">
              Intelligence Brief
            </span>
            <Link 
              href="/" 
              className="h-8 px-4 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors flex items-center justify-center"
            >
              Learn More
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-5 py-12">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 mb-6">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
              {nicheName} • Verified Signal
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
            {title}
          </h1>
          <p className="text-sm font-medium text-slate-500">
            Generated via PulseLoop continuous intelligence
          </p>
        </div>

        <article className="prose prose-slate prose-indigo max-w-none bg-white border border-slate-200 rounded-3xl p-8 md:p-12 shadow-sm">
          <ReactMarkdown>{brief.content_md || ''}</ReactMarkdown>
        </article>

        <div className="mt-16 pt-8 border-t border-slate-200 text-center">
          <h3 className="text-lg font-bold text-slate-800 mb-2">Automate your market intelligence</h3>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
            Get actionable insights like this delivered to your inbox every week. PulseLoop connects to 18 data sources for continuous tracking.
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
