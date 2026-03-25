'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteDashboard } from '@/app/actions/dashboards'
import type { Plan } from '@/lib/plans'

interface Workspace { id: string; name: string }
interface Niche { id: string; name: string; icon: string | null; workspace_id: string }
interface Report { id: string; workspace_id: string; title: string; niches: { id: string; name: string; icon: string | null } | null }
interface Dashboard {
  id: string
  workspace_id: string
  share_id: string
  share_active: boolean
  style: string | null
  template: string | null
  dashboard_json: any
  created_at: string
  trend_reports: { id: string; title: string; niches: { id: string; name: string; icon: string | null } | null } | null
}

interface Props {
  dashboards: Dashboard[]
  reports: Report[]
  workspaces: Workspace[]
  niches: Niche[]
  plan: Plan
  locked: boolean
  dashboardLimit: number | typeof Infinity
  usedThisMonth: number
  primaryWorkspaceId: string | null
  appUrl: string
}

// ── Mini bar chart thumbnail ──────────────────────────────────────────────────

function MiniBarChart({ dbJson, isAgency }: { dbJson: any; isAgency: boolean }) {
  let heights: number[] = [38, 30, 42, 26, 52, 36, 40, 68]

  if (Array.isArray(dbJson?.trend_chart_data) && dbJson.trend_chart_data.length >= 3) {
    const vals: number[] = dbJson.trend_chart_data.slice(0, 8).map((d: any) =>
      typeof d.value === 'number' ? d.value : typeof d.count === 'number' ? d.count : 0
    )
    const maxVal = Math.max(...vals, 1)
    heights = vals.map((v) => Math.max(Math.round((v / maxVal) * 60), 6))
    while (heights.length < 8) heights.push(heights[heights.length - 1] ?? 20)
  }

  const lastIdx = heights.length - 1

  return (
    <div
      className="h-[100px] flex items-end gap-1 px-3 py-2.5 relative overflow-hidden"
      style={isAgency
        ? { background: 'linear-gradient(135deg, #FFFBF0, #FFF3D0)' }
        : { background: '#F7F7FC' }
      }
    >
      {heights.map((h, i) => (
        <div
          key={i}
          className="rounded-t-sm flex-shrink-0 transition-opacity"
          style={{
            height: `${h}px`,
            width: '11px',
            background: i === lastIdx
              ? (isAgency ? '#F5A623' : '#5B5FC7')
              : (isAgency ? 'rgba(245,166,35,0.35)' : '#A3A6E8'),
          }}
        />
      ))}
    </div>
  )
}

// ── Dashboard Card ────────────────────────────────────────────────────────────

