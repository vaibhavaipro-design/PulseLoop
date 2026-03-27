'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Plan } from '@/lib/plans'

// ── Types ─────────────────────────────────────────────────────────
interface Workspace { id: string; name: string }
interface Variant { type: string; content: string }
interface LinkedInPost {
  id: string
  workspace_id: string
  variants: Variant[]
  newsletter_id: string
  newsletters: {
    id: string
    angle: string | null
    trend_reports: { title: string; niches: { name: string } | null } | null
  } | null
}
interface Newsletter {
  id: string
  angle: string | null
  trend_reports: { id: string; workspace_id: string; title: string; niches: { name: string } | null } | null
}
interface TrendReport {
  id: string
  workspace_id: string
  title: string
  niches: { name: string } | null
}

// ── Brand colours (matches design system) ─────────────────────────
const C = {
  a: '#5B5FC7', al: '#EEEEFF', am: '#A3A6E8',
  tp: '#1A1A3E', ts: '#6B6B8A', tt: '#A0A0BE',
  br: '#E4E4F0', bp: '#F0F0F7', bm: '#F7F7FC',
  su: '#4CAF82', sub: '#E8F7EF',
  wa: '#F5A623', wab: '#FFF4E0',
  ag: '#1A1A3E', agb: '#F5A623',
  li: '#0A66C2', lil: '#E8F0FE',
  da: '#E85757', dab: '#FDEAEA',
}

