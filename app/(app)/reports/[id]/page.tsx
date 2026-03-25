import Topbar from '@/components/layout/Topbar'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import ReportActions from './ReportActions'

export default async function ReportDetailPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('user_id', user!.id)
    .single()

  if (!workspace) return notFound()

  const { data: report } = await supabase
    .from('trend_reports')
    .select(`
      id,
      title,
      content_md,
      created_at,
      niches ( name )
    `)
    .eq('id', params.id)
    .eq('workspace_id', workspace.id)
    .single()

  if (!report) return notFound()

  return (
    <>
      <Topbar 
        title={report.title ?? 'Trend Report'} 
      />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-5 md:p-8 bg-slate-50">
          <div className="max-w-3xl mx-auto">
            
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                  {(report.niches as any)?.name ?? 'General'}
                </span>
                <span className="text-sm font-medium text-slate-500">
                  {new Date(report.created_at).toLocaleDateString('en-GB', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {report.title}
              </h1>
            </div>

            <article className="prose prose-slate prose-indigo max-w-none bg-white border border-slate-200 rounded-2xl p-6 md:p-10 shadow-sm">
              <ReactMarkdown>{report.content_md || '*No content available.*'}</ReactMarkdown>
            </article>

          </div>
        </div>

        {/* Right Sidebar - Actions */}
        <div className="w-[300px] border-l border-slate-200 bg-white flex flex-col shadow-[-4px_0_24px_-12px_rgba(0,0,0,0.05)] z-10 hidden lg:flex relative">
          <div className="p-5 border-b border-slate-100 flex items-center">
            <h3 className="font-bold text-slate-800">Generate Assets</h3>
          </div>
          
          <div className="p-5 overflow-y-auto flex-1">
            <p className="text-sm text-slate-500 mb-6 font-medium">
              Transform this intelligence report into shareable formats using your plan&apos;s credits.
            </p>
            
            <ReportActions reportId={report.id} />
          </div>
        </div>
      </div>
    </>
  )
}