function DashboardCard({
  dashboard,
  isAgency,
  isLatest,
}: {
  dashboard: Dashboard
  isAgency: boolean
  isLatest: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [deleted, setDeleted] = useState(false)

  if (deleted) return null

  const report = dashboard.trend_reports
  const niche = report?.niches as any
  const nicheName = niche?.name ?? 'General'
  const nicheIcon = niche?.icon ?? ''
  const title = report?.title ?? 'Dashboard'
  const dbJson = dashboard.dashboard_json ?? {}
  const totalSignals = dbJson.source_health?.total_signals ?? 0
  const signalStrength = totalSignals > 400 ? 'hi' : 'med'

  const date = new Date(dashboard.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  const featureCls = isLatest
    ? isAgency ? ' border-yellow-300' : ' border-indigo-300'
    : ''

  const handleDelete = () => {
    if (!confirm('Delete this dashboard?')) return
    setDeleted(true)
    startTransition(() => deleteDashboard(dashboard.id).catch(() => setDeleted(false)))
  }

  return (
    <div
      className={`bg-white border border-slate-200 rounded-[13px] overflow-hidden flex flex-col transition-shadow hover:shadow-[0_4px_16px_rgba(91,95,199,0.10)]${featureCls} relative`}
    >
      {isPending && (
        <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center rounded-[13px]">
          <svg className="w-5 h-5 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      )}

      {/* Thumbnail */}
      <MiniBarChart dbJson={dbJson} isAgency={isAgency} />

      {/* Body */}
      <div className="px-3.5 pt-3 pb-2 flex-1">
        <div className={`text-[10px] font-bold uppercase tracking-[0.4px] mb-0.5 ${isAgency ? 'text-amber-600' : 'text-indigo-600'}`}>
          {nicheIcon ? `${nicheIcon} ` : ''}{nicheName}
        </div>
        <div className="text-[13px] font-semibold text-slate-800 mb-2 leading-[1.35] line-clamp-2">
          {title}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400">{date}</span>
          {isLatest && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
              Latest
            </span>
          )}
          {totalSignals > 0 && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
              signalStrength === 'hi' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
            }`}>
              {totalSignals} signals
            </span>
          )}
          {isAgency && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
              ✦ White-label
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1 px-3 py-2 border-t border-slate-100 bg-slate-50">
        <span className="text-[10px] text-slate-400">👁 0 views</span>
        <div className="ml-auto flex gap-0.5">
          <a
            href={`/share/dashboard/${dashboard.share_id}`}
            target="_blank"
            className={`h-[26px] px-2 rounded-md text-[11px] font-medium inline-flex items-center ${
              isAgency ? 'text-amber-700 hover:bg-amber-50' : 'text-indigo-600 hover:bg-indigo-50'
            }`}
          >
            View →
          </a>
          {isAgency && (
            <button className="h-[26px] px-2 rounded-md text-[11px] font-medium text-amber-700 hover:bg-amber-50">
              Power BI
            </button>
          )}
          <button className={`h-[26px] px-2 rounded-md text-[11px] font-medium ${
            isAgency ? 'text-amber-700 hover:bg-amber-50' : 'text-indigo-600 hover:bg-indigo-50'
          }`}>
            PDF
          </button>
          <button
            onClick={handleDelete}
            className="h-[26px] px-2 rounded-md text-[11px] font-medium text-red-500 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add card placeholder ──────────────────────────────────────────────────────

function AddCard({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className="group border-2 border-dashed border-slate-300 rounded-[13px] flex flex-col items-center justify-center gap-2 p-7 min-h-[240px] hover:border-indigo-400 hover:bg-indigo-50/50 transition-all"
    >
      <div className="w-[38px] h-[38px] rounded-[10px] bg-slate-100 group-hover:bg-indigo-600 flex items-center justify-center transition-all">
        <svg className="w-4 h-4 stroke-slate-500 group-hover:stroke-white fill-none" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </div>
      <span className="text-[13px] font-semibold text-slate-500 group-hover:text-indigo-600 transition-colors">
        Create new dashboard
      </span>
      <span className="text-[11px] text-slate-400 text-center leading-[1.5]">
        Pick any Trend Report and<br />PulseLoop builds the visual<br />summary automatically
      </span>
    </button>
  )
}

// ── Locked placeholder card ───────────────────────────────────────────────────

function LockedCard({ icon, title, sub, upgradeLabel, upgradeColor }: {
  icon: React.ReactNode
  title: string
  sub: string
  upgradeLabel: string
  upgradeColor: 'indigo' | 'dark'
}) {
  return (
    <div className="border-2 border-dashed border-slate-300 rounded-[13px] flex flex-col items-center justify-center gap-2 p-7 min-h-[240px] bg-slate-50">
      <div className="w-[38px] h-[38px] rounded-[10px] bg-white border border-slate-200 flex items-center justify-center">
        {icon}
      </div>
      <div className="text-[12px] font-semibold text-slate-500">{title}</div>
      <div
        className="text-[11px] text-slate-400 text-center leading-[1.5]"
        dangerouslySetInnerHTML={{ __html: sub }}
      />
      <a
        href="/settings"
        className={`mt-1 h-[24px] px-3 rounded-full text-[11px] font-semibold inline-flex items-center ${
          upgradeColor === 'dark'
            ? 'bg-slate-900 text-amber-400'
            : 'bg-indigo-600 text-white'
        }`}
      >
        {upgradeLabel}
      </a>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DashboardsClient({
  dashboards,
  reports,
  workspaces,
  niches,
  plan,
  locked,
  dashboardLimit,
  usedThisMonth,
  primaryWorkspaceId,
  appUrl,
}: Props) {
  const router = useRouter()
  const isStarter = locked
  const isAgency = plan === 'agency'

  const [activeWorkspaceId, setActiveWorkspaceId] = useState(primaryWorkspaceId ?? workspaces[0]?.id ?? '')
  const [activeNicheId, setActiveNicheId] = useState<string | null>(null)
  const [genReportId, setGenReportId] = useState('')
  const [genWorkspaceId, setGenWorkspaceId] = useState(primaryWorkspaceId ?? workspaces[0]?.id ?? '')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  // Panel reports: filtered by genWorkspaceId for Agency, else primary workspace
  const panelReports = reports.filter(r =>
    r.workspace_id === (isAgency ? genWorkspaceId : (primaryWorkspaceId ?? workspaces[0]?.id))
  )

  // Dashboards for current active workspace tab
  const workspaceDashboards = dashboards.filter(d => d.workspace_id === activeWorkspaceId)

  // Filter by niche
  const filteredDashboards = activeNicheId
    ? workspaceDashboards.filter(d => (d.trend_reports?.niches as any)?.id === activeNicheId)
    : workspaceDashboards

  // Niches for current workspace
  const workspaceNiches = niches.filter(n => n.workspace_id === activeWorkspaceId)

  // Mark first dashboard per niche as "latest"
  const latestIds = new Set<string>()
  const seenNiches = new Set<string>()
  filteredDashboards.forEach(d => {
    const nicheId = (d.trend_reports?.niches as any)?.id
    if (nicheId && !seenNiches.has(nicheId)) {
      seenNiches.add(nicheId)
      latestIds.add(d.id)
    } else if (!nicheId && !seenNiches.has('__none__')) {
      seenNiches.add('__none__')
      latestIds.add(d.id)
    }
  })

  // Dashboard count per workspace (for workspace tabs)
  const countByWorkspace: Record<string, number> = {}
  dashboards.forEach(d => {
    countByWorkspace[d.workspace_id] = (countByWorkspace[d.workspace_id] ?? 0) + 1
  })

  const atLimit = dashboardLimit !== Infinity && usedThisMonth >= (dashboardLimit as number)

  const handleGenerate = async () => {
    const reportId = genReportId || panelReports[0]?.id
    if (!reportId) return
    setGenerating(true)
    setGenError(null)
    try {
      const res = await fetch('/api/dashboard/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Generation failed')
      router.refresh()
    } catch (err: any) {
      setGenError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  // ── Stats values ────────────────────────────────────────────────────────────
  const totalDbs = workspaceDashboards.length
  const wlLabel = isAgency ? 'Active' : 'Locked'
  const pbiLabel = isAgency ? 'Ready' : 'Locked'
  const allowedLabel = isStarter ? 'Locked' : isAgency ? 'Unlimited' : `${dashboardLimit}/mo`

  return (
    <div className="flex-1 overflow-y-auto p-5 bg-[#F7F7FC]">

      {/* ── Upgrade banner ─────────────────────────────────────────────────── */}
      {isStarter && (
        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 mb-4">
          <div className="w-[34px] h-[34px] rounded-[9px] bg-white flex items-center justify-center text-base flex-shrink-0">📊</div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-bold text-indigo-700">Dashboards are a Pro &amp; Agency feature</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Generate visual charts and shareable summaries directly from any Trend Report. Starter does not include dashboards.
            </div>
            <div className="flex gap-1.5 flex-wrap mt-1.5">
              {['12 dashboards/mo on Pro', 'Unlimited on Agency', 'White-label on Agency', 'Power BI on Agency'].map(tag => (
                <span key={tag} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{tag}</span>
              ))}
            </div>
          </div>
          <a href="/settings" className="h-[24px] px-3 rounded-full text-[11px] font-semibold bg-indigo-600 text-white inline-flex items-center whitespace-nowrap flex-shrink-0">
            Upgrade to Pro →
          </a>
        </div>
      )}

      {!isStarter && !isAgency && (
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-700 rounded-xl p-3.5 mb-4">
          <div className="w-[34px] h-[34px] rounded-[9px] bg-amber-400/20 flex items-center justify-center text-base flex-shrink-0">🏢</div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-bold text-white">Need unlimited dashboards + Power BI? Upgrade to Agency.</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Pro gives 12 dashboards/mo. Agency removes the cap and adds white-label delivery and Power BI export for client reporting.
            </div>
            <div className="flex gap-1.5 flex-wrap mt-1.5">
              {['Unlimited dashboards', 'Power BI export', 'White-label output', 'Per-workspace brand voice'].map(tag => (
                <span key={tag} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-400">{tag}</span>
              ))}
            </div>
          </div>
          <a href="/settings" className="h-[24px] px-3 rounded-full text-[11px] font-semibold bg-slate-800 border border-amber-400 text-amber-400 inline-flex items-center whitespace-nowrap flex-shrink-0">
            Upgrade to Agency →
          </a>
        </div>
      )}

      {/* ── Stats grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="bg-white border border-slate-200 rounded-[10px] px-3.5 py-3">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.4px] mb-1">Total dashboards</div>
          <div className={`text-[19px] font-bold ${isStarter ? 'text-red-500' : 'text-slate-800'}`}>{totalDbs}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{allowedLabel}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-[10px] px-3.5 py-3">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.4px] mb-1">Generated this month</div>
          <div className={`text-[19px] font-bold ${isStarter ? 'text-red-500' : 'text-slate-800'}`}>{usedThisMonth}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {isStarter ? 'Locked' : isAgency ? 'Unlimited (Agency)' : `of ${dashboardLimit} allowed`}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-[10px] px-3.5 py-3">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.4px] mb-1">White-label</div>
          <div className={`text-[14px] font-bold pt-1 ${isAgency ? 'text-emerald-600' : 'text-slate-400'}`}>{wlLabel}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{isAgency ? 'Client-branded' : 'Agency only'}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-[10px] px-3.5 py-3">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.4px] mb-1">Power BI export</div>
          <div className={`text-[14px] font-bold pt-1 ${isAgency ? 'text-emerald-600' : 'text-slate-400'}`}>{pbiLabel}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{isAgency ? 'Export from any dashboard' : 'Agency only'}</div>
        </div>
      </div>

      {/* ── Agency workspace tabs ───────────────────────────────────────────── */}
      {isAgency && workspaces.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.6px] mb-1.5">Workspace</div>
          <div className="flex gap-1.5 flex-wrap">
            {workspaces.map(ws => (
              <button
                key={ws.id}
                onClick={() => { setActiveWorkspaceId(ws.id); setActiveNicheId(null) }}
                className={`h-7 px-3 rounded-[7px] text-[12px] font-semibold border-none inline-flex items-center gap-1.5 ${
                  activeWorkspaceId === ws.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-500 border border-slate-200'
                }`}
              >
                {ws.name}
                <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${
                  activeWorkspaceId === ws.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {countByWorkspace[ws.id] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Generate panel (Pro + Agency) ──────────────────────────────────── */}
      {!isStarter && (
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
          <div className={`w-[34px] h-[34px] rounded-[9px] flex items-center justify-center text-base flex-shrink-0 ${
            isAgency ? 'bg-amber-100' : 'bg-indigo-50'
          }`}>⚡</div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-slate-800">Generate a dashboard from a Trend Report</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Pick any report — PulseLoop builds the visual summary automatically in your brand colours
            </div>
          </div>

          {/* Agency: workspace selector */}
          {isAgency && workspaces.length > 1 && (
            <select
              value={genWorkspaceId}
              onChange={e => { setGenWorkspaceId(e.target.value); setGenReportId('') }}
              className="h-7 px-2 rounded-[7px] border border-slate-200 text-[11px] text-slate-600 bg-white outline-none cursor-pointer"
            >
              {workspaces.map(ws => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))}
            </select>
          )}

          {/* Report selector */}
          <select
            value={genReportId || panelReports[0]?.id || ''}
            onChange={e => setGenReportId(e.target.value)}
            className="h-7 px-2 rounded-[7px] border border-slate-200 text-[11px] text-slate-600 bg-white outline-none cursor-pointer w-[180px]"
          >
            {panelReports.length === 0
              ? <option value="">No reports yet</option>
              : panelReports.map(r => (
                <option key={r.id} value={r.id}>
                  {(r.niches as any)?.icon ? `${(r.niches as any).icon} ` : ''}{r.title ?? 'Trend Report'}
                </option>
              ))
            }
          </select>

          <button
            onClick={handleGenerate}
            disabled={generating || atLimit || panelReports.length === 0}
            className={`h-[30px] px-3 rounded-lg text-[12px] font-semibold text-white inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
              isAgency ? 'bg-slate-900' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {generating ? (
              <>
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Generating…
              </>
            ) : 'Generate →'}
          </button>
        </div>
      )}

      {genError && (
        <div className="mb-3 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-[12px] text-red-600 font-medium">
          {genError}
        </div>
      )}

      {/* ── Filter row (Pro + Agency) ───────────────────────────────────────── */}
      {!isStarter && (
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          <button
            onClick={() => setActiveNicheId(null)}
            className={`h-[26px] px-2.5 rounded-full text-[11px] font-semibold border-none ${
              activeNicheId === null
                ? isAgency ? 'bg-slate-900 text-white' : 'bg-indigo-600 text-white'
                : 'bg-white text-slate-500 border border-slate-200'
            }`}
          >
            All niches
          </button>
          {workspaceNiches.map(n => (
            <button
              key={n.id}
              onClick={() => setActiveNicheId(n.id)}
              className={`h-[26px] px-2.5 rounded-full text-[11px] font-semibold border-none ${
                activeNicheId === n.id
                  ? isAgency ? 'bg-slate-900 text-white' : 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-500 border border-slate-200'
              }`}
            >
              {n.icon ? `${n.icon} ` : ''}{n.name}
            </button>
          ))}
          <div className="ml-auto">
            <select className="h-7 px-2 rounded-[7px] border border-slate-200 text-[11px] text-slate-500 bg-white outline-none cursor-pointer">
              <option>Newest first</option>
              <option>Most viewed</option>
            </select>
          </div>
        </div>
      )}

      {/* ── Card grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {isStarter ? (
          <>
            <LockedCard
              icon={
                <svg className="w-4 h-4 stroke-slate-400 fill-none" strokeWidth={1.5} strokeLinecap="round" viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              }
              title="Dashboards locked on Starter"
              sub="Visual charts and shareable<br/>summaries from your reports.<br/>Available on Pro &amp; Agency."
              upgradeLabel="Upgrade to Pro →"
              upgradeColor="indigo"
            />
            <LockedCard
              icon={
                <svg className="w-4 h-4 stroke-slate-400 fill-none" strokeWidth={1.5} strokeLinecap="round" viewBox="0 0 24 24">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              }
              title="Power BI export — Agency only"
              sub="Send any dashboard's data<br/>directly to your Power BI<br/>workspace for client reporting."
              upgradeLabel="Upgrade to Agency →"
              upgradeColor="dark"
            />
          </>
        ) : filteredDashboards.length === 0 ? (
          <>
            <AddCard onAdd={() => document.querySelector<HTMLButtonElement>('[data-generate]')?.click()} />
          </>
        ) : (
          <>
            {filteredDashboards.map(d => (
              <DashboardCard
                key={d.id}
                dashboard={d}
                isAgency={isAgency}
                isLatest={latestIds.has(d.id)}
              />
            ))}
            {!atLimit && (
              <AddCard onAdd={() => {
                const panel = document.querySelector<HTMLButtonElement>('[data-generate-btn]')
                panel?.click()
              }} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
