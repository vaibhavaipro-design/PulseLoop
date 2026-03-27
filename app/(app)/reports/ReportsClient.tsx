'use client'

import { useState, useMemo, useRef, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Plan } from '@/lib/plans'

interface Niche {
  id: string
  name: string
  icon: string | null
  workspace_id: string
}

interface Report {
  id: string
  title: string | null
  created_at: string
  workspace_id: string
  source_health: { total_signals?: number; platforms?: Record<string, number> } | null
  niches: { id: string; name: string; icon: string | null } | null
}

interface Workspace {
  id: string
  name: string
}

interface Props {
  plan: Plan
  limits: {
    reportsPerMonth: number
    scrapeIntervalHours: number
    privateUpload: boolean
    customSignalTypes: boolean
  }
  workspaces: Workspace[]
  primaryWorkspaceId: string | null
  reports: Report[]
  niches: Niche[]
  usedThisMonth: number
  contentGenerated: number
}

function getCadence(plan: Plan) {
  if (plan === 'starter') return 'Once / week'
  if (plan === 'agency') return 'Daily'
  return '3× / week'
}

function getFreshness(plan: Plan) {
  if (plan === 'starter') return '≤ 6h old'
  if (plan === 'agency') return '≤ 1h old'
  return '≤ 2h old'
}

function getMonthLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function getWeekNumber(dateStr: string) {
  const d = new Date(dateStr)
  const start = new Date(d.getFullYear(), 0, 1)
  return Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
}

function getSignalStrength(report: Report): 'hi' | 'med' {
  const total = report.source_health?.total_signals ?? 0
  return total >= 200 ? 'hi' : 'med'
}