// ── Icons ─────────────────────────────────────────────────────────
function IconCopy({ size = 10 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: size, height: size }}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}
function IconLinkedIn({ size = 11 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: size, height: size }}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" />
    </svg>
  )
}
function IconPlus({ size = 11 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ width: size, height: size }}>
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
function IconLock({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={C.da} strokeWidth="1.5" strokeLinecap="round" style={{ width: size, height: size }}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
function IconCheck({ size = 13 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={C.a} strokeWidth="2" strokeLinecap="round" style={{ width: size, height: size }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// ── Variant display config ─────────────────────────────────────────
function variantConfig(type: string, isAg: boolean) {
  const t = type.toLowerCase()
  if (isAg) return { label: t.charAt(0).toUpperCase() + t.slice(1), color: '#9A6600', bg: 'rgba(245,166,35,.15)' }
  const map: Record<string, { label: string; color: string; bg: string }> = {
    hook:       { label: 'Hook',       color: C.a,  bg: C.al },
    insight:    { label: 'Insight',    color: C.su, bg: C.sub },
    cta:        { label: 'CTA',        color: C.wa, bg: C.wab },
    story:      { label: 'Story',      color: C.a,  bg: C.al },
    contrarian: { label: 'Contrarian', color: C.da, bg: C.dab },
  }
  return map[t] ?? { label: type.charAt(0).toUpperCase() + type.slice(1), color: C.ts, bg: C.bp }
}

// ── Copy button ────────────────────────────────────────────────────
function CopyBtn({ text, isAg, small }: { text: string; isAg: boolean; small?: boolean }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      style={{
        height: small ? 24 : 26, padding: small ? '0 8px' : '0 10px',
        borderRadius: 7, fontSize: small ? 10 : 11, fontWeight: 600, border: 'none', cursor: 'pointer',
        background: isAg ? 'rgba(245,166,35,.15)' : C.lil,
        color: isAg ? '#9A6600' : C.li,
        display: 'inline-flex', alignItems: 'center', gap: small ? 3 : 4, transition: 'background .15s',
        flexShrink: 0,
      }}
    >
      <IconCopy size={small ? 9 : 10} />
      {copied ? 'Copied!' : small ? 'Copy all 3' : 'Copy'}
    </button>
  )
}

// ── Variant normalizer ─────────────────────────────────────────────
// Handles old DB rows where variants[0].content = full JSON array string
function normalizeVariants(variants: Variant[]): Variant[] {
  if (!Array.isArray(variants) || variants.length === 0) return variants
  const first = variants[0]
  if (first?.content) {
    const cleaned = first.content.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
    if (cleaned.startsWith('[')) {
      try {
        const parsed = JSON.parse(cleaned)
        if (Array.isArray(parsed) && parsed[0]?.type && parsed[0]?.content) return parsed
      } catch {}
    }
  }
  return variants
}

// ── DELETE CONFIRM MODAL ──────────────────────────────────────────

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
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 25px 50px -12px rgba(0,0,0,.15)', width: '100%', maxWidth: 320, padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: C.tp, marginBottom: 4 }}>Delete this post set?</h3>
        <p style={{ fontSize: 12, color: C.ts, marginBottom: 20 }}>This cannot be undone.</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{ flex: 1, height: 30, borderRadius: 8, border: `1px solid ${C.br}`, fontSize: 12, fontWeight: 600, color: C.ts, cursor: 'pointer', background: '#fff', opacity: loading ? 0.5 : 1 }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{ flex: 1, height: 30, borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer', background: C.da, opacity: loading ? 0.5 : 1 }}
          >
            {loading ? 'Deleting…' : 'Delete permanently'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── GENERATE LINKEDIN MODAL ─────────────────────────────────────────

function GenerateLinkedInModal({
  newsletters,
  trendReports,
  workspaces,
  plan,
  onClose,
  onGenerate,
  generating,
  error,
}: {
  newsletters: Newsletter[]
  trendReports: TrendReport[]
  workspaces: Workspace[]
  plan: Plan
  onClose: () => void
  onGenerate: (newsletterId: string) => void
  generating: boolean
  error: string | null
}) {
  const isAg = plan === 'agency'
  const isS = plan === 'starter'
  const [wsId, setWsId] = useState(workspaces[0]?.id ?? '')
  const [genSrc, setGenSrc] = useState<'report' | 'brief' | 'newsletter'>('newsletter')
  const [genId, setGenId] = useState('')

  // Filter source items by selected workspace
  const wsNewsletters = isAg && wsId ? newsletters.filter(n => n.trend_reports?.workspace_id === wsId) : newsletters
  const wsReports = isAg && wsId ? trendReports.filter(r => r.workspace_id === wsId) : trendReports

  const genDropdownItems: Array<{ id: string; label: string }> =
    genSrc === 'newsletter'
      ? wsNewsletters.map(n => ({
          id: n.id,
          label: n.trend_reports
            ? `📧 ${n.trend_reports.niches?.name ?? 'Newsletter'} · ${n.trend_reports.title?.slice(0, 35) ?? 'Newsletter'}`
            : `📧 Newsletter`,
        }))
      : genSrc === 'report'
      ? wsReports.map(r => ({
          id: r.id,
          label: `📊 ${r.niches?.name ?? 'Report'} · ${r.title?.slice(0, 40) ?? 'Trend Report'}`,
        }))
      : []

  const bgOn = isAg ? 'rgba(245,166,35,.15)' : C.al
  const colorOn = isAg ? '#9A6600' : C.a
  const btnBg = isAg ? C.ag : C.li

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 25px 50px -12px rgba(0,0,0,.15)', width: '100%', maxWidth: 420, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.tp }}>Generate LinkedIn Posts</h3>
          <button onClick={onClose} style={{ color: C.tt, fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        {error && <div style={{ marginBottom: 16, padding: '10px 12px', background: C.dab, borderRadius: 8, fontSize: 12, color: C.da }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Workspace selector */}
          {isAg && workspaces.length > 1 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.tt, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Workspace</div>
              <select
                value={wsId}
                onChange={e => setWsId(e.target.value)}
                style={{ width: '100%', height: 30, padding: '0 10px', borderRadius: 8, border: `1px solid ${C.br}`, fontSize: 12, color: C.ts, background: C.bm, fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}
              >
                {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.tt, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Source type</div>
            <div style={{ display: 'flex', border: `1px solid ${C.br}`, borderRadius: 8, overflow: 'hidden' }}>
              {([
                { key: 'report' as const, label: '📊 Trend Report', disabled: false },
                { key: 'brief' as const, label: '📋 Signal Brief', disabled: isS },
                { key: 'newsletter' as const, label: '📧 Newsletter', disabled: isS },
              ]).map(({ key, label, disabled }) => (
                <button
                  key={key}
                  disabled={disabled}
                  onClick={() => { if (!disabled) { setGenSrc(key); setGenId('') } }}
                  title={disabled ? 'Upgrade to Pro' : undefined}
                  style={{
                    flex: 1, height: 28, fontSize: 11, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
                    border: 'none', background: genSrc === key ? bgOn : '#fff', color: genSrc === key ? colorOn : C.ts,
                    borderRight: `1px solid ${C.br}`, opacity: disabled ? 0.4 : 1,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.tt, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              {genSrc === 'report' ? 'Select Report' : genSrc === 'brief' ? 'Select Signal Brief' : 'Select Newsletter'}
            </div>
            <select
              value={genId}
              onChange={e => setGenId(e.target.value)}
              style={{ width: '100%', height: 30, padding: '0 10px', borderRadius: 8, border: `1px solid ${C.br}`, fontSize: 12, color: C.ts, background: C.bm, fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}
            >
              <option value="">Select…</option>
              {genDropdownItems.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, height: 30, borderRadius: 8, border: `1px solid ${C.br}`, fontSize: 12, fontWeight: 600, color: C.ts, cursor: 'pointer', background: '#fff' }}
          >
            Cancel
          </button>
          <button
            onClick={() => { if (genId) onGenerate(genId) }}
            disabled={generating || !genId}
            style={{
              flex: 1, height: 30, borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700, color: '#fff', cursor: generating || !genId ? 'not-allowed' : 'pointer',
              background: btnBg, opacity: generating || !genId ? 0.5 : 1,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}
          >
            {generating ? 'Generating…' : 'Generate →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Post set card ──────────────────────────────────────────────────
const PREVIEW_CHARS = 180

function PostSetCard({ post, plan, onDelete }: { post: LinkedInPost; plan: Plan; onDelete: (id: string) => void }) {
  const isAg = plan === 'agency'
  const [expanded, setExpanded] = useState(false)
  const newsletter = post.newsletters
  const report = newsletter?.trend_reports
  const niche = report?.niches?.name ?? 'General'
  const title = report?.title ?? newsletter?.angle ?? 'Trend Report'
  const variants: Variant[] = normalizeVariants(Array.isArray(post.variants) ? post.variants : [])
  const source = newsletter?.angle ? `Newsletter · ${newsletter.angle}` : 'Trend Report'

  const accentColor = isAg ? C.agb : C.a
  const borderLeft = `3px solid ${accentColor}`

  return (
    <div style={{
      background: '#fff', border: `1px solid ${C.br}`, borderRadius: 13,
      overflow: 'hidden', marginBottom: 12, borderLeft,
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px 10px', borderBottom: `1px solid ${C.br}`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>💼</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: isAg ? '#9A6600' : C.a }}>
            {niche} · from {source}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.tp, marginTop: 2 }}>{title}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 9999, background: C.sub, color: C.su }}>
            High signal
          </span>
          {isAg && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 9999, background: 'rgba(245,166,35,.15)', color: '#9A6600' }}>
              ✦ White-label
            </span>
          )}
        </div>
      </div>

      {/* Preview / expand */}
      {!expanded ? (
        <div style={{ padding: '10px 14px', borderTop: `1px solid ${C.br}` }}>
          {variants[0] && (
            <div style={{ fontSize: 12, color: C.tp, lineHeight: 1.6, marginBottom: 6 }}>
              <span style={{ fontWeight: 700, color: isAg ? '#9A6600' : C.a, textTransform: 'uppercase', fontSize: 10, letterSpacing: '.4px', marginRight: 6 }}>
                {variantConfig(variants[0].type, isAg).label}
              </span>
              {variants[0].content.slice(0, PREVIEW_CHARS)}{variants[0].content.length > PREVIEW_CHARS ? '…' : ''}
            </div>
          )}
          <button
            onClick={() => setExpanded(true)}
            style={{ fontSize: 11, fontWeight: 600, color: isAg ? '#9A6600' : C.a, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            View all 3 variants →
          </button>
        </div>
      ) : (
        <div>
          {/* 3-variant grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', borderTop: `1px solid ${C.br}` }}>
            {variants.map((v, i) => {
              const cfg = variantConfig(v.type, isAg)
              const isLast = i === variants.length - 1
              return (
                <div key={i} style={{
                  padding: '12px 14px',
                  borderRight: isLast ? 'none' : `1px solid ${C.br}`,
                }}>
                  {/* type row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: cfg.color }}>
                      {cfg.label}
                    </span>
                    <CopyBtn text={v.content} isAg={isAg} />
                  </div>
                  {/* post text */}
                  <div style={{ fontSize: 12, color: C.tp, lineHeight: 1.7, marginBottom: 10 }}>
                    {v.content.split('\n').map((line, li) =>
                      li === 0
                        ? <span key={li} style={{ fontWeight: 700, display: 'block', marginBottom: 4 }}>{line}</span>
                        : line === ''
                          ? <br key={li} />
                          : <span key={li}>{line}<br /></span>
                    )}
                  </div>
                  {/* source cite */}
                  <div style={{ fontSize: 10, color: C.tt, marginTop: 4 }}>
                    Source: <span style={{ color: C.a, fontWeight: 600 }}>{source}</span>
                    {isAg && ' · private data woven in ✦'}
                  </div>
                </div>
              )
            })}
            {variants.length < 3 && Array.from({ length: 3 - variants.length }).map((_, i) => (
              <div key={`empty-${i}`} style={{ padding: '12px 14px', borderRight: i < (2 - variants.length) ? `1px solid ${C.br}` : 'none', opacity: 0.4 }}>
                <div style={{ fontSize: 10, color: C.tt, textAlign: 'center', paddingTop: 20 }}>—</div>
              </div>
            ))}
          </div>
          <div style={{ padding: '8px 14px', borderTop: `1px solid ${C.br}`, background: C.bm }}>
            <button
              onClick={() => setExpanded(false)}
              style={{ fontSize: 11, fontWeight: 600, color: C.ts, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              ↑ Collapse
            </button>
          </div>
        </div>
      )}

      {/* Footer — only when expanded */}
      {expanded && <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '8px 12px', borderTop: `1px solid ${C.br}`, background: C.bm,
      }}>
        <span style={{ fontSize: 10, color: C.tt }}>3 variants · copy-paste ready</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <CopyBtn text={variants.map(v => v.content).join('\n\n---\n\n')} isAg={isAg} small />
          {isAg && (
            <button style={{
              height: 26, padding: '0 8px', borderRadius: 6, background: 'transparent',
              fontSize: 11, fontWeight: 500, border: 'none', cursor: 'pointer',
              color: '#9A6600', display: 'inline-flex', alignItems: 'center', gap: 3,
            }}>
              🎨 White-label voice
            </button>
          )}
          <button style={{
            height: 26, padding: '0 8px', borderRadius: 6, background: 'transparent',
            fontSize: 11, fontWeight: 500, border: 'none', cursor: 'pointer',
            color: isAg ? '#9A6600' : C.a, display: 'inline-flex', alignItems: 'center', gap: 3,
          }}>
            Regenerate
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(post.id) }}
            style={{
              width: 26, height: 26, borderRadius: 6, background: 'transparent',
              border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: C.tt,
            }}
            title="Delete post set"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ width: 14, height: 14 }}>
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────
export default function LinkedInClient({
  posts,
  newsletters,
  trendReports,
  plan,
  locked,
  workspaces,
  workspaceId,
  setsUsedThisMonth,
  setsLimit,
}: {
  posts: LinkedInPost[]
  newsletters: Newsletter[]
  trendReports: TrendReport[]
  plan: Plan
  locked: boolean
  workspaces: Workspace[]
  workspaceId: string
  setsUsedThisMonth: number
  setsLimit: number
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const isS  = plan === 'starter'
  const isAg = plan === 'agency'

  // Filter state
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(workspaceId)
  const [filterSource, setFilterSource] = useState<'all' | 'reports' | 'briefs' | 'newsletters'>('all')
  const [filterNiche,  setFilterNiche]  = useState<string | null>(null)

  // Modal + delete state
  const [showGenModal, setShowGenModal] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genError,  setGenError]  = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Unique niches from posts (scoped to workspace if isAg)
  const niches = useMemo(() => {
    let base = posts
    if (isAg && activeWorkspaceId) base = base.filter(p => p.workspace_id === activeWorkspaceId)
    return Array.from(new Set(
      base
        .map(p => p.newsletters?.trend_reports?.niches?.name)
        .filter(Boolean) as string[]
    ))
  }, [posts, isAg, activeWorkspaceId])

  // Filtered posts (all posts currently come from newsletters)
  const filteredPosts = useMemo(() => {
    return posts.filter(p => {
      // Workspace filter
      if (isAg && activeWorkspaceId && p.workspace_id !== activeWorkspaceId) return false
      
      // Source filter
      if (filterSource === 'reports') return false
      if (filterSource === 'briefs') return false
      if (filterSource === 'newsletters' && !p.newsletter_id) return false
      
      // Niche filter
      if (filterNiche) {
        const pNiche = p.newsletters?.trend_reports?.niches?.name
        if (pNiche !== filterNiche) return false
      }
      
      return true
    })
  }, [posts, isAg, activeWorkspaceId, filterSource, filterNiche])

  const genDropdownItems: Array<{ id: string; label: string }> = []

  async function handleGenerate(newsletterId: string) {
    setGenError(null)
    setGenerating(true)
    try {
      const res = await fetch('/api/linkedin-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newsletterId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Generation failed')
      setShowGenModal(false)
      startTransition(() => router.refresh())
    } catch (e: any) {
      setGenError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  async function handleDeletePost(id: string) {
    setDeleteLoading(true)
    try {
      await fetch(`/api/linkedin-posts/${id}`, { method: 'DELETE' })
      setDeletingId(null)
      startTransition(() => router.refresh())
    } finally {
      setDeleteLoading(false)
    }
  }

  // ── LOCKED state ──────────────────────────────────────────────
  if (locked) {
    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: C.bm }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 14, padding: '50px 20px', textAlign: 'center',
        }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: C.dab, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconLock size={24} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.tp, marginBottom: 4 }}>LinkedIn Posts — Pro only</div>
            <div style={{ fontSize: 12, color: C.ts, maxWidth: 340 }}>
              Upgrade to Pro to unlock 3 LinkedIn post variants per newsletter — Hook, Insight, and CTA — all in your brand voice, copy-paste ready.
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxWidth: 420, width: '100%' }}>
            {[
              ['Hook · Insight · CTA variants', '3 post styles per newsletter'],
              ['Brand voice applied', 'All in your tone and style'],
              ['Copy-paste ready', 'No editing needed'],
              ['Cited sources', 'Linked to original signal'],
            ].map(([title, sub], i) => (
              <div key={i} style={{ background: '#fff', border: `1px solid ${C.br}`, borderRadius: 9, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-start', textAlign: 'left' }}>
                <IconCheck size={13} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.tp }}>{title}</div>
                  <div style={{ fontSize: 11, color: C.tt, marginTop: 1 }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
          <a href="/upgrade" style={{
            height: 32, padding: '0 18px', borderRadius: 9999, background: C.a, color: '#fff',
            fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', textDecoration: 'none',
          }}>
            Upgrade to Pro →
          </a>
        </div>
      </div>
    )
  }

  // ── Stats ──────────────────────────────────────────────────────
  const setsAllowedLabel = isS ? '4/mo (report cadence)' : isAg ? '12/workspace · 60 total' : '12/mo'
  const sourcesLabel = isAg ? '18 + custom' : '18 EU sources'
  const wlLabel = isAg ? 'Active' : 'Locked'

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', background: C.bm }}>

      {/* ── Plan info banner ──────────────────────────────────── */}
      {isS && (
        <div style={{
          borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: 14, background: C.al, border: `1px solid ${C.am}`,
        }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>💼</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.a }}>LinkedIn Posts included on Starter — from Trend Reports only</div>
            <div style={{ fontSize: 11, color: C.ts, marginTop: 1 }}>
              You get 3 copy-paste ready post variants per Trend Report — up to 4 sets/month. Upgrade to Pro to also generate from Signal Briefs and Newsletters.
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const, marginTop: 5 }}>
              {['3 variants per set', 'From Trend Reports only', 'Up to 4 sets/mo', 'Pro: briefs + newsletters too'].map(tag => (
                <span key={tag} style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 9999, background: C.al, color: C.a }}>{tag}</span>
              ))}
            </div>
          </div>
          <a href="/upgrade" style={{
            height: 24, padding: '0 11px', borderRadius: 9999, background: C.a, color: '#fff',
            fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
            display: 'inline-flex', alignItems: 'center', textDecoration: 'none',
          }}>
            Upgrade to Pro →
          </a>
        </div>
      )}
      {!isS && !isAg && (
        <div style={{
          borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: 14, background: C.ag, border: `1px solid #3D3D7E`,
        }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(245,166,35,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🏢</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Upgrade to Agency for white-label posts and custom signal types.</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', marginTop: 1 }}>
              Pro posts carry your brand voice. Agency lets you write posts attributed to each client workspace — custom signals and private data woven in.
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const, marginTop: 5 }}>
              {['White-label per workspace', 'Custom signal types', 'Private data in posts', 'Up to 60 sets/mo total'].map(tag => (
                <span key={tag} style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 9999, background: 'rgba(245,166,35,.15)', color: '#9A6600' }}>{tag}</span>
              ))}
            </div>
          </div>
          <a href="/upgrade" style={{
            height: 24, padding: '0 11px', borderRadius: 9999, background: C.ag, color: C.agb,
            fontSize: 11, fontWeight: 600, border: `1px solid ${C.agb}`, cursor: 'pointer', whiteSpace: 'nowrap',
            display: 'inline-flex', alignItems: 'center', textDecoration: 'none',
          }}>
            Upgrade to Agency →
          </a>
        </div>
      )}
      {/* Agency workspace tabs */}
      {isAg && workspaces.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.tt, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>Workspace</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {workspaces.map(ws => (
              <button
                key={ws.id}
                onClick={() => { setActiveWorkspaceId(ws.id); setFilterNiche('all') }}
                style={{
                  height: 28, padding: '0 12px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                  border: '1px solid', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'all .15s ease',
                  background: activeWorkspaceId === ws.id ? '#000' : '#fff',
                  color: activeWorkspaceId === ws.id ? '#fff' : C.ts,
                  borderColor: activeWorkspaceId === ws.id ? '#000' : C.br,
                }}
              >
                {ws.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Agency workspace tabs */}
      {isAg && workspaces.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.tt, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>Workspace</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {workspaces.map(ws => (
              <button
                key={ws.id}
                onClick={() => { setActiveWorkspaceId(ws.id); setFilterNiche(null) }}
                style={{
                  height: 28, padding: '0 12px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                  border: '1px solid', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'all .15s ease',
                  background: activeWorkspaceId === ws.id ? '#000' : '#fff',
                  color: activeWorkspaceId === ws.id ? '#fff' : C.ts,
                  borderColor: activeWorkspaceId === ws.id ? '#000' : C.br,
                }}
              >
                {ws.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Sets generated', value: String(setsUsedThisMonth), sub: setsAllowedLabel },
          { label: 'Variants/set',   value: '3', sub: 'Hook \u00b7 Insight \u00b7 CTA' },
          { label: 'Sources',        value: sourcesLabel, sub: '90-day RAG memory', small: true },
          { label: 'White-label',    value: wlLabel, sub: isAg ? 'Client brand voice' : 'Agency only', small: true },
        ].map(({ label, value, sub, small }) => (
          <div key={label} style={{ background: '#fff', border: `1px solid ${C.br}`, borderRadius: 10, padding: '11px 13px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.ts, textTransform: 'uppercase' as const, letterSpacing: '.4px', marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: small ? 13 : 19, fontWeight: 700, color: C.tp, paddingTop: small ? 4 : 0 }}>{value}</div>
            <div style={{ fontSize: 10, color: C.tt, marginTop: 1 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Generate trigger */}
      <div style={{ background: '#fff', border: `1px solid ${C.br}`, borderRadius: 12, padding: '12px 15px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: isAg ? 'rgba(245,166,35,.15)' : C.lil,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
          }}>{'💼'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.tp }}>Generate 3 LinkedIn post variants</div>
            <div style={{ fontSize: 11, color: C.tt, marginTop: 1 }}>
              Hook {'\u00b7'} Insight {'\u00b7'} CTA {'\u2014'} all in your brand voice {'\u00b7'} copy-paste ready {'\u00b7'} cited sources
              {isAg && ' \u00b7 white-label \u00b7 custom signals \u00b7 private data'}
            </div>
          </div>
          {isAg && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 9999, background: 'rgba(245,166,35,.15)', color: '#9A6600' }}>{'\u2726'} White-label</span>
          )}
          <button
            onClick={() => setShowGenModal(true)}
            style={{
              height: 30, padding: '0 14px', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600,
              border: 'none', cursor: 'pointer',
              background: isAg ? C.ag : C.li,
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}
          >
            {'Generate \u2192'}
          </button>
        </div>
      </div>

      {/* ── Filter row ────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, flexWrap: 'wrap' as const }}>
        {([
          { key: 'all' as const,         label: 'All sources' },
          { key: 'reports' as const,     label: '📊 From Reports' },
          ...(!isS ? [
            { key: 'briefs' as const,      label: '📋 From Briefs' },
            { key: 'newsletters' as const, label: '📧 From Newsletters' },
          ] : []),
        ]).map(({ key, label }) => {
          const isOn = filterSource === key && filterNiche === null
          return (
            <button
              key={key}
              onClick={() => { setFilterSource(key); setFilterNiche(null) }}
              style={{
                height: 26, padding: '0 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: isOn ? (isAg ? C.ag : C.a) : '#fff',
                color: isOn ? '#fff' : C.ts,
                ...(isOn ? {} : { border: `1px solid ${C.br}` }),
              }}
            >
              {label}
            </button>
          )
        })}
        {niches.map((niche: string) => (
          <button
            key={niche}
            onClick={() => setFilterNiche(filterNiche === niche ? null : niche)}
            style={{
              height: 26, padding: '0 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: filterNiche === niche ? (isAg ? C.ag : C.a) : '#fff',
              color: filterNiche === niche ? '#fff' : C.ts,
              ...(filterNiche !== niche ? { border: `1px solid ${C.br}` } : {}),
            }}
          >
            {niche}
          </button>
        ))}
        <div style={{ marginLeft: 'auto' }}>
          <select style={{ height: 26, padding: '0 8px', borderRadius: 7, border: `1px solid ${C.br}`, fontSize: 11, color: C.ts, background: '#fff', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
            <option>Newest first</option>
          </select>
        </div>
      </div>

      {/* ── Post set cards ────────────────────────────────────── */}
      {filteredPosts.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 12, padding: '40px 20px', textAlign: 'center',
          background: '#fff', border: `1px solid ${C.br}`, borderRadius: 13,
        }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: C.lil, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
            <IconLinkedIn size={22} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.tp, marginBottom: 4 }}>No LinkedIn posts yet</div>
            <div style={{ fontSize: 12, color: C.ts, maxWidth: 340 }}>
              LinkedIn posts are automatically generated when you create a newsletter. Use the panel above to generate from an existing newsletter, or head to Newsletters to create one.
            </div>
          </div>
          <a href="/newsletters" style={{
            height: 30, padding: '0 14px', borderRadius: 8, background: C.li, color: '#fff',
            fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5,
            textDecoration: 'none',
          }}>
            <IconLinkedIn size={11} />
            Go to Newsletters →
          </a>
        </div>
      ) : (
        filteredPosts.map((post: LinkedInPost) => (
          <PostSetCard key={post.id} post={post} plan={plan} onDelete={(id) => setDeletingId(id)} />
        ))
      )}

      {/* Modals */}
      {showGenModal && (
        <GenerateLinkedInModal
          newsletters={newsletters}
          trendReports={trendReports}
          workspaces={workspaces}
          plan={plan}
          onClose={() => { setShowGenModal(false); setGenError(null) }}
          onGenerate={handleGenerate}
          generating={generating}
          error={genError}
        />
      )}

      {deletingId && (
        <DeleteConfirmModal
          onConfirm={() => handleDeletePost(deletingId)}
          onCancel={() => setDeletingId(null)}
          loading={deleteLoading}
        />
      )}
    </div>
  )
}
