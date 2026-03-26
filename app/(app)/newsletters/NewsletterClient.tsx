'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import type { Plan } from '@/lib/plans'

interface Props {
  newsletters: any[]
  linkedinByNewsletter: Record<string, any>
  reports: any[]
  signalBriefs: any[]
  plan: Plan
  locked: boolean
  limitPerMonth: number
  usedThisMonth: number
  workspaceId: string
  workspaces: Array<{ id: string; name: string }>
}

// ── ICONS ────────────────────────────────────────────────────────────────────

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="w-[11px] h-[11px]">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
function IconArrowLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-[11px] h-[11px]">
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
  )
}
function IconShare() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-[11px] h-[11px]">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}
function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-[11px] h-[11px]">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}
function IconChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-[10px] h-[10px]">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
function IconLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-6 h-6">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
function IconSpin() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

// ── COPY BUTTON ───────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 px-2 py-0.5 border border-indigo-200 rounded hover:bg-indigo-50 transition-colors whitespace-nowrap"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

// ── EXPORT DROPDOWN ───────────────────────────────────────────────────────────

const EXPORT_GROUPS = [
  {
    section: 'Email platforms', items: [
      { emoji: '🐝', label: 'Beehiiv', sub: 'Import directly into your publication', bg: '#FEF3C7' },
      { emoji: '📮', label: 'Brevo', sub: 'Structured HTML for Brevo campaigns', bg: '#FEE2E2' },
      { emoji: '🦁', label: 'Mailchimp', sub: 'Import-ready template format', bg: '#FEF9C3' },
    ],
  },
  {
    section: 'Content formats', items: [
      { emoji: '📝', label: 'Plain text / Markdown', sub: 'For Substack, Kit, or any editor', bg: '#EFF6FF' },
      { emoji: '🌐', label: 'HTML', sub: 'Raw HTML for custom sending setups', bg: '#F0F9FF' },
    ],
  },
  {
    section: 'Documents', items: [
      { emoji: '📄', label: 'PDF', sub: 'Formatted document for sharing or archiving', bg: '#FDEAEA' },
    ],
  },
]

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function ExportDropdown({ newsletter }: { newsletter?: any }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', handle)
    return () => document.removeEventListener('click', handle)
  }, [])

  const subject = (Array.isArray(newsletter?.subject_lines) ? newsletter.subject_lines[0] : null) ?? 'newsletter'
  const safeFilename = subject.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 50)

  function handleExport(label: string) {
    setOpen(false)
    if (!newsletter) return
    if (label === 'Plain text / Markdown') {
      downloadBlob(newsletter.content_md ?? '', `${safeFilename}.md`, 'text/markdown')
    } else if (label === 'HTML') {
      downloadBlob(newsletter.content_html ?? `<div>${newsletter.content_md ?? ''}</div>`, `${safeFilename}.html`, 'text/html')
    } else if (label === 'PDF') {
      const win = window.open('', '_blank')
      if (win) {
        win.document.write(`<html><head><title>${subject}</title><style>body{font-family:sans-serif;max-width:700px;margin:40px auto;padding:0 20px;line-height:1.6}@media print{body{margin:0}}</style></head><body><pre style="white-space:pre-wrap;font-family:sans-serif">${(newsletter.content_md ?? '').replace(/</g, '&lt;')}</pre></body></html>`)
        win.document.close()
        win.print()
      }
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="h-[30px] px-3 rounded-lg bg-white text-slate-700 text-xs font-medium border border-slate-200 cursor-pointer inline-flex items-center gap-1.5 hover:bg-slate-50"
      >
        <IconDownload />
        Export
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          className={`w-[9px] h-[9px] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-[calc(100%+6px)] right-0 bg-white border border-slate-200 rounded-xl shadow-lg min-w-[240px] z-50 overflow-hidden">
          {EXPORT_GROUPS.map((group, gi) => (
            <div key={group.section}>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3.5 pt-2.5 pb-1.5">
                {group.section}
              </div>
              {group.items.map((item) => {
                const isEmailPlatform = group.section === 'Email platforms'
                return (
                  <div
                    key={item.label}
                    onClick={() => isEmailPlatform ? setOpen(false) : handleExport(item.label)}
                    className={`flex items-center gap-2.5 px-3.5 py-2 transition-colors ${isEmailPlatform ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'}`}
                  >
                    <div className="w-7 h-7 rounded-[7px] flex items-center justify-center text-sm flex-shrink-0" style={{ background: item.bg }}>
                      {item.emoji}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        {item.label}
                        {isEmailPlatform && <span className="text-[9px] font-bold px-1.5 py-px rounded-full bg-slate-100 text-slate-400">Coming soon</span>}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-px">{item.sub}</div>
                    </div>
                    {!isEmailPlatform && <span className="text-xs text-slate-400">↓</span>}
                  </div>
                )
              })}
              {gi < EXPORT_GROUPS.length - 1 && <div className="h-px bg-slate-100 my-1" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── GENERATE MODAL ────────────────────────────────────────────────────────────

function GenerateModal({
  reports,
  signalBriefs,
  plan,
  onClose,
  onGenerated,
}: {
  reports: any[]
  signalBriefs: any[]
  plan: Plan
  onClose: () => void
  onGenerated: () => void
}) {
  const [source, setSource] = useState<'report' | 'brief'>('report')
  const [reportId, setReportId] = useState(reports[0]?.id ?? '')
  const [briefId, setBriefId] = useState(signalBriefs[0]?.id ?? '')
  const [angle, setAngle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isAgency = plan === 'agency'

  const btnClass = isAgency
    ? 'bg-slate-900 hover:bg-slate-800'
    : 'bg-indigo-600 hover:bg-indigo-700'

  const activeTabClass = isAgency ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-600'
  const inactiveTabClass = 'bg-white text-slate-500'

  const canGenerate = source === 'report' ? !!reportId && reports.length > 0 : !!briefId && signalBriefs.length > 0

  const handleGenerate = async () => {
    if (!canGenerate) return
    setLoading(true)
    setError(null)
    try {
      const body = source === 'report'
        ? { reportId, angle: angle.trim() || undefined }
        : { briefId, angle: angle.trim() || undefined }
      const res = await fetch('/api/newsletter-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Generation failed')
      onGenerated()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function getBriefTitle(brief: any) {
    const match = brief.content_md?.match(/^#\s+(.+)$/m)
    return match ? match[1] : `Signal Brief`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[15px] font-bold text-slate-800">Generate Newsletter</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 font-medium">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Generate from
            </label>
            <div className="flex border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setSource('report')}
                className={`flex-1 h-7 px-3 text-[11px] font-semibold border-none cursor-pointer inline-flex items-center justify-center gap-1.5 ${source === 'report' ? activeTabClass : inactiveTabClass}`}
              >
                📊 Trend Report
              </button>
              <button
                onClick={() => setSource('brief')}
                className={`flex-1 h-7 px-3 text-[11px] font-semibold border-none cursor-pointer border-l border-slate-200 inline-flex items-center justify-center gap-1.5 ${source === 'brief' ? activeTabClass : inactiveTabClass}`}
              >
                📋 Signal Brief
              </button>
            </div>
          </div>

          {source === 'report' ? (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Source Report
              </label>
              <select
                value={reportId}
                onChange={(e) => setReportId(e.target.value)}
                className="w-full h-[30px] px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              >
                {reports.length === 0 && <option value="">No reports available</option>}
                {reports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title ?? 'Trend Report'} — {(r.niches as any)?.name ?? ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Source Signal Brief
              </label>
              <select
                value={briefId}
                onChange={(e) => setBriefId(e.target.value)}
                className="w-full h-[30px] px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              >
                {signalBriefs.length === 0 && <option value="">No signal briefs available</option>}
                {signalBriefs.map((b) => (
                  <option key={b.id} value={b.id}>{getBriefTitle(b)}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Angle / Focus <span className="normal-case font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
              placeholder="e.g. How AI is reshaping B2B sales in France"
              className="w-full h-[30px] px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 h-[30px] rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading || !canGenerate}
            className={`flex-1 h-[30px] rounded-lg text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${btnClass}`}
          >
            {loading ? <><IconSpin />Generating…</> : 'Generate →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── NEWSLETTER LIST CARD ──────────────────────────────────────────────────────

function NewsletterCard({
  newsletter,
  linkedinPost,
  plan,
  isFirst,
  onView,
}: {
  newsletter: any
  linkedinPost: any
  plan: Plan
  isFirst: boolean
  onView: (nl: any) => void
}) {
  const isAgency = plan === 'agency'
  const niche = (newsletter.trend_reports?.niches as any)?.name ?? 'General'
  const icon = (newsletter.trend_reports?.niches as any)?.icon ?? '📧'
  const subjectLines: string[] = Array.isArray(newsletter.subject_lines) ? newsletter.subject_lines : []
  const mainSubject = subjectLines[0] ?? (newsletter.trend_reports?.title ?? 'Newsletter')
  // Strip JSON code fences from preview if content was stored before fix
  const rawContent = newsletter.content_md ?? ''
  const cleanContent = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  const preview = cleanContent.replace(/^#+\s+/gm, '').replace(/\*\*/g, '').replace(/\*/g, '').slice(0, 160)
  const sections = ['Opening story', '3 signals', 'EU spotlight', 'What to watch', 'CTA']

  const leftBorder = isFirst ? (isAgency ? 'border-l-[3px] border-l-amber-400' : 'border-l-[3px] border-l-indigo-500') : ''
  const nicheColor = isAgency ? 'text-amber-700' : 'text-indigo-600'
  const btnColor = isAgency ? 'text-amber-700 hover:bg-amber-50' : 'text-indigo-600 hover:bg-indigo-50'

  return (
    <div
      className={`bg-white border border-slate-200 rounded-[13px] overflow-hidden cursor-pointer transition-shadow hover:shadow-[0_4px_16px_rgba(99,102,241,0.10)] ${leftBorder}`}
      onClick={() => onView(newsletter)}
    >
      {/* Strip */}
      <div className="flex items-center gap-2 px-3.5 pt-2.5 pb-2 border-b border-slate-100">
        <span className="text-base">{icon}</span>
        <span className={`text-[10px] font-bold uppercase tracking-wider ${nicheColor}`}>{niche}</span>
        <div className="ml-auto flex items-center gap-1.5">
          {isFirst && (
            <span className="text-[10px] font-semibold px-1.5 py-px rounded-full bg-indigo-50 text-indigo-600">Latest</span>
          )}
          <span className="text-[10px] font-semibold px-1.5 py-px rounded-full bg-amber-50 text-amber-700">Issue</span>
          <span className="text-[10px] font-semibold px-1.5 py-px rounded-full bg-emerald-50 text-emerald-600">High signal</span>
          {isAgency && (
            <span className="text-[10px] font-semibold px-1.5 py-px rounded-full bg-amber-50 text-amber-700">✦ White-label</span>
          )}
          <span className="text-[10px] text-slate-400">
            {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Email content */}
      <div className="px-3.5 pt-3 pb-2.5">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Subject line</div>
        <div className="text-sm font-bold text-slate-800 mb-1.5 leading-snug">{mainSubject}</div>
        <p className="text-xs text-slate-500 leading-relaxed mb-2 line-clamp-2">{preview}…</p>
        <div className="flex gap-1 flex-wrap">
          {sections.map((s) => (
            <span key={s} className="text-[10px] font-medium px-2 py-px rounded-full bg-slate-50 text-slate-500 border border-slate-200">{s}</span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-t border-slate-100 bg-slate-50">
        <span className="text-[10px] text-slate-400">From Trend Report</span>
        <div className="ml-auto flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onView(newsletter) }}
            className={`h-[26px] px-2 rounded-md text-[11px] font-medium border-none cursor-pointer inline-flex items-center gap-1 ${btnColor}`}
          >
            View →
          </button>
          {isAgency && (
            <button
              onClick={(e) => e.stopPropagation()}
              className="h-[26px] px-2 rounded-md text-[11px] font-medium border-none cursor-pointer inline-flex items-center gap-1 text-amber-700 hover:bg-amber-50"
            >
              🎨 White-label
            </button>
          )}
          <button
            onClick={(e) => e.stopPropagation()}
            className={`h-[26px] px-2 rounded-md text-[11px] font-medium border-none cursor-pointer inline-flex items-center gap-1 ${btnColor}`}
          >
            Export
          </button>
        </div>
      </div>
    </div>
  )
}

// ── NEWSLETTER DETAIL VIEW ────────────────────────────────────────────────────

function SubjectRow({ index, subject }: { index: number; subject: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5">
      <span className="text-[10px] font-bold text-slate-400 w-4">{index}</span>
      <span className="text-xs text-slate-700 font-medium flex-1">{subject}</span>
      <button
        onClick={() => { navigator.clipboard.writeText(subject); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 px-2 py-0.5 border border-indigo-200 rounded hover:bg-indigo-50 transition-colors whitespace-nowrap"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  )
}

function NewsletterDetail({
  newsletter,
  linkedinPost,
  plan,
  onBack,
}: {
  newsletter: any
  linkedinPost: any
  plan: Plan
  onBack: () => void
}) {
  const isAgency = plan === 'agency'
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedMd, setCopiedMd] = useState(false)

  const subjectLines: string[] = Array.isArray(newsletter.subject_lines) ? newsletter.subject_lines : []
  const mainSubject = subjectLines[0] ?? (newsletter.trend_reports?.title ?? 'Newsletter')
  const niche = (newsletter.trend_reports?.niches as any)?.name ?? 'General'
  const reportTitle = newsletter.trend_reports?.title ?? 'Trend Report'
  const variants = Array.isArray(linkedinPost?.variants) ? linkedinPost.variants : []

  const btnClass = isAgency ? 'bg-slate-900 hover:bg-slate-800' : 'bg-indigo-600 hover:bg-indigo-700'

  return (
    <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
      {/* Action row — back + share + export */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={onBack}
          className="h-[30px] px-2.5 rounded-lg bg-white text-slate-700 text-xs font-medium border border-slate-200 cursor-pointer inline-flex items-center gap-1.5 hover:bg-slate-50"
        >
          <IconArrowLeft />All newsletters
        </button>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <IconChevronRight />
          <span>{reportTitle} · {niche}</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="relative group">
            <button
              className="h-[30px] px-2.5 rounded-lg bg-white text-slate-700 text-xs font-medium border border-slate-200 cursor-not-allowed opacity-60 inline-flex items-center gap-1.5"
            >
              <IconShare />Share
            </button>
            <div className="absolute top-[calc(100%+4px)] right-0 hidden group-hover:block bg-slate-800 text-white text-[10px] font-medium px-2 py-1 rounded-md whitespace-nowrap z-50">
              Coming soon
            </div>
          </div>
          <ExportDropdown newsletter={newsletter} />
          {isAgency && (
            <div className="relative group">
              <button className="h-[30px] px-3 rounded-lg text-white text-xs font-semibold border-none cursor-not-allowed opacity-60 inline-flex items-center gap-1.5 bg-slate-900">
                🎨 White-label PDF
              </button>
              <div className="absolute top-[calc(100%+4px)] right-0 hidden group-hover:block bg-slate-800 text-white text-[10px] font-medium px-2 py-1 rounded-md whitespace-nowrap z-50">
                Coming soon
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Publish strip */}
      {isAgency ? (
        <div className="rounded-xl px-3.5 py-2.5 mb-3 flex items-center gap-2.5 bg-slate-900 border border-slate-700">
          <div className="w-[30px] h-[30px] rounded-lg bg-amber-400/20 flex items-center justify-center text-sm flex-shrink-0">🎨</div>
          <div className="flex-1">
            <div className="text-xs font-bold text-white">White-label active — Acme Corp workspace</div>
            <div className="text-[11px] text-white/50 mt-px">Delivered under Acme Corp&apos;s brand. Private data from uploaded files is woven into the content.</div>
          </div>
          <button className="h-[26px] px-2.5 rounded-lg bg-amber-400/20 text-amber-400 text-[11px] font-semibold border border-amber-400/30 cursor-pointer">
            Configure →
          </button>
        </div>
      ) : (
        <div className="rounded-xl px-3.5 py-2.5 mb-3 flex items-center gap-2.5 bg-amber-50 border border-amber-200">
          <div className="w-[30px] h-[30px] rounded-lg bg-amber-100 flex items-center justify-center text-sm flex-shrink-0">🐝</div>
          <div className="flex-1">
            <div className="text-xs font-bold text-amber-800">Beehiiv-ready format</div>
            <div className="text-[11px] text-amber-700 mt-px">Structured for direct import. Hit Export → Beehiiv in the toolbar to send to your publication.</div>
          </div>
          <span className="text-[10px] text-amber-700 font-semibold whitespace-nowrap">Also: Brevo · Mailchimp · Substack · HTML · PDF</span>
        </div>
      )}

      {/* Newsletter document */}
      <div className="bg-white border border-slate-200 rounded-[14px] overflow-hidden mb-3">
        {/* Email meta */}
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
          {[
            { label: 'To', val: `Your subscriber list · ${niche}` },
            { label: 'Subject', val: mainSubject, bold: true },
          ].map(({ label, val, bold }) => (
            <div key={label} className="flex items-baseline gap-2 mb-1 last:mb-0">
              <span className="text-[10px] font-bold text-slate-400 w-[52px] flex-shrink-0 uppercase tracking-wider">{label}</span>
              <span className={`${bold ? 'text-[13px] font-bold text-slate-800' : 'text-xs text-slate-700 font-medium'}`}>{val}</span>
            </div>
          ))}
        </div>

        {/* Hero */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="text-lg font-extrabold text-slate-800 leading-snug mb-2 tracking-tight">
            {mainSubject}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold px-2 py-px rounded-full bg-indigo-50 text-indigo-600">
              {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <span className="text-[10px] font-semibold px-2 py-px rounded-full bg-emerald-50 text-emerald-600">High signal week</span>
            <span className="text-[10px] font-semibold px-2 py-px rounded-full bg-slate-100 text-slate-500 border border-slate-200">{niche}</span>
            {isAgency && (
              <span className="text-[10px] font-semibold px-2 py-px rounded-full bg-amber-50 text-amber-700">✦ Private data woven in</span>
            )}
          </div>
        </div>

        {/* Full newsletter content — rendered markdown */}
        {newsletter.content_md && (
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex-1">
                Newsletter content
              </span>
              <button
                onClick={() => { navigator.clipboard.writeText(newsletter.content_md ?? ''); setCopiedMd(true); setTimeout(() => setCopiedMd(false), 2000) }}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                {copiedMd ? 'Copied!' : 'Copy Markdown'}
              </button>
            </div>
            <article className="prose prose-slate prose-sm max-w-none max-h-[500px] overflow-y-auto bg-slate-50 rounded-xl p-4">
              <ReactMarkdown>{newsletter.content_md}</ReactMarkdown>
            </article>
          </div>
        )}

        {/* Subject lines */}
        {subjectLines.length > 0 && (
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-3">
              Subject line options
            </div>
            <div className="flex flex-col gap-2">
              {subjectLines.map((subject, i) => (
                <SubjectRow key={i} index={i + 1} subject={subject} />
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 flex items-center gap-3">
            <div className="flex-1">
              <div className="text-xs font-bold text-slate-800 mb-0.5">Forward this to a client still thinking about AI as optional</div>
              <div className="text-[11px] text-slate-500">The content above makes it a compliance question. Send them the summary — it opens the conversation without you needing to push.</div>
            </div>
            <div className="relative group flex-shrink-0">
              <button
                className="h-7 px-3 rounded-lg text-white text-[11px] font-semibold border-none cursor-not-allowed opacity-60 flex-shrink-0 bg-slate-400"
              >
                Copy share link
              </button>
              <div className="absolute bottom-[calc(100%+4px)] right-0 hidden group-hover:block bg-slate-800 text-white text-[10px] font-medium px-2 py-1 rounded-md whitespace-nowrap z-50">
                Shareable preview link — coming soon
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 flex items-center gap-2">
          <span className="text-[11px] text-slate-400 flex-1">
            <strong className="text-slate-500">Intelligence Brief</strong>
            {' '}· 18 EU-focused sources · 90-day RAG ·{' '}
            {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <span className="text-[10px] text-slate-400">Unsubscribe · Manage preferences</span>
        </div>
      </div>
    </div>
  )
}

// ── LOCKED VIEW ────────────────────────────────────────────────────────────────

function LockedView() {
  return (
    <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
      {/* Upgrade banner */}
      <div className="rounded-xl p-3.5 flex items-start gap-2.5 mb-3.5 bg-indigo-50 border border-indigo-200">
        <div className="w-[34px] h-[34px] rounded-lg bg-white flex items-center justify-center text-base flex-shrink-0">📧</div>
        <div className="flex-1">
          <div className="text-xs font-bold text-indigo-700">Newsletters are locked on Starter</div>
          <div className="text-[11px] text-slate-600 mt-px leading-relaxed">
            Generate a full newsletter from your Trend Report or Signal Brief — written in your brand voice, every signal cited, ready to export to Beehiiv, Brevo, Mailchimp, Substack or HTML. Upgrade to Pro to unlock.
          </div>
          <div className="flex gap-1 flex-wrap mt-1.5">
            {['4/niche per month', 'From Trend Report or Signal Brief', 'Beehiiv, Brevo, Mailchimp', 'Substack, HTML, PDF', 'White-label on Agency'].map((tag) => (
              <span key={tag} className="text-[10px] font-semibold px-1.5 py-px rounded-full bg-indigo-100 text-indigo-600">{tag}</span>
            ))}
          </div>
        </div>
        <button className="h-6 px-4 rounded-full bg-indigo-600 text-white text-[11px] font-semibold border-none cursor-pointer whitespace-nowrap flex-shrink-0">
          Upgrade to Pro →
        </button>
      </div>

      {/* Lock gate */}
      <div className="flex flex-col items-center justify-center gap-3.5 py-12 px-5 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
          <IconLock />
        </div>
        <div className="text-lg font-bold text-slate-800">Newsletters unlock on Pro</div>
        <p className="text-sm text-slate-500 max-w-[380px] leading-relaxed">
          From your Trend Report or Signal Brief, PulseLoop drafts a complete weekly newsletter — opening story, signals, EU spotlight, what to watch — then export it in one click to any platform you use.
        </p>

        <div className="grid grid-cols-2 gap-2 max-w-[420px] w-full mt-1">
          {[
            { emoji: '📧', title: 'From report or brief', sub: 'Trend Report or Signal Brief as input' },
            { emoji: '✍️', title: 'Brand voice applied', sub: 'Written in your defined tone' },
            { emoji: '⬇️', title: '6 export formats', sub: 'Beehiiv, Brevo, Mailchimp, Substack, HTML, PDF' },
            { emoji: '⏱️', title: 'Weekly cadence', sub: '4 per niche per month' },
          ].map(({ emoji, title, sub }) => (
            <div key={title} className="bg-white border border-slate-200 rounded-xl p-2.5 px-3 flex gap-2 items-start text-left">
              <span className="text-sm flex-shrink-0 mt-0.5">{emoji}</span>
              <div>
                <div className="text-xs font-semibold text-slate-800">{title}</div>
                <div className="text-[11px] text-slate-400 mt-px">{sub}</div>
              </div>
            </div>
          ))}
        </div>

        <button className="mt-1 h-9 px-6 rounded-xl bg-indigo-600 text-white text-sm font-semibold border-none cursor-pointer hover:bg-indigo-700 transition-colors">
          Upgrade to Pro — from €99/mo →
        </button>
      </div>
    </div>
  )
}

// ── MAIN CLIENT ───────────────────────────────────────────────────────────────

export default function NewsletterClient({
  newsletters,
  linkedinByNewsletter,
  reports,
  signalBriefs,
  plan,
  locked,
  limitPerMonth,
  usedThisMonth,
  workspaceId,
  workspaces,
}: Props) {
  const router = useRouter()
  const isAgency = plan === 'agency'
  const [showModal, setShowModal] = useState(false)
  const [detail, setDetail] = useState<any | null>(null)
  const [activeNicheFilter, setActiveNicheFilter] = useState('all')
  const [activeWsId, setActiveWsId] = useState(workspaceId)

  const handleGenerated = useCallback(() => {
    router.refresh()
  }, [router])

  // Filter by active workspace first, then by niche
  const workspaceFiltered = activeWsId
    ? newsletters.filter(nl => nl.workspace_id === activeWsId)
    : newsletters

  const niches = Array.from(
    new Map(workspaceFiltered.map((nl) => {
      const name = (nl.trend_reports?.niches as any)?.name ?? 'General'
      const icon = (nl.trend_reports?.niches as any)?.icon ?? '📊'
      return [name, { name, icon }]
    })).values()
  )

  const filtered = activeNicheFilter === 'all'
    ? workspaceFiltered
    : workspaceFiltered.filter((nl) => ((nl.trend_reports?.niches as any)?.name ?? 'General') === activeNicheFilter)

  // Reports and signal briefs for the active workspace
  const wsReports = activeWsId ? reports.filter(r => r.workspace_id === activeWsId) : reports
  const wsBriefs = activeWsId ? signalBriefs.filter(b => b.workspace_id === activeWsId) : signalBriefs

  const primaryBtn = isAgency
    ? 'bg-slate-900 hover:bg-slate-800'
    : 'bg-indigo-600 hover:bg-indigo-700'
  const filterActiveClass = isAgency
    ? 'bg-slate-900 text-white'
    : 'bg-indigo-600 text-white'

  // ── LOCKED ──
  if (locked) return <LockedView />

  // ── DETAIL ──
  if (detail) {
    return (
      <NewsletterDetail
        newsletter={detail}
        linkedinPost={linkedinByNewsletter[detail.id]}
        plan={plan}
        onBack={() => setDetail(null)}
      />
    )
  }

  // ── LIST ──
  return (
    <>
      <div className="flex-1 overflow-y-auto p-5 bg-slate-50">

        {/* Trial → upgrade to Pro */}
        {plan === 'trial' && (
          <div className="rounded-xl p-3.5 flex items-start gap-2.5 mb-3.5 bg-indigo-50 border border-indigo-200">
            <div className="w-[34px] h-[34px] rounded-lg bg-white flex items-center justify-center text-base flex-shrink-0">🚀</div>
            <div className="flex-1">
              <div className="text-xs font-bold text-indigo-700">Upgrade to Pro to keep newsletters after your trial.</div>
              <div className="text-[11px] text-slate-600 mt-px leading-relaxed">
                Trial gives you full access. Pro keeps it — 4 newsletters/niche per month, brand voice applied, export to Beehiiv, Brevo, Mailchimp, Substack, HTML or PDF.
              </div>
              <div className="flex gap-1 flex-wrap mt-1.5">
                {['4/niche per month', 'Brand voice applied', 'Beehiiv, Brevo, Mailchimp', 'Substack, HTML, PDF'].map((tag) => (
                  <span key={tag} className="text-[10px] font-semibold px-1.5 py-px rounded-full bg-indigo-100 text-indigo-600">{tag}</span>
                ))}
              </div>
            </div>
            <button className="h-6 px-3 rounded-full bg-indigo-600 text-white text-[11px] font-semibold border-none cursor-pointer whitespace-nowrap flex-shrink-0">
              Upgrade to Pro →
            </button>
          </div>
        )}

        {/* Pro → upgrade to Agency */}
        {plan === 'pro' && (
          <div className="rounded-xl p-3.5 flex items-start gap-2.5 mb-3.5 bg-slate-900 border border-slate-700">
            <div className="w-[34px] h-[34px] rounded-lg bg-amber-400/20 flex items-center justify-center text-base flex-shrink-0">🏢</div>
            <div className="flex-1">
              <div className="text-xs font-bold text-white">Send white-label newsletters under your client&apos;s brand — upgrade to Agency.</div>
              <div className="text-[11px] text-white/55 mt-px leading-relaxed">
                Pro newsletters carry your branding. Agency delivers fully branded newsletters per workspace — custom signals, private data woven in, Power BI export.
              </div>
              <div className="flex gap-1 flex-wrap mt-1.5">
                {['White-label per workspace', 'Custom signals in content', 'Private data woven in', 'Power BI export'].map((tag) => (
                  <span key={tag} className="text-[10px] font-semibold px-1.5 py-px rounded-full bg-amber-400/20 text-amber-400">{tag}</span>
                ))}
              </div>
            </div>
            <button className="h-6 px-3 rounded-full bg-slate-800 text-amber-400 text-[11px] font-semibold border border-amber-400/30 cursor-pointer whitespace-nowrap flex-shrink-0">
              Upgrade to Agency →
            </button>
          </div>
        )}

        {/* Agency workspace tabs */}
        {isAgency && workspaces.length > 0 && (
          <div className="mb-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Workspace</div>
            <div className="flex gap-1.5 flex-wrap">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => { setActiveWsId(ws.id); setActiveNicheFilter('all') }}
                  className={`h-7 px-3 rounded-lg text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 ${ws.id === activeWsId ? 'bg-slate-900 text-white border-none' : 'bg-white text-slate-500 border border-slate-200'}`}
                >
                  {ws.name}
                </button>
              ))}
              <a href="/settings" className="h-7 px-3 rounded-lg text-xs font-semibold cursor-pointer bg-transparent text-slate-400 border border-dashed border-slate-300 inline-flex items-center gap-1.5">
                + Add workspace
              </a>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-3.5">
          {[
            { label: 'This month', value: String(usedThisMonth), sub: `of ${isAgency ? '4/workspace' : '4/niche (up to 28)'}` },
            { label: 'Cadence', value: 'Weekly', sub: isAgency ? 'per workspace' : 'per niche', small: true },
            { label: 'Sources', value: isAgency ? '18 + custom' : '18 EU', sub: '90-day RAG memory', small: true },
            { label: 'White-label', value: isAgency ? 'Active' : 'Locked', sub: isAgency ? 'Client-branded' : 'Agency only', small: true },
          ].map(({ label, value, sub, small }) => (
            <div key={label} className="bg-white border border-slate-200 rounded-xl px-3 py-2.5">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</div>
              <div className={`font-bold text-slate-800 ${small ? 'text-sm pt-0.5' : 'text-[19px]'}`}>{value}</div>
              <div className="text-[10px] text-slate-400 mt-px">{sub}</div>
            </div>
          ))}
        </div>

        {/* Generate panel */}
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 mb-3.5">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[15px] flex-shrink-0 ${isAgency ? 'bg-amber-50' : 'bg-indigo-50'}`}>📧</div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-slate-800">Generate a newsletter</div>
              <div className="text-[11px] text-slate-400 mt-px">
                Brand voice applied · every signal cited · export to Beehiiv, Brevo, Mailchimp, Substack, HTML or PDF{isAgency ? ' · white-label' : ''}
              </div>
            </div>
            {isAgency && <span className="text-[10px] font-semibold px-1.5 py-px rounded-full bg-amber-50 text-amber-700">✦ White-label</span>}
          </div>
          <div className="flex gap-2 mt-2.5 pt-2.5 border-t border-slate-100 flex-wrap items-center">
            <span className="text-[11px] text-slate-400 font-medium flex-shrink-0">Generate from:</span>
            <button
              onClick={() => setShowModal(true)}
              disabled={usedThisMonth >= limitPerMonth}
              className={`h-7 px-3 rounded-lg text-white text-xs font-semibold border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${primaryBtn}`}
            >
              Generate →
            </button>
          </div>
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-1.5 mb-3.5 flex-wrap">
          <button
            onClick={() => setActiveNicheFilter('all')}
            className={`h-[26px] px-2.5 rounded-full text-[11px] font-semibold cursor-pointer border-none transition-colors ${activeNicheFilter === 'all' ? filterActiveClass : 'bg-white text-slate-500 border border-slate-200'}`}
          >
            All niches
          </button>
          {niches.map(({ name, icon }) => (
            <button
              key={name}
              onClick={() => setActiveNicheFilter(name)}
              className={`h-[26px] px-2.5 rounded-full text-[11px] font-semibold cursor-pointer border-none transition-colors ${activeNicheFilter === name ? filterActiveClass : 'bg-white text-slate-500 border border-slate-200'}`}
            >
              {icon} {name}
            </button>
          ))}
          <div className="ml-auto">
            <select className="h-[26px] px-2 rounded-lg border border-slate-200 text-[11px] text-slate-500 bg-white cursor-pointer outline-none">
              <option>Newest first</option>
              <option>Most exported</option>
            </select>
          </div>
        </div>

        {/* Newsletter list / empty */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center bg-white border border-slate-200 rounded-xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center text-3xl">✉️</div>
            <h2 className="text-base font-bold text-slate-800">No newsletters yet</h2>
            <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
              Generate a newsletter from any Trend Report. Claude will write a full newsletter in your brand voice with 3 subject line options.
            </p>
            {reports.length === 0 ? (
              <a href="/reports" className="text-sm font-semibold text-indigo-600 hover:underline">
                Create a Trend Report first →
              </a>
            ) : (
              <button
                onClick={() => setShowModal(true)}
                className={`h-9 px-5 rounded-xl text-white text-sm font-bold border-none cursor-pointer ${primaryBtn}`}
              >
                Generate your first newsletter
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filtered.map((nl, i) => (
              <NewsletterCard
                key={nl.id}
                newsletter={nl}
                linkedinPost={linkedinByNewsletter[nl.id]}
                plan={plan}
                isFirst={i === 0}
                onView={setDetail}
              />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <GenerateModal
          reports={wsReports}
          signalBriefs={wsBriefs}
          plan={plan}
          onClose={() => setShowModal(false)}
          onGenerated={handleGenerated}
        />
      )}
    </>
  )
}