// ── DELETE CONFIRM MODAL ──────────────────────────────────────────────────────
function DeleteConfirmModal({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl max-w-xs w-full mx-4 p-5">
        <div className="text-sm font-bold text-slate-800 mb-1">Delete this report?</div>
        <div className="text-xs text-slate-500 mb-5">This cannot be undone.</div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 h-8 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 h-8 rounded-lg bg-red-600 text-xs font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <>
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Deleting…
              </>
            ) : (
              'Delete permanently'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── RUN REPORT MODAL ──────────────────────────────────────────────────────────
function RunReportModal({
  isAgency,
  workspaces,
  niches,
  atLimit,
  running,
  runError,
  runWorkspaceId,
  setRunWorkspaceId,
  runNicheId,
  setRunNicheId,
  privateFile,
  setPrivateFile,
  privateContextNote,
  setPrivateContextNote,
  fileInputRef,
  onRun,
  onClose,
}: {
  isAgency: boolean
  workspaces: Workspace[]
  niches: Niche[]
  atLimit: boolean
  running: boolean
  runError: string | null
  runWorkspaceId: string
  setRunWorkspaceId: (v: string) => void
  runNicheId: string
  setRunNicheId: (v: string) => void
  privateFile: File | null
  setPrivateFile: (f: File | null) => void
  privateContextNote: string
  setPrivateContextNote: (v: string) => void
  fileInputRef: React.RefObject<HTMLInputElement>
  onRun: () => void
  onClose: () => void
}) {
  const nichesForWorkspace = niches.filter(n => n.workspace_id === runWorkspaceId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-sm flex-shrink-0">⚡</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-slate-800">Run a new report</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Generates a trend report from 18 EU signal sources</div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center flex-shrink-0 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5 text-slate-400">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Workspace selector — Agency + multiple workspaces only */}
        {isAgency && workspaces.length > 1 && (
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[.4px]">Workspace</label>
            <select
              value={runWorkspaceId}
              onChange={e => {
                const wsId = e.target.value
                setRunWorkspaceId(wsId)
                const firstNiche = niches.find(n => n.workspace_id === wsId)
                setRunNicheId(firstNiche?.id ?? '')
              }}
              disabled={atLimit}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:ring-2 focus:ring-amber-400"
            >
              {workspaces.map(ws => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Niche selector */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[.4px]">Niche</label>
          <select
            value={runNicheId}
            onChange={e => setRunNicheId(e.target.value)}
            disabled={atLimit}
            className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {nichesForWorkspace.length === 0 && <option value="">No niches in this workspace</option>}
            {nichesForWorkspace.map(n => (
              <option key={n.id} value={n.id}>{n.icon ? `${n.icon} ` : ''}{n.name}</option>
            ))}
          </select>
        </div>

        {/* Private data upload — Agency only */}
        {isAgency && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[.4px]">Private Data</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf,.doc,.docx,.xls,.xlsx,.csv"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0] ?? null
                setPrivateFile(file)
                e.target.value = ''
              }}
            />
            {privateFile ? (
              <div className="bg-white border border-amber-200 rounded-xl px-3.5 py-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3.5 h-3.5 text-amber-700">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-800 truncate">{privateFile.name}</div>
                  <div className="text-[11px] text-slate-400">{(privateFile.size / 1024).toFixed(1)} KB · Will be injected into this report run</div>
                </div>
                <button
                  onClick={() => setPrivateFile(null)}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center flex-shrink-0 transition-colors"
                  title="Remove file"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5 text-slate-400">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-white border border-dashed border-slate-300 rounded-xl px-3.5 py-3 flex items-center gap-2.5 hover:border-amber-400 hover:bg-amber-50/40 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-amber-100 flex items-center justify-center flex-shrink-0 transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-700 transition-colors">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-xs font-semibold text-slate-700 group-hover:text-slate-800">Upload private data into this report</div>
                  <div className="text-[11px] text-slate-400">TXT, PDF, Excel, Word, CSV — injected as context for this run</div>
                </div>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">Agency ✦</span>
              </button>
            )}

            {/* How to use this file — only visible when a file is selected */}
            {privateFile && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[.4px]">How to use this file</label>
                <textarea
                  value={privateContextNote}
                  onChange={e => setPrivateContextNote(e.target.value)}
                  rows={2}
                  placeholder="e.g. Focus on the regulatory sections and cross-reference with market signals"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white outline-none focus:ring-2 focus:ring-amber-400 resize-none placeholder:text-slate-300"
                />
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {runError && (
          <div className="text-xs text-red-600 font-medium bg-red-50 border border-red-100 rounded-lg px-3 py-2">{runError}</div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            disabled={running}
            className="flex-1 h-9 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onRun}
            disabled={atLimit || running || !runNicheId}
            className={`flex-1 h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isAgency
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {running ? (
              <>
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Generating…
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-3 h-3">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Run report
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function ReportsClient({
  plan,
  limits,
  workspaces,
  primaryWorkspaceId,
  reports,
  niches,
  usedThisMonth,
  contentGenerated,
}: Props) {
  const router = useRouter()
  const isStarter = plan === 'starter'
  const isAgency = plan === 'agency'
  const isPro = plan === 'pro' || plan === 'trial'

  const [activeWorkspaceId, setActiveWorkspaceId] = useState(primaryWorkspaceId)
  const [activeNicheFilter, setActiveNicheFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'signals' | 'oldest'>('newest')
  const [monthFilter, setMonthFilter] = useState<string>('all')
  const [runWorkspaceId, setRunWorkspaceId] = useState(primaryWorkspaceId ?? workspaces[0]?.id ?? '')
  const nichesForPanel = niches.filter(n => n.workspace_id === (runWorkspaceId || primaryWorkspaceId))
  const [runNicheId, setRunNicheId] = useState(nichesForPanel[0]?.id ?? '')
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [privateFile, setPrivateFile] = useState<File | null>(null)
  const [privateContextNote, setPrivateContextNote] = useState('')
  const [showRunModal, setShowRunModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reportsLimit = limits.reportsPerMonth
  const slotsLeft = Math.max(0, reportsLimit - usedThisMonth)
  const usagePct = reportsLimit > 0 ? Math.min(100, (usedThisMonth / reportsLimit) * 100) : 0

  // Build unique months for filter
  const allMonths = useMemo(() => {
    const seen = new Set<string>()
    const result: string[] = []
    reports.forEach(r => {
      const m = getMonthLabel(r.created_at)
      if (!seen.has(m)) { seen.add(m); result.push(m) }
    })
    return result
  }, [reports])

  // Filtered + sorted reports
  const filteredReports = useMemo(() => {
    let filtered = reports
    if (activeWorkspaceId) {
      filtered = filtered.filter(r => r.workspace_id === activeWorkspaceId)
    }
    if (activeNicheFilter !== 'all') {
      filtered = filtered.filter(r => r.niches?.id === activeNicheFilter)
    }
    if (monthFilter !== 'all') {
      filtered = filtered.filter(r => getMonthLabel(r.created_at) === monthFilter)
    }
    if (sortBy === 'oldest') {
      filtered = [...filtered].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    } else if (sortBy === 'signals') {
      filtered = [...filtered].sort((a, b) => (b.source_health?.total_signals ?? 0) - (a.source_health?.total_signals ?? 0))
    }
    return filtered
  }, [reports, activeWorkspaceId, activeNicheFilter, monthFilter, sortBy])

  // Starter only sees current month
  const visibleReports = isStarter ? filteredReports.slice(0, 4) : filteredReports

  // Group by month
  const grouped = useMemo(() => {
    const groups = new Map<string, Report[]>()
    visibleReports.forEach(r => {
      const key = getMonthLabel(r.created_at)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(r)
    })
    return groups
  }, [visibleReports])

  const readFileAsText = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => resolve(e.target?.result as string ?? '')
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })

  const handleRunReport = async () => {
    if (!runNicheId) return
    setRunning(true)
    setRunError(null)
    const niche = niches.find(n => n.id === runNicheId)
    try {
      let privateContext: string | undefined
      if (privateFile && isAgency) {
        privateContext = await readFileAsText(privateFile)
      }
      const res = await fetch('/api/trend-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nicheId: runNicheId,
          nicheQuery: niche?.name ?? '',
          workspaceId: runWorkspaceId || undefined,
          privateContext,
          privateContextNote: privateContextNote.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Generation failed')
      router.push(`/reports/${data.id}`)
    } catch (err: any) {
      setRunError(err.message)
      setRunning(false)
    }
  }

  const handleDeleteReport = async () => {
    if (!deletingId) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/trend-report/${deletingId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Delete failed')
      }
      setDeletingId(null)
      router.refresh()
    } catch (err: any) {
      // Surface error without blocking — just close the modal
      setDeletingId(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  const atLimit = usedThisMonth >= reportsLimit

  const nicheColorClass = isAgency ? 'text-amber-700' : 'text-indigo-600'
  const fillBarClass = isStarter && atLimit ? 'bg-red-500' : isAgency ? 'bg-amber-500' : 'bg-indigo-500'
  const usedColor = isStarter && atLimit ? 'text-red-600' : isAgency ? 'text-amber-700' : 'text-slate-800'

  const runTriggerSubtitle = niches.length === 0
    ? 'You need at least one niche before running a report'
    : atLimit
    ? `0 slots remaining this month — resets next month`
    : isAgency
    ? `${slotsLeft} slots remaining · 1h-fresh signals · custom signal types active`
    : isStarter
    ? `${slotsLeft} of ${reportsLimit} slots remaining · Once per week cadence`
    : `${slotsLeft} slots remaining · 2h-fresh signals from 18 EU sources`

  return (
    <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
      {/* Modals */}
      {showRunModal && (
        <RunReportModal
          isAgency={isAgency}
          workspaces={workspaces}
          niches={niches}
          atLimit={atLimit}
          running={running}
          runError={runError}
          runWorkspaceId={runWorkspaceId}
          setRunWorkspaceId={setRunWorkspaceId}
          runNicheId={runNicheId}
          setRunNicheId={setRunNicheId}
          privateFile={privateFile}
          setPrivateFile={setPrivateFile}
          privateContextNote={privateContextNote}
          setPrivateContextNote={setPrivateContextNote}
          fileInputRef={fileInputRef}
          onRun={handleRunReport}
          onClose={() => { setShowRunModal(false); setRunError(null) }}
        />
      )}

      {deletingId && (
        <DeleteConfirmModal
          onConfirm={handleDeleteReport}
          onCancel={() => setDeletingId(null)}
          loading={deleteLoading}
        />
      )}

      <div className="space-y-3">

        {/* ── UPGRADE BANNER ── */}
        {isStarter && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center text-lg flex-shrink-0">🚀</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-indigo-700">Upgrade to Pro — unlock the full weekly loop</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Starter: 4 reports/mo, once a week, no dashboards, briefs or newsletters.</div>
              <div className="flex gap-1.5 flex-wrap mt-1.5">
                {['12 reports/mo', '3× per week', '2h-fresh signals', 'Visual dashboards', 'Signal Briefs', 'Newsletters'].map(t => (
                  <span key={t} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{t}</span>
                ))}
              </div>
            </div>
            <Link href="/upgrade" className="flex-shrink-0 h-7 px-3 rounded-full text-[11px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center whitespace-nowrap">
              Upgrade to Pro →
            </Link>
          </div>
        )}

        {(isPro && !isAgency) && (
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center text-lg flex-shrink-0">🏢</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white">Managing 3+ clients? Upgrade to Agency.</div>
              <div className="text-[11px] text-white/50 mt-0.5">Pro = 1 workspace. Agency = 5 workspaces, daily cadence, white-label output.</div>
              <div className="flex gap-1.5 flex-wrap mt-1.5">
                {['60 reports/mo total', 'Daily per workspace', '1h-fresh signals', 'White-label'].map(t => (
                  <span key={t} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600">{t}</span>
                ))}
              </div>
            </div>
            <Link href="/upgrade" className="flex-shrink-0 h-7 px-3 rounded-full text-[11px] font-bold bg-slate-800 border border-slate-600 text-amber-400 hover:bg-slate-700 transition-colors flex items-center whitespace-nowrap">
              Upgrade to Agency →
            </Link>
          </div>
        )}

        {/* ── STATS GRID ── */}
        <div className="grid grid-cols-4 gap-2">
          {[
            {
              label: 'Reports this month',
              value: <span className={`text-[19px] font-bold ${atLimit ? usedColor : 'text-slate-800'}`}>{usedThisMonth}</span>,
              sub: `of ${isAgency ? '12/workspace · up to 60 total' : reportsLimit + ' allowed'}`,
            },
            {
              label: 'Cadence',
              value: <span className="text-sm font-bold text-slate-800 pt-1 block">{getCadence(plan)}</span>,
              sub: 'on your plan',
            },
            {
              label: 'Signal freshness',
              value: <span className="text-sm font-bold text-slate-800 pt-1 block">{getFreshness(plan)}</span>,
              sub: 'at report time',
            },
            {
              label: 'Content generated',
              value: <span className="text-[19px] font-bold text-slate-800">{contentGenerated}</span>,
              sub: 'from these reports',
            },
          ].map(card => (
            <div key={card.label} className="bg-white border border-slate-200 rounded-xl p-3">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-[.4px] mb-1">{card.label}</div>
              {card.value}
              <div className="text-[10px] text-slate-400 mt-0.5">{card.sub}</div>
            </div>
          ))}
        </div>

        {/* ── USAGE BAR ── */}
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-3">
          <div className="flex-1">
            {isStarter && atLimit ? (
              <>
                <div className="text-xs font-semibold text-red-600">⚠ All {reportsLimit} Starter slots used this month</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Resets next month · Upgrade to Pro for 12/mo</div>
              </>
            ) : isAgency ? (
              <>
                <div className="text-xs font-semibold text-slate-800">{usedThisMonth} of 12 reports used — {workspaces[0]?.name ?? 'workspace'}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{slotsLeft} remaining · resets in ~8 days</div>
              </>
            ) : (
              <>
                <div className="text-xs font-semibold text-slate-800">{usedThisMonth} of {reportsLimit} reports used this month</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{slotsLeft} remaining · resets in ~8 days</div>
              </>
            )}
          </div>
          <div className="w-36 flex-shrink-0">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
              <div className={`h-full rounded-full ${fillBarClass}`} style={{ width: `${usagePct}%` }} />
            </div>
            <div className={`text-[10px] text-right ${usedColor}`}>{usedThisMonth} / {isAgency ? '12' : reportsLimit}</div>
          </div>
          {isStarter && atLimit && (
            <Link href="/upgrade" className="flex-shrink-0 h-7 px-3 rounded-full text-[11px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center whitespace-nowrap">
              Upgrade →
            </Link>
          )}
        </div>

        {/* ── AGENCY WORKSPACE TABS ── */}
        {isAgency && workspaces.length > 1 && (
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[.6px] mb-1.5">Workspace</div>
            <div className="flex gap-1.5 flex-wrap">
              {workspaces.map(ws => (
                <button
                  key={ws.id}
                  onClick={() => setActiveWorkspaceId(ws.id)}
                  className={`h-7 px-3 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                    activeWorkspaceId === ws.id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {ws.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── RUN TRIGGER ROW ── */}
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-sm flex-shrink-0">⚡</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-800">Run a new report</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{runTriggerSubtitle}</div>
            </div>
            {niches.length === 0 ? (
              <Link
                href="/niches"
                className="h-7 px-3 rounded-lg text-[11px] font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                Add a niche →
              </Link>
            ) : (
              <button
                onClick={() => setShowRunModal(true)}
                disabled={atLimit}
                className={`h-7 px-3 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isAgency
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-3 h-3">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Run report
              </button>
            )}
          </div>
        </div>

        {/* ── FILTER ROW ── */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveNicheFilter('all')}
            className={`h-6.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border-none ${activeNicheFilter === 'all' ? (isAgency ? 'bg-slate-900 text-white' : 'bg-indigo-600 text-white') : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            All Reports
          </button>
          {niches.map(n => (
            <button
              key={n.id}
              onClick={() => setActiveNicheFilter(n.id)}
              className={`h-6.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${activeNicheFilter === n.id ? (isAgency ? 'bg-slate-900 text-white border-slate-900' : 'bg-indigo-600 text-white border-indigo-600') : 'bg-white text-slate-600 border-slate-200'}`}
            >
              {n.icon ? `${n.icon} ` : ''}{n.name}
            </button>
          ))}
          <div className="ml-auto flex gap-1.5">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="h-7 px-2 rounded-lg border border-slate-200 text-[11px] text-slate-600 bg-white outline-none focus:ring-1 focus:ring-indigo-400"
            >
              <option value="newest">Newest first</option>
              <option value="signals">Most signals</option>
              <option value="oldest">Oldest first</option>
            </select>
            <select
              value={monthFilter}
              onChange={e => setMonthFilter(e.target.value)}
              className="h-7 px-2 rounded-lg border border-slate-200 text-[11px] text-slate-600 bg-white outline-none focus:ring-1 focus:ring-indigo-400"
            >
              <option value="all">All months</option>
              {allMonths.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* ── REPORT CARDS ── */}
        {grouped.size === 0 && !isStarter && (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-3xl mx-auto mb-3">📊</div>
            <h3 className="font-bold text-slate-800 mb-1">No reports yet</h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">Run your first report using the panel above, or wait for the weekly automated run.</p>
          </div>
        )}

        {Array.from(grouped.entries()).map(([month, monthReports], groupIdx) => (
          <div key={month}>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-[.6px] mb-2 pl-0.5">{month}</div>
            <div className="flex flex-col gap-1.5">
              {monthReports.map((report, cardIdx) => {
                const isFeatured = groupIdx === 0 && cardIdx === 0
                const strength = getSignalStrength(report)
                const totalSignals = report.source_health?.total_signals ?? 0
                const niche = report.niches
                const weekNum = getWeekNumber(report.created_at)

                return (
                  <div
                    key={report.id}
                    onClick={() => router.push(`/reports/${report.id}`)}
                    className={`bg-white border border-slate-200 rounded-xl px-3.5 py-3 flex items-center gap-3 hover:shadow-md hover:shadow-indigo-100/50 transition-all cursor-pointer group ${
                      isFeatured
                        ? isAgency
                          ? 'border-l-[3px] border-l-amber-500'
                          : 'border-l-[3px] border-l-indigo-500'
                        : ''
                    }`}
                  >
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0 ${isAgency ? 'bg-amber-50' : 'bg-indigo-50'}`}>
                      {niche?.icon ?? '📊'}
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <div className={`text-[10px] font-bold uppercase tracking-[.4px] mb-0.5 ${nicheColorClass}`}>
                        {niche?.name ?? 'Report'}
                      </div>
                      <div className="text-[13px] font-semibold text-slate-800 truncate">
                        Week {weekNum} — {report.title ?? 'Trend Report'}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[11px] text-slate-400">
                          {new Date(report.created_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {totalSignals > 0 && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${strength === 'hi' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {totalSignals} signals
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          18 sources{isAgency && limits.customSignalTypes ? ' + custom' : ''}
                        </span>
                      </div>
                    </div>

                    {/* Right */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${strength === 'hi' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {strength === 'hi' ? 'High signal' : 'Medium signal'}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <Link
                          href={`/reports/${report.id}`}
                          onClick={e => e.stopPropagation()}
                          className={`h-6 px-2 rounded-md text-[11px] font-medium transition-colors ${isAgency ? 'text-amber-700 hover:bg-amber-50' : 'text-indigo-600 hover:bg-indigo-50'}`}
                        >
                          View →
                        </Link>
                        <Link
                          href={`/reports/${report.id}?print=true`}
                          onClick={e => e.stopPropagation()}
                          className={`h-6 px-2 rounded-md text-[11px] font-medium transition-colors ${isAgency ? 'text-amber-700 hover:bg-amber-50' : 'text-indigo-600 hover:bg-indigo-50'}`}
                        >
                          PDF
                        </Link>
                        <button
                          onClick={e => { e.stopPropagation(); setDeletingId(report.id) }}
                          className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-red-50 transition-colors"
                          title="Delete report"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-slate-300 hover:text-red-400 transition-colors">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* ── STARTER: EMPTY SLOT + LOCKED ARCHIVE ── */}
        {isStarter && atLimit && (
          <>
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl px-3.5 py-3 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" className="w-4 h-4">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-slate-400">0 slots remaining this month</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Your 4 Starter reports have been used · Resets in ~8 days</div>
              </div>
              <Link href="/upgrade" className="flex-shrink-0 h-7 px-3 rounded-full text-[11px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center whitespace-nowrap">
                Get more slots →
              </Link>
            </div>

            <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl px-3.5 py-3 flex items-center gap-2.5 mt-1">
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" className="w-3.5 h-3.5">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-slate-500">Older reports archived — February &amp; earlier</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Starter keeps last 30 days only. Pro &amp; Agency unlock full report history.</div>
              </div>
              <Link href="/upgrade" className="flex-shrink-0 h-7 px-3 rounded-full text-[11px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center whitespace-nowrap">
                Upgrade to access →
              </Link>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
