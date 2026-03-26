'use client'

import { useState, useRef } from 'react'
import type { Plan } from '@/lib/plans'

// ── Built-in sources data (matches design exactly) ──────────────
const BUILTIN_SOURCES = [
  { emoji: '💼', name: 'LinkedIn',          tier: 'Tier 1 · Core',       defaultOn: true,  platformKey: 'linkedin'         },
  { emoji: '🔶', name: 'Hacker News',       tier: 'Tier 1 · Core',       defaultOn: true,  platformKey: 'hackernews'       },
  { emoji: '🟠', name: 'Reddit',            tier: 'Tier 1 · Core',       defaultOn: true,  platformKey: 'reddit'           },
  { emoji: '📰', name: 'Google News',       tier: 'Tier 1 · Core',       defaultOn: true,  platformKey: 'googlenews'       },
  { emoji: '𝕏',  name: 'X / Twitter',      tier: 'Tier 1 · Core',       defaultOn: true,  platformKey: 'twitter'          },
  { emoji: '🇫🇷', name: 'Malt.fr',           tier: 'Tier 2 · EU Edge',   defaultOn: true,  platformKey: 'malt'             },
  { emoji: '📡', name: 'FrenchWeb',         tier: 'Tier 2 · EU Edge',   defaultOn: true,  platformKey: 'frenchweb'        },
  { emoji: '🎯', name: 'Maddyness',         tier: 'Tier 2 · EU Edge',   defaultOn: true,  platformKey: 'maddyness'        },
  { emoji: '🚀', name: 'ProductHunt',       tier: 'Tier 2 · EU Edge',   defaultOn: true,  platformKey: 'producthunt'      },
  { emoji: '💼', name: 'Welcome to Jungle', tier: 'Tier 2 · EU Edge',   defaultOn: false, platformKey: 'welcometothejungle'},
  { emoji: '📊', name: 'Dealroom',          tier: 'Tier 2 · EU Edge',   defaultOn: true,  platformKey: 'dealroom'         },
  { emoji: '📝', name: 'Substack',          tier: 'Tier 2 · EU Edge',   defaultOn: true,  platformKey: 'substack'         },
  { emoji: '🔮', name: 'Polymarket',        tier: 'Tier 3 · Deep Intel', defaultOn: false, platformKey: 'polymarket'       },
  { emoji: '💻', name: 'GitHub Trending',   tier: 'Tier 3 · Deep Intel', defaultOn: true,  platformKey: 'github'           },
  { emoji: '🎬', name: 'YouTube',           tier: 'Tier 3 · Deep Intel', defaultOn: false, platformKey: 'youtube'          },
  { emoji: '🏛️', name: 'EU Parliament',     tier: 'Tier 3 · Deep Intel', defaultOn: true,  platformKey: 'euparliament'     },
  { emoji: '🔒', name: 'CNIL',              tier: 'Tier 3 · Deep Intel', defaultOn: true,  platformKey: 'cnil'             },
  { emoji: '🦋', name: 'Bluesky',           tier: 'Tier 3 · Deep Intel', defaultOn: false, platformKey: 'bluesky'          },
]

// ── Relative time helper ─────────────────────────────────────────
function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return `${Math.floor(diffHr / 24)}d ago`
}

const TIERS = ['Tier 1 · Core', 'Tier 2 · EU Edge', 'Tier 3 · Deep Intel']

type UploadedFile = {
  id: string
  icon: string
  name: string
  size: string
  type: string
  status: 'processing' | 'processed'
  usedIn: string
}

