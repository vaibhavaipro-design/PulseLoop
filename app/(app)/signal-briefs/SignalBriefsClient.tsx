'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleBriefShare } from '@/app/actions/briefs'
import type { Plan } from '@/lib/plans'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Workspace { id: string; name: string }
interface Niche { id: string; name: string; icon: string | null; workspace_id: string }
interface Report { id: string; workspace_id: string; title: string; niches: { id: string; name: string; icon: string | null } | null }
interface SignalBrief {
  id: string
  workspace_id: string
  share_id: string
  share_active: boolean
  content_md: string | null
  created_at: string
  trend_reports: {
    id: string
    title: string
    source_health: any
    niches: { id: string; name: string; icon: string | null } | null
  } | null
}
interface Props {
  briefs: SignalBrief[]
  reports: Report[]
  workspaces: Workspace[]
  niches: Niche[]
  plan: Plan
  locked: boolean
  usedThisMonth: number
  briefLimit: number
  primaryWorkspaceId: string | null
}

// ── Markdown helpers ──────────────────────────────────────────────────────────

function extractHeadline(md: string | null, fallback: string): string {
  if (!md) return fallback
  const m = md.match(/^#+\s+(.+)$/m)
  if (m) return m[1].replace(/\*\*/g, '').trim()
  const first = md.split('\n').find(l => l.trim())
  return first?.replace(/\*\*/g, '').trim().slice(0, 120) ?? fallback
}

function extractLede(md: string | null): string {
  if (!md) return ''
  const lines = md.split('\n')
  const para: string[] = []
  let started = false
  for (const l of lines) {
    const t = l.trim()
    if (!t) { if (started) break; continue }
    if (t.startsWith('#')) { started = true; continue }
    if (!t.match(/^\d+\.|^[-*]/)) { para.push(t); started = true }
    if (para.length >= 3) break
  }
  const raw = para.join(' ').replace(/\*\*/g, '').trim()
  return raw.length > 210 ? raw.slice(0, 210) + '…' : raw
}

function extractSoWhat(md: string | null): string | null {
  if (!md) return null
  const m = md.match(/\*{0,2}[Ss]o [Ww]hat[:\*_\s]{0,5}([\s\S]{10,300}?)(?:\n\n|\n#|$)/m)
  if (!m) return null
  return m[1].replace(/\*\*/g, '').replace(/\*/g, '').trim().slice(0, 280)
}

function boldify(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

// Simple markdown renderer for detail view
function SimpleMarkdown({ md }: { md: string }) {
  const blocks = md.split(/\n{2,}/).filter(Boolean)
  return (
    <div className="space-y-3 text-slate-700">
      {blocks.map((block, i) => {
        const t = block.trim()
        if (t.startsWith('# ')) return <h1 key={i} className="text-xl font-bold text-slate-800 leading-snug">{t.slice(2).replace(/\*\*/g, '')}</h1>
        if (t.startsWith('## ')) return <h2 key={i} className="text-base font-bold text-slate-800 mt-1">{t.slice(3).replace(/\*\*/g, '')}</h2>
        if (t.startsWith('### ')) return <h3 key={i} className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">{t.slice(4).replace(/\*\*/g, '')}</h3>
        if (t.match(/^(\d+\. |[-*] )/m)) {
          const items = t.split('\n').filter(l => l.trim())
          return (
            <ul key={i} className="space-y-2">
              {items.map((item, j) => {
                const isNum = item.match(/^(\d+)\. (.+)/)
                const isBul = item.match(/^[-*] (.+)/)
                if (isNum) return (
                  <li key={j} className="flex gap-2.5 text-[13px] leading-relaxed">
                    <span className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">{isNum[1]}</span>
                    <span dangerouslySetInnerHTML={{ __html: boldify(isNum[2]) }} />
                  </li>
                )
                if (isBul) return (
                  <li key={j} className="flex gap-2 text-[13px] leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0 mt-2" />
                    <span dangerouslySetInnerHTML={{ __html: boldify(isBul[1]) }} />
                  </li>
                )
                return <li key={j} className="text-[13px]" dangerouslySetInnerHTML={{ __html: boldify(item) }} />
              })}
            </ul>
          )
        }
        if (t.toLowerCase().startsWith('so what') || t.toLowerCase().startsWith('**so what')) {
          const text = t.replace(/^\*{0,2}[Ss]o [Ww]hat[\*:_\s]*/m, '').replace(/\*\*/g, '')
          return (
            <div key={i} className="bg-slate-50 border-l-[3px] border-indigo-500 rounded-r-lg px-3 py-2.5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 mb-1.5">So what</div>
              <p className="text-[13px] text-slate-700 leading-relaxed">{text}</p>
            </div>
          )
        }
        return <p key={i} className="text-[13px] leading-relaxed" dangerouslySetInnerHTML={{ __html: boldify(t) }} />
      })}
    </div>
  )
}

// ── Brief card (list view) ────────────────────────────────────────────────────

function BriefCard({
  brief,
  isAgency,
  isLatest,
  onView,
}: {
  brief: SignalBrief
  isAgency: boolean
  isLatest: boolean
  onView: () => void
}) {
  const [sharing, startShare] = useTransition()
  const [shareActive, setShareActive] = useState(brief.share_active)
  const [copiedShare, setCopiedShare] = useState(false)

  const report = brief.trend_reports
  const niche = report?.niches as any
  const nicheName = niche?.name ?? 'General'
  const nicheIcon = niche?.icon ?? ''
  const sourceHealth = report?.source_health ?? {}
  const totalSignals = sourceHealth.total_signals ?? 0
  const signalStrength = totalSignals > 400 ? 'hi' : 'med'

  const headline = extractHeadline(brief.content_md, report?.title ?? 'Signal Brief')
  const lede = extractLede(brief.content_md)
  const sowhat = extractSoWhat(brief.content_md)

  const date = new Date(brief.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
  const weekLabel = new Date(brief.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  const featCls = isLatest
    ? isAgency ? ' border-l-[3px] border-l-amber-400' : ' border-l-[3px] border-l-indigo-500'
    : ''

  const handleToggleShare = () => {
    const next = !shareActive
    setShareActive(next)
    startShare(() => toggleBriefShare(brief.id, next).catch(() => setShareActive(!next)))
  }

  const handleCopyShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/share/${brief.share_id}`)
    setCopiedShare(true)
    setTimeout(() => setCopiedShare(false), 2000)
  }

  return (
    <div className={`bg-white border border-slate-200 rounded-[13px] overflow-hidden cursor-pointer transition-shadow hover:shadow-[0_4px_16px_rgba(91,95,199,.10)]${featCls}`}>

      {/* Strip */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-slate-100">
        {nicheIcon && <span className="text-base flex-shrink-0">{nicheIcon}</span>}
        <span className={`text-[10px] font-bold uppercase tracking-[0.4px] ${isAgency ? 'text-amber-600' : 'text-indigo-600'}`}>
          {nicheName}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {isLatest && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600">Latest</span>
          )}
          {totalSignals > 0 && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${signalStrength === 'hi' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              {totalSignals} signals
            </span>
          )}
          {isAgency && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">✦ White-label</span>
          )}
          <span className="text-[10px] text-slate-400">{date}</span>
        </div>
      </div>

      {/* Doc */}
      <div className="px-3.5 py-3" onClick={onView}>
        <div className="text-[15px] font-bold text-slate-800 leading-[1.35] mb-2">{headline}</div>
        {lede && <p className="text-[12px] text-slate-500 leading-[1.7] mb-2.5">{lede}</p>}
        {sowhat && (
          <div className={`text-[12px] leading-[1.55] bg-slate-50 border border-slate-100 rounded-lg px-3 py-2`}>
            <strong className={isAgency ? 'text-amber-600' : 'text-indigo-600'}>So what: </strong>
            {sowhat}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1 px-3 py-2 border-t border-slate-100 bg-slate-50">
        <span className="text-[10px] text-slate-400">{weekLabel}</span>
        <div className="ml-auto flex gap-0.5 flex-wrap">
          <button
            onClick={onView}
            className={`h-[26px] px-2 rounded-md text-[11px] font-medium ${isAgency ? 'text-amber-700 hover:bg-amber-50' : 'text-indigo-600 hover:bg-indigo-50'}`}
          >
            View →
          </button>
          {isAgency && (
            <button className="h-[26px] px-2 rounded-md text-[11px] font-medium text-amber-700 hover:bg-amber-50">
              White-label
            </button>
          )}
          <a href="/newsletters" className={`h-[26px] px-2 rounded-md text-[11px] font-medium inline-flex items-center ${isAgency ? 'text-amber-700 hover:bg-amber-50' : 'text-indigo-600 hover:bg-indigo-50'}`}>
            Newsletter
          </a>
          <a href="/linkedin" className={`h-[26px] px-2 rounded-md text-[11px] font-medium inline-flex items-center ${isAgency ? 'text-amber-700 hover:bg-amber-50' : 'text-indigo-600 hover:bg-indigo-50'}`}>
            LinkedIn
          </a>
          <button
            onClick={handleToggleShare}
            disabled={sharing}
            className={`h-[26px] px-2 rounded-md text-[11px] font-medium ${shareActive ? 'text-emerald-600 hover:bg-emerald-50' : (isAgency ? 'text-amber-700 hover:bg-amber-50' : 'text-indigo-600 hover:bg-indigo-50')}`}
          >
            {shareActive ? 'Shared ✓' : 'Share'}
          </button>
          <button
            onClick={e => {
              e.stopPropagation()
              const win = window.open('', '_blank')
              if (win) {
                const title = extractHeadline(brief.content_md, 'Signal Brief')
                win.document.write(`<html><head><title>${title}</title><style>body{font-family:sans-serif;max-width:700px;margin:40px auto;padding:0 20px;line-height:1.7}@media print{body{margin:0}}</style></head><body><pre style="white-space:pre-wrap;font-family:sans-serif;font-size:14px">${(brief.content_md ?? '').replace(/</g, '&lt;')}</pre></body></html>`)
                win.document.close()
                win.print()
              }
            }}
            className={`h-[26px] px-2 rounded-md text-[11px] font-medium ${isAgency ? 'text-amber-700 hover:bg-amber-50' : 'text-indigo-600 hover:bg-indigo-50'}`}
          >
            PDF
          </button>
        </div>
      </div>

      {/* Share URL row */}
      {shareActive && (
        <div className="px-3 pb-3">
          <div className="flex rounded-md overflow-hidden border border-slate-200">
            <input
              readOnly
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/share/${brief.share_id}`}
              className="flex-1 px-2.5 py-1.5 bg-slate-50 text-[11px] text-slate-500 outline-none"
            />
            <button
              onClick={handleCopyShare}
              className="px-3 py-1.5 bg-white text-[11px] font-bold text-slate-700 hover:bg-slate-50 border-l border-slate-200"
            >
              {copiedShare ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Detail view (1-pager) ─────────────────────────────────────────────────────

function BriefDetail({
  brief,
  isAgency,
  onBack,
}: {
  brief: SignalBrief
  isAgency: boolean
  onBack: () => void
}) {
  const [sharing, startShare] = useTransition()
  const [shareActive, setShareActive] = useState(brief.share_active)
  const [copied, setCopied] = useState(false)

  const report = brief.trend_reports
  const niche = report?.niches as any
  const nicheName = niche?.name ?? 'General'
  const nicheIcon = niche?.icon ?? ''
  const sourceHealth = report?.source_health ?? {}
  const totalSignals = sourceHealth.total_signals ?? 0
  const signalStrength = totalSignals > 400 ? 'hi' : 'med'

  const headline = extractHeadline(brief.content_md, report?.title ?? 'Signal Brief')
  const date = new Date(brief.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  const handleToggleShare = () => {
    const next = !shareActive
    setShareActive(next)
    startShare(() => toggleBriefShare(brief.id, next).catch(() => setShareActive(!next)))
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(`${window.location.origin}/share/${brief.share_id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 bg-[#F7F7FC]">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-4">
        <button onClick={onBack} className="text-indigo-600 font-semibold hover:underline">
          Signal Briefs
        </button>
        <svg className="w-2.5 h-2.5 stroke-slate-400 fill-none" strokeWidth={1.5} strokeLinecap="round" viewBox="0 0 24 24">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="truncate max-w-[300px]">{headline}</span>
      </div>

      {/* Agency white-label banner */}
      {isAgency && (
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 mb-4">
          <div className="w-[30px] h-[30px] rounded-[7px] bg-amber-400/20 flex items-center justify-center text-sm flex-shrink-0">🎨</div>
          <div className="flex-1">
            <div className="text-[12px] font-bold text-white">White-label active — delivering in your brand</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Client logo and brand colours applied. Configure in Brand Voice settings.</div>
          </div>
          <a href="/brand-voice" className="h-[26px] px-3 rounded-[7px] bg-amber-400/20 text-amber-400 text-[11px] font-semibold border border-amber-400/30 flex-shrink-0 inline-flex items-center">
            Configure →
          </a>
        </div>
      )}

      {/* 1-pager document */}
      <div className="bg-white border border-slate-200 rounded-[14px] overflow-hidden mb-4">

        {/* Document header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="text-[10px] font-bold uppercase tracking-[0.8px] text-slate-400 mb-1.5">
            {isAgency ? 'Intelligence Brief · Powered by PulseLoop' : `Intelligence Brief · ${nicheName}`}
          </div>
          <div className="text-[20px] font-extrabold text-slate-800 leading-[1.25] mb-3 tracking-tight">
            {headline}
          </div>
          <div className="flex gap-1.5 flex-wrap mb-3">
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-indigo-50 text-indigo-600">{date}</span>
            {totalSignals > 0 && (
              <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${signalStrength === 'hi' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {signalStrength === 'hi' ? 'High signal week' : 'Medium signal week'}
              </span>
            )}
            {report?.title && (
              <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                Distilled from: {report.title.slice(0, 50)}
              </span>
            )}
            {isAgency && (
              <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700">✦ Private data reflected</span>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="px-6 py-5">
          {brief.content_md
            ? <SimpleMarkdown md={brief.content_md} />
            : <p className="text-[13px] text-slate-500 italic">Brief content not available.</p>
          }
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-3 border-t border-slate-100 bg-slate-50">
          <p className="text-[11px] text-slate-400 flex-1">
            <strong className="text-slate-500">{isAgency ? 'Intelligence Brief' : 'PulseLoop Signal Brief'}</strong>
            {totalSignals > 0 ? ` · ${totalSignals} signals analysed` : ''} · 18 EU-focused sources · 90-day RAG memory
          </p>
          <span className="text-[10px] text-slate-400 flex-shrink-0">{date}</span>
        </div>
      </div>

      {/* Send row */}
      <div className="bg-white border border-slate-200 rounded-[13px] p-4 flex items-center gap-3 mb-3">
        <div className="flex-1">
          <div className="text-[13px] font-semibold text-slate-800">Send this brief</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Share as a link, export as PDF{isAgency ? ' or send white-label to client' : ''}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleToggleShare}
            disabled={sharing}
            className={`h-[30px] px-3 rounded-lg text-[12px] font-semibold text-white inline-flex items-center gap-1.5 ${isAgency ? 'bg-slate-900' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            <svg className="w-3 h-3 fill-none stroke-white" strokeWidth={1.5} strokeLinecap="round" viewBox="0 0 24 24">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            {shareActive ? 'Deactivate Link' : 'Share link'}
          </button>
          {shareActive && (
            <button onClick={handleCopy} className="h-[30px] px-3 rounded-lg border border-slate-200 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">
              {copied ? 'Copied!' : 'Copy URL'}
            </button>
          )}
          <button
            onClick={() => {
              const win = window.open('', '_blank')
              if (win) {
                const title = extractHeadline(brief.content_md, 'Signal Brief')
                win.document.write(`<html><head><title>${title}</title><style>body{font-family:sans-serif;max-width:700px;margin:40px auto;padding:0 20px;line-height:1.7}h1,h2,h3{margin-top:1.5em}@media print{body{margin:0}}</style></head><body><pre style="white-space:pre-wrap;font-family:sans-serif;font-size:14px">${(brief.content_md ?? '').replace(/</g, '&lt;')}</pre></body></html>`)
                win.document.close()
                win.print()
              }
            }}
            className="h-[30px] px-3 rounded-lg border border-slate-200 text-[12px] font-medium text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1.5"
          >
            <svg className="w-3 h-3 fill-none stroke-current" strokeWidth={1.5} strokeLinecap="round" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            PDF
          </button>
          {isAgency && (
            <div className="relative group">
              <button className="h-[30px] px-3 rounded-lg border border-slate-200 text-[12px] font-medium text-slate-400 cursor-not-allowed opacity-60">
                🎨 White-label PDF
              </button>
              <div className="absolute bottom-[calc(100%+4px)] right-0 hidden group-hover:block bg-slate-800 text-white text-[10px] font-medium px-2 py-1 rounded-md whitespace-nowrap z-50">
                Coming soon
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Repurpose row */}
      <div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.6px] mb-2">Repurpose this brief</div>
        <div className="grid grid-cols-2 gap-2">
          <a href="/newsletters" className={`group flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all ${isAgency ? 'hover:border-amber-400 hover:bg-amber-50/50' : ''}`}>
            <div className={`w-[38px] h-[38px] rounded-[10px] flex items-center justify-center flex-shrink-0 transition-all ${isAgency ? 'bg-amber-100 group-hover:bg-slate-900' : 'bg-indigo-50 group-hover:bg-indigo-600'}`}>
              <svg className={`w-4 h-4 fill-none stroke-width-[1.5] stroke-linecap-round transition-all ${isAgency ? 'stroke-amber-600 group-hover:stroke-white' : 'stroke-indigo-600 group-hover:stroke-white'}`} strokeWidth={1.5} strokeLinecap="round" viewBox="0 0 24 24">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-slate-800 mb-0.5">Generate Newsletter</div>
              <div className="text-[11px] text-slate-500">Turns this brief into a full Beehiiv-ready email draft</div>
              <div className="text-[10px] text-slate-400 mt-1">{isAgency ? '4 per workspace · white-label' : '4 per niche · Pro'}</div>
            </div>
            <span className="text-slate-400 group-hover:text-indigo-500 transition-all text-base">→</span>
          </a>

          <a href="/linkedin" className={`group flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all ${isAgency ? 'hover:border-amber-400 hover:bg-amber-50/50' : ''}`}>
            <div className={`w-[38px] h-[38px] rounded-[10px] flex items-center justify-center flex-shrink-0 transition-all ${isAgency ? 'bg-amber-100 group-hover:bg-slate-900' : 'bg-indigo-50 group-hover:bg-indigo-600'}`}>
              <svg className={`w-4 h-4 fill-none stroke-width-[1.5] stroke-linecap-round transition-all ${isAgency ? 'stroke-amber-600 group-hover:stroke-white' : 'stroke-indigo-600 group-hover:stroke-white'}`} strokeWidth={1.5} strokeLinecap="round" viewBox="0 0 24 24">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-slate-800 mb-0.5">Generate LinkedIn Posts</div>
              <div className="text-[11px] text-slate-500">3 post variants from the brief — hook, insight and CTA styles</div>
              <div className="text-[10px] text-slate-400 mt-1">3 variants · included on all paid plans</div>
            </div>
            <span className="text-slate-400 group-hover:text-indigo-500 transition-all text-base">→</span>
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SignalBriefsClient({
  briefs,
  reports,
  workspaces,
  niches,
  plan,
  locked,
  usedThisMonth,
  briefLimit,
  primaryWorkspaceId,
}: Props) {
  const router = useRouter()
  const isStarter = locked
  const isAgency = plan === 'agency'

  const [view, setView] = useState<'list' | 'detail'>('list')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(primaryWorkspaceId ?? workspaces[0]?.id ?? '')
  const [activeNicheId, setActiveNicheId] = useState<string | null>(null)
  const [genReportId, setGenReportId] = useState('')
  const [genWorkspaceId, setGenWorkspaceId] = useState(primaryWorkspaceId ?? workspaces[0]?.id ?? '')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  const selectedBrief = briefs.find(b => b.id === selectedId) ?? null

  // Workspace briefs
  const workspaceBriefs = briefs.filter(b => b.workspace_id === activeWorkspaceId)

  // Niche filter
  const filteredBriefs = activeNicheId
    ? workspaceBriefs.filter(b => (b.trend_reports?.niches as any)?.id === activeNicheId)
    : workspaceBriefs

  // Mark first brief per niche as latest
  const latestIds = new Set<string>()
  const seenNiches = new Set<string>()
  filteredBriefs.forEach(b => {
    const nicheId = (b.trend_reports?.niches as any)?.id ?? '__none__'
    if (!seenNiches.has(nicheId)) { seenNiches.add(nicheId); latestIds.add(b.id) }
  })

  const workspaceNiches = niches.filter(n => n.workspace_id === activeWorkspaceId)
  const countByWorkspace: Record<string, number> = {}
  briefs.forEach(b => { countByWorkspace[b.workspace_id] = (countByWorkspace[b.workspace_id] ?? 0) + 1 })

  const panelReports = reports.filter(r => r.workspace_id === (isAgency ? genWorkspaceId : (primaryWorkspaceId ?? workspaces[0]?.id)))
  const atLimit = briefLimit > 0 && usedThisMonth >= briefLimit

  const handleGenerate = async () => {
    const reportId = genReportId || panelReports[0]?.id
    if (!reportId) return
    setGenerating(true)
    setGenError(null)
    try {
      const res = await fetch('/api/signal-brief', {
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

  // ── Detail view ─────────────────────────────────────────────────────────────
  if (view === 'detail' && selectedBrief) {
    return (
      <BriefDetail
        brief={selectedBrief}
        isAgency={isAgency}
        onBack={() => setView('list')}
      />
    )
  }

  // ── List view ───────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto p-5 bg-[#F7F7FC]">

      {/* ── Starter locked wall ─────────────────────────────────────────────── */}
      {isStarter && (
        <>
          <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 mb-6">
            <div className="w-[34px] h-[34px] rounded-[9px] bg-white flex items-center justify-center text-base flex-shrink-0">📋</div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-bold text-indigo-700">Signal Briefs are locked on Starter</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                The client-facing highlight reel of your weekly Trend Report — short, punchy, ready to share. Upgrade to Pro to unlock.
              </div>
              <div className="flex gap-1.5 flex-wrap mt-1.5">
                {['12 briefs/mo', '3× per week', 'Cited sources always', 'Feeds Newsletter & LinkedIn', 'White-label on Agency'].map(t => (
                  <span key={t} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{t}</span>
                ))}
              </div>
            </div>
            <a href="/settings" className="h-[24px] px-3 rounded-full text-[11px] font-semibold bg-indigo-600 text-white inline-flex items-center flex-shrink-0 whitespace-nowrap">
              Upgrade to Pro →
            </a>
          </div>

          <div className="flex flex-col items-center gap-5 py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
              <svg className="w-6 h-6 stroke-red-400 fill-none" strokeWidth={1.5} strokeLinecap="round" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div>
              <div className="text-[17px] font-bold text-slate-800 mb-2">Signal Briefs unlock on Pro</div>
              <p className="text-[13px] text-slate-500 max-w-[360px] leading-[1.65]">
                Your Trend Report stays internal. The Signal Brief is what you send to clients — a punchy, cited 1-pager distilled from your full report, written in your brand voice.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-w-[400px] w-full">
              {[
                { icon: <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>, title: 'From your Trend Report', sub: 'Extracted & distilled automatically' },
                { icon: <><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></>, title: 'Your brand voice', sub: 'Not generic — sounds like you' },
                { icon: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>, title: 'Feeds Newsletter', sub: 'Brief becomes newsletter input' },
                { icon: <><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></>, title: 'Feeds LinkedIn Posts', sub: '3 post variants from brief' },
              ].map((f, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-[9px] p-3 flex gap-2 items-start text-left">
                  <svg className="w-3.5 h-3.5 stroke-indigo-600 fill-none flex-shrink-0 mt-0.5" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24">
                    {f.icon}
                  </svg>
                  <div>
                    <div className="text-[12px] font-semibold text-slate-800">{f.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{f.sub}</div>
                  </div>
                </div>
              ))}
            </div>
            <a href="/settings" className="h-9 px-6 rounded-[10px] bg-indigo-600 text-white text-[13px] font-semibold inline-flex items-center hover:bg-indigo-700 transition-colors">
              Upgrade to Pro — from €99/mo →
            </a>
          </div>
        </>
      )}

      {/* ── Pro: Agency upsell banner ───────────────────────────────────────── */}
      {!isStarter && !isAgency && (
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-700 rounded-xl p-3.5 mb-4">
          <div className="w-[34px] h-[34px] rounded-[9px] bg-amber-400/20 flex items-center justify-center text-base flex-shrink-0">🏢</div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-bold text-white">Deliver white-label briefs to clients — upgrade to Agency.</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Pro briefs carry PulseLoop branding. Agency replaces it with your logo. The natural upgrade when delivering to 3+ clients professionally.
            </div>
            <div className="flex gap-1.5 flex-wrap mt-1.5">
              {['White-label delivery', 'Custom signals in brief', 'Private data reflected', 'Power BI from brief data'].map(t => (
                <span key={t} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-400">{t}</span>
              ))}
            </div>
          </div>
          <a href="/settings" className="h-[24px] px-3 rounded-full text-[11px] font-semibold bg-slate-800 border border-amber-400 text-amber-400 inline-flex items-center flex-shrink-0 whitespace-nowrap">
            Upgrade to Agency →
          </a>
        </div>
      )}

      {/* ── Agency workspace tabs ───────────────────────────────────────────── */}
      {isAgency && workspaces.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.6px] mb-1.5">Workspace</div>
          <div className="flex gap-1.5 flex-wrap">
            {workspaces.map(ws => (
              <button
                key={ws.id}
                onClick={() => { setActiveWorkspaceId(ws.id); setActiveNicheId(null) }}
                className={`h-7 px-3 rounded-[7px] text-[12px] font-semibold inline-flex items-center gap-1.5 ${
                  activeWorkspaceId === ws.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-200'
                }`}
              >
                {ws.name}
                <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${activeWorkspaceId === ws.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {countByWorkspace[ws.id] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Stats grid (Pro + Agency) ───────────────────────────────────────── */}
      {!isStarter && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-white border border-slate-200 rounded-[10px] px-3.5 py-3">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.4px] mb-1">Briefs this month</div>
            <div className="text-[19px] font-bold text-slate-800">{usedThisMonth}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">of {isAgency ? '12/workspace' : briefLimit}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-[10px] px-3.5 py-3">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.4px] mb-1">Cadence</div>
            <div className="text-[14px] font-bold text-slate-800 pt-1">3× / week</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{isAgency ? 'per workspace' : 'on Pro'}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-[10px] px-3.5 py-3">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.4px] mb-1">Avg read time</div>
            <div className="text-[14px] font-bold text-slate-800 pt-1">&lt; 60s</div>
            <div className="text-[10px] text-slate-400 mt-0.5">client-facing format</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-[10px] px-3.5 py-3">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.4px] mb-1">White-label</div>
            <div className={`text-[14px] font-bold pt-1 ${isAgency ? 'text-emerald-600' : 'text-slate-400'}`}>
              {isAgency ? 'Active' : 'Locked'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{isAgency ? 'Client-branded' : 'Agency only'}</div>
          </div>
        </div>
      )}

      {/* ── Generate panel (Pro + Agency) ──────────────────────────────────── */}
      {!isStarter && (
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[15px] flex-shrink-0 ${isAgency ? 'bg-amber-100' : 'bg-indigo-50'}`}>⚡</div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-slate-800">Generate a Signal Brief from a Trend Report</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Distils your full report into a client-ready 1-pager · brand voice applied · every signal cited · feeds Newsletter &amp; LinkedIn
            </div>
          </div>
          {isAgency && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">✦ White-label</span>
          )}
          {isAgency && workspaces.length > 1 && (
            <select
              value={genWorkspaceId}
              onChange={e => { setGenWorkspaceId(e.target.value); setGenReportId('') }}
              className="h-7 px-2 rounded-[7px] border border-slate-200 text-[11px] text-slate-600 bg-white outline-none cursor-pointer"
            >
              {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
            </select>
          )}
          <select
            value={genReportId || panelReports[0]?.id || ''}
            onChange={e => setGenReportId(e.target.value)}
            className="h-7 px-2 rounded-[7px] border border-slate-200 text-[11px] text-slate-600 bg-white outline-none cursor-pointer w-[175px]"
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
            className={`h-[30px] px-3 rounded-lg text-[12px] font-semibold text-white inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${isAgency ? 'bg-slate-900' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {generating ? (
              <>
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Generating…
              </>
            ) : 'Generate →'}
          </button>
        </div>
      )}

      {genError && (
        <div className="mb-3 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-[12px] text-red-600 font-medium">{genError}</div>
      )}

      {/* ── Filter row (Pro + Agency) ───────────────────────────────────────── */}
      {!isStarter && (
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          <button
            onClick={() => setActiveNicheId(null)}
            className={`h-[26px] px-2.5 rounded-full text-[11px] font-semibold ${activeNicheId === null ? (isAgency ? 'bg-slate-900 text-white' : 'bg-indigo-600 text-white') : 'bg-white text-slate-500 border border-slate-200'}`}
          >
            All
          </button>
          {workspaceNiches.map(n => (
            <button
              key={n.id}
              onClick={() => setActiveNicheId(n.id)}
              className={`h-[26px] px-2.5 rounded-full text-[11px] font-semibold ${activeNicheId === n.id ? (isAgency ? 'bg-slate-900 text-white' : 'bg-indigo-600 text-white') : 'bg-white text-slate-500 border border-slate-200'}`}
            >
              {n.icon ? `${n.icon} ` : ''}{n.name}
            </button>
          ))}
          <div className="ml-auto">
            <select className="h-7 px-2 rounded-[7px] border border-slate-200 text-[11px] text-slate-500 bg-white outline-none cursor-pointer">
              <option>Newest first</option>
              <option>Most shared</option>
            </select>
          </div>
        </div>
      )}

      {/* ── Brief list ──────────────────────────────────────────────────────── */}
      {!isStarter && (
        filteredBriefs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center bg-white border border-slate-200 rounded-xl">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-2xl">📋</div>
            <div className="text-[15px] font-bold text-slate-800">No briefs yet</div>
            <p className="text-[13px] text-slate-500 max-w-sm">
              Generate a Signal Brief from any Trend Report. It distils the full report into a client-ready 1-pager.
            </p>
            {reports.length === 0 && (
              <a href="/reports" className="text-[13px] font-semibold text-indigo-600 hover:text-indigo-700">
                Create a Trend Report first →
              </a>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filteredBriefs.map(brief => (
              <BriefCard
                key={brief.id}
                brief={brief}
                isAgency={isAgency}
                isLatest={latestIds.has(brief.id)}
                onView={() => { setSelectedId(brief.id); setView('detail') }}
              />
            ))}
          </div>
        )
      )}
    </div>
  )
}