function fileTypeIcon(name: string): { icon: string; type: string; bg: string } {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return { icon: '📄', type: 'PDF', bg: 'bg-red-50' }
  if (ext === 'xlsx' || ext === 'xls') return { icon: '📊', type: 'Excel', bg: 'bg-emerald-50' }
  if (ext === 'docx' || ext === 'doc') return { icon: '📝', type: 'Word', bg: 'bg-blue-50' }
  return { icon: '📃', type: 'TXT', bg: 'bg-slate-100' }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Privacy Modal ────────────────────────────────────────────────
function PrivacyModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[440px] mx-5 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="w-[34px] h-[34px] rounded-[9px] bg-amber-100 flex items-center justify-center text-lg flex-shrink-0">
            🔒
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-bold text-slate-900">How your files are handled</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Privacy details — PulseLoop data processing</div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 text-base transition-colors flex-shrink-0"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-5">
          <p className="text-[13px] text-slate-800 leading-[1.85]">
            When you upload a document, PulseLoop loads it into{' '}
            <strong className="font-bold">temporary server memory</strong>, extracts the relevant
            signals, generates your report, then{' '}
            <strong className="font-bold">immediately deletes the file</strong>. Nothing is written
            to our database — ever. The report is saved; your source document is not.
            <br /><br />
            Our infrastructure runs on{' '}
            <strong className="font-bold">Supabase EU Frankfurt servers</strong>, built for GDPR
            compliance. Under <strong className="font-bold">GDPR Article 17</strong>, you can also
            request deletion of any data we hold about you at any time.
          </p>
        </div>

        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
          <div className="flex-1 flex items-center gap-1.5 text-[11px] text-slate-400">
            <svg className="w-3 h-3 flex-shrink-0 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            Supabase EU-West (Frankfurt) · GDPR compliant · Article 17 deletion on request
          </div>
          <button
            onClick={onClose}
            className="h-7 px-3 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Toggle component ─────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-8 h-[18px] rounded-full border-none cursor-pointer flex-shrink-0 transition-colors duration-200 ml-auto ${on ? 'bg-emerald-500' : 'bg-slate-300'}`}
    >
      <span
        className={`absolute top-[3px] w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-200 ${on ? 'left-[17px]' : 'left-[3px]'}`}
      />
    </button>
  )
}

// ── Locked state (Starter + Pro) ─────────────────────────────────
function LockedPersonalSources({ plan }: { plan: Plan }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-14 text-center px-4">
      <div className="w-[60px] h-[60px] rounded-[18px] bg-red-50 flex items-center justify-center">
        <svg className="w-[26px] h-[26px] text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>

      <div>
        <div className="text-lg font-bold text-slate-900 mb-2">
          Personal sources are an Agency feature
        </div>
        <p className="text-[13px] text-slate-500 max-w-[380px] leading-relaxed">
          Upload your own PDFs, Excel files, Word documents and text files to weave private data
          into your reports. Every upload is processed in memory and deleted instantly — zero trace
          on our servers.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 w-full max-w-[400px]">
        {[
          { icon: 'file', title: 'PDF, Excel, Word, TXT', sub: 'Upload any internal document' },
          { icon: 'shield', title: 'Zero data retention', sub: 'Processed in memory, deleted instantly' },
          { icon: 'pulse', title: 'Woven into reports', sub: 'Private signals alongside 18 EU sources' },
          { icon: 'info', title: 'Per workspace', sub: 'Each client workspace is fully isolated' },
        ].map((feat) => (
          <div key={feat.title} className="bg-white border border-slate-200 rounded-[9px] p-3 flex gap-2 items-start text-left">
            <svg className="w-3 h-3 text-indigo-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {feat.icon === 'file' && <><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></>}
              {feat.icon === 'shield' && <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>}
              {feat.icon === 'pulse' && <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>}
              {feat.icon === 'info' && <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>}
            </svg>
            <div>
              <div className="text-[12px] font-semibold text-slate-800">{feat.title}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{feat.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <a
        href="/upgrade"
        className="h-9 px-6 rounded-[10px] bg-slate-900 text-amber-400 text-[13px] font-semibold border-none cursor-pointer hover:bg-slate-800 transition-colors flex items-center"
      >
        Upgrade to Agency — from €249/mo →
      </a>
    </div>
  )
}

// ── Signal stats badge ───────────────────────────────────────────
function SignalStatsBadge({
  platformKey,
  signalStatsByPlatform,
}: {
  platformKey: string
  signalStatsByPlatform: Record<string, { count: number; lastSeen: string }>
}) {
  const stats = signalStatsByPlatform[platformKey]
  if (!stats || stats.count === 0) {
    return <div className="text-[9px] text-slate-400 mt-0.5">No signals yet</div>
  }
  return (
    <>
      <div className="text-[9px] font-semibold text-emerald-600 mt-0.5">{stats.count} this week</div>
      <div className="text-[9px] text-slate-400">Last seen {relativeTime(stats.lastSeen)}</div>
    </>
  )
}

// ── Agency full view ─────────────────────────────────────────────
function AgencySourcesView({
  workspaces,
  signalStatsByPlatform,
}: {
  workspaces: Array<{ id: string; name: string }>
  signalStatsByPlatform: Record<string, { count: number; lastSeen: string }>
}) {
  const [activeWsIndex, setActiveWsIndex] = useState(0)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [toggles, setToggles] = useState<Record<number, boolean>>(
    Object.fromEntries(BUILTIN_SOURCES.map((s, i) => [i, s.defaultOn]))
  )
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleToggle = (i: number) => {
    setToggles((prev) => ({ ...prev, [i]: !prev[i] }))
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    Array.from(files).forEach((file) => {
      const { icon, type, bg } = fileTypeIcon(file.name)
      const newFile: UploadedFile = {
        id: crypto.randomUUID(),
        icon,
        name: file.name,
        size: formatBytes(file.size),
        type,
        status: 'processing',
        usedIn: '—',
      }
      setUploadedFiles((prev) => [newFile, ...prev])
      // Simulate processing
      setTimeout(() => {
        setUploadedFiles((prev) =>
          prev.map((f) => f.id === newFile.id ? { ...f, status: 'processed' } : f)
        )
      }, 2000)
    })
    // Reset input
    e.target.value = ''
  }

  const handleRemove = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const wsName = workspaces[activeWsIndex]?.name ?? 'My Workspace'

  return (
    <>
      {/* Workspace tabs */}
      <div className="mb-1">
        <div className="text-[10px] font-bold uppercase tracking-[0.6px] text-slate-400 mb-2">
          Workspace
        </div>
        <div className="flex gap-1.5 flex-wrap mb-4">
          {workspaces.map((ws, i) => (
            <button
              key={ws.id}
              onClick={() => setActiveWsIndex(i)}
              className={`h-7 px-3 rounded-[7px] text-xs font-semibold border-none cursor-pointer transition-colors ${
                i === activeWsIndex
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-500 border border-slate-200'
              }`}
              style={i !== activeWsIndex ? { border: '1px solid #E4E4F0' } : {}}
            >
              {ws.name}
            </button>
          ))}
          <button className="h-7 px-3 rounded-[7px] text-xs font-semibold text-slate-400 bg-transparent border border-dashed border-slate-300 cursor-pointer hover:border-slate-400 transition-colors">
            + Add workspace
          </button>
        </div>
      </div>

      {/* Privacy bar */}
      <div className="flex items-center gap-3 px-3.5 py-3 rounded-[11px] mb-4 border bg-amber-50/70 border-amber-200/60">
        <div className="w-7 h-7 rounded-[7px] bg-amber-200/60 flex items-center justify-center flex-shrink-0 text-sm">
          🔒
        </div>
        <p className="text-[12px] text-slate-600 flex-1 leading-relaxed">
          <strong className="font-bold text-slate-800">Your uploaded files are never stored.</strong>{' '}
          Processed in memory, deleted instantly after your report generates. Zero trace on our servers.
        </p>
        <button
          onClick={() => setShowPrivacyModal(true)}
          className="text-[11px] font-semibold text-amber-700 underline underline-offset-2 cursor-pointer whitespace-nowrap bg-none border-none font-[inherit] hover:text-amber-800"
        >
          🔒 View Privacy Details
        </button>
      </div>

      {/* Personal sources section */}
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.6px] text-slate-400 mb-3">
        <span>Personal sources — {wsName}</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {/* Uploaded files */}
      {uploadedFiles.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-3">
          {uploadedFiles.map((file) => {
            const bg =
              file.type === 'PDF' ? 'bg-red-50' :
              file.type === 'Excel' ? 'bg-emerald-50' :
              file.type === 'Word' ? 'bg-blue-50' : 'bg-slate-100'
            return (
              <div key={file.id} className="bg-white border border-slate-200 rounded-[10px] px-3.5 py-2.5 flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center text-sm flex-shrink-0`}>
                  {file.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-slate-800 truncate">{file.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {file.type} · {file.size}
                    {file.usedIn !== '—' && ` · Used in: ${file.usedIn}`}
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  file.status === 'processing'
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {file.status === 'processing' ? '⟳ Processing...' : '✓ Processed'}
                </span>
                <button
                  onClick={() => handleRemove(file.id)}
                  className="h-6 px-2 rounded-md bg-transparent border-none text-[11px] text-red-500 cursor-pointer font-medium hover:bg-red-50 transition-colors"
                >
                  Remove
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Upload zone */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.xlsx,.xls,.docx,.doc,.txt"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full border-2 border-dashed border-slate-300 hover:border-amber-400 rounded-[13px] py-7 px-5 flex flex-col items-center gap-3 bg-white hover:bg-amber-50/30 cursor-pointer transition-all mb-4 group"
      >
        <div className="w-11 h-11 rounded-[12px] bg-slate-100 group-hover:bg-slate-900 flex items-center justify-center transition-all">
          <svg className="w-5 h-5 text-slate-500 group-hover:text-white transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div className="text-[14px] font-bold text-slate-500 group-hover:text-amber-700 transition-colors">
          Add a personal source
        </div>
        <div className="text-[12px] text-slate-400 text-center leading-relaxed max-w-xs">
          Upload internal documents to weave your private data into reports.
          <br />Processed in memory · deleted instantly · zero trace.
        </div>
        <div className="flex gap-1.5 flex-wrap justify-center">
          {[
            { label: 'PDF', color: 'bg-red-500' },
            { label: 'Excel', color: 'bg-emerald-500' },
            { label: 'Word', color: 'bg-blue-600' },
            { label: 'TXT', color: 'bg-slate-400' },
          ].map((ft) => (
            <span key={ft.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
              <span className={`w-2 h-2 rounded-[2px] flex-shrink-0 ${ft.color}`} />
              {ft.label}
            </span>
          ))}
        </div>
      </button>

      {/* Built-in EU sources */}
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.6px] text-slate-400 mb-1 mt-1">
        <span>Built-in EU sources (18)</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {TIERS.map((tier) => {
        const sources = BUILTIN_SOURCES.map((s, i) => ({ ...s, index: i })).filter((s) => s.tier === tier)
        return (
          <div key={tier} className="mb-3">
            <div className="text-[10px] font-semibold text-slate-400 mb-1.5 mt-1">{tier}</div>
            <div className="grid grid-cols-3 gap-2">
              {sources.map((s) => (
                <div
                  key={s.index}
                  className="bg-white border border-slate-200 rounded-[11px] px-3 py-2.5 flex items-center gap-2.5"
                >
                  <span className="text-[17px] flex-shrink-0">{s.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-slate-800 truncate">{s.name}</div>
                    <SignalStatsBadge platformKey={s.platformKey} signalStatsByPlatform={signalStatsByPlatform} />
                  </div>
                  <Toggle on={toggles[s.index]} onChange={() => handleToggle(s.index)} />
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {showPrivacyModal && <PrivacyModal onClose={() => setShowPrivacyModal(false)} />}
    </>
  )
}

// ── Starter/Pro view — built-in sources read-only ────────────────
function StarterProSourcesView({
  signalStatsByPlatform,
}: {
  signalStatsByPlatform: Record<string, { count: number; lastSeen: string }>
}) {
  return (
    <>
      {/* Built-in EU sources (read-only) */}
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.6px] text-slate-400 mb-3">
        <span>Built-in EU sources (18)</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {TIERS.map((tier) => {
        const sources = BUILTIN_SOURCES.filter((s) => s.tier === tier)
        return (
          <div key={tier} className="mb-3">
            <div className="text-[10px] font-semibold text-slate-400 mb-1.5 mt-1">{tier}</div>
            <div className="grid grid-cols-3 gap-2">
              {sources.map((s) => (
                <div
                  key={s.name}
                  className="bg-white border border-slate-200 rounded-[11px] px-3 py-2.5 flex items-center gap-2.5"
                >
                  <span className="text-[17px] flex-shrink-0">{s.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-slate-800 truncate">{s.name}</div>
                    <SignalStatsBadge platformKey={s.platformKey} signalStatsByPlatform={signalStatsByPlatform} />
                  </div>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.defaultOn ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Locked personal sources section */}
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.6px] text-slate-400 mb-3 mt-2">
        <span>Personal sources</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>
      <LockedPersonalSources plan="starter" />
    </>
  )
}

// ── Main export ──────────────────────────────────────────────────
export default function SourcesClient({
  plan,
  isAgency,
  workspaces,
  signalStatsByPlatform,
  lastScrapedAt,
}: {
  plan: Plan
  isAgency: boolean
  workspaces: Array<{ id: string; name: string }>
  signalStatsByPlatform: Record<string, { count: number; lastSeen: string }>
  lastScrapedAt: string | null
}) {
  return (
    <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
      {lastScrapedAt && (
        <div className="text-[11px] text-slate-400 mb-3">
          Last scraped: <span className="font-medium text-slate-600">{relativeTime(lastScrapedAt)}</span>
        </div>
      )}
      {isAgency ? (
        <AgencySourcesView
          workspaces={workspaces.length > 0 ? workspaces : [{ id: '1', name: 'My Workspace' }]}
          signalStatsByPlatform={signalStatsByPlatform}
        />
      ) : (
        <StarterProSourcesView signalStatsByPlatform={signalStatsByPlatform} />
      )}
    </div>
  )
}
