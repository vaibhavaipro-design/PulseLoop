'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Plan } from '@/lib/plans'

// ── Types ─────────────────────────────────────────────────────────
interface Variant { type: string; content: string }
interface LinkedInPost {
  id: string
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
  trend_reports: { id: string; title: string; niches: { name: string } | null } | null
}
interface TrendReport {
  id: string
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

// ── Post set card ──────────────────────────────────────────────────
const PREVIEW_CHARS = 180

function PostSetCard({ post, plan }: { post: LinkedInPost; plan: Plan }) {
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
  workspaceId,
  setsUsedThisMonth,
  setsLimit,
}: {
  posts: LinkedInPost[]
  newsletters: Newsletter[]
  trendReports: TrendReport[]
  plan: Plan
  locked: boolean
  workspaceId: string
  setsUsedThisMonth: number
  setsLimit: number
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const isS  = plan === 'starter'
  const isAg = plan === 'agency'

  // Filter state
  const [filterSource, setFilterSource] = useState<'all' | 'reports' | 'briefs' | 'newsletters'>('all')
  const [filterNiche,  setFilterNiche]  = useState<string | null>(null)

  // Generate panel state
  const [genSrc,    setGenSrc]    = useState<'report' | 'brief' | 'newsletter'>('newsletter')
  const [genId,     setGenId]     = useState('')
  const [generating, setGenerating] = useState(false)
  const [genError,  setGenError]  = useState<string | null>(null)

  // Unique niches from posts
  const niches = Array.from(new Set(
    posts
      .map(p => p.newsletters?.trend_reports?.niches?.name)
      .filter(Boolean) as string[]
  ))

  // Filtered posts (all posts currently come from newsletters)
  const filteredPosts = posts.filter(p => {
    if (filterSource === 'reports')     return false // no report-only posts yet
    if (filterSource === 'briefs')      return false // no brief-only posts yet
    if (filterSource === 'newsletters') return true
    if (filterNiche) return p.newsletters?.trend_reports?.niches?.name === filterNiche
    return true
  })

  // Generate dropdown items
  const genDropdownItems: Array<{ id: string; label: string }> =
    genSrc === 'newsletter'
      ? newsletters.map(n => ({
          id: n.id,
          label: n.trend_reports
            ? `📧 ${n.trend_reports.niches?.name ?? 'Newsletter'} · ${n.trend_reports.title?.slice(0, 35) ?? 'Newsletter'}`
            : `📧 Newsletter`,
        }))
      : genSrc === 'report'
      ? trendReports.map(r => ({
          id: r.id,
          label: `📊 ${r.niches?.name ?? 'Report'} · ${r.title?.slice(0, 40) ?? 'Trend Report'}`,
        }))
      : []

  async function handleGenerate() {
    if (!genId) { setGenError('Please select a source to generate from.'); return }
    if (genSrc !== 'newsletter') {
      setGenError('Direct generation from reports and signal briefs is coming soon. Create a newsletter first, then LinkedIn posts are generated automatically.')
      return
    }
    setGenError(null)
    setGenerating(true)
    try {
      const res = await fetch('/api/linkedin-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newsletterId: genId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Generation failed')
      startTransition(() => router.refresh())
    } catch (e: any) {
      setGenError(e.message)
    } finally {
      setGenerating(false)
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
{/* Agency banner intentionally omitted — agency users already know their plan features */}

      {/* ── Stats grid ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Sets generated', value: String(setsUsedThisMonth), sub: setsAllowedLabel },
          { label: 'Variants/set',   value: '3', sub: 'Hook · Insight · CTA' },
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

      {/* ── Generate panel ────────────────────────────────────── */}
      <div style={{ background: '#fff', border: `1px solid ${C.br}`, borderRadius: 12, padding: '12px 15px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: isAg ? 'rgba(245,166,35,.15)' : C.lil,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
          }}>💼</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.tp }}>Generate 3 LinkedIn post variants</div>
            <div style={{ fontSize: 11, color: C.tt, marginTop: 1 }}>
              Hook · Insight · CTA — all in your brand voice · copy-paste ready · cited sources
              {isAg && ' · white-label · custom signals · private data'}
            </div>
          </div>
          {isAg && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 9999, background: 'rgba(245,166,35,.15)', color: '#9A6600' }}>✦ White-label</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.br}`, flexWrap: 'wrap' as const, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: C.tt, fontWeight: 500, flexShrink: 0 }}>From:</span>

          {/* Source type toggle */}
          <div style={{ display: 'flex', border: `1px solid ${C.br}`, borderRadius: 8, overflow: 'hidden' }}>
            {([
              { key: 'report',     label: '📊 Trend Report',  disabled: false },
              { key: 'brief',      label: '📋 Signal Brief',  disabled: isS },
              { key: 'newsletter', label: '📧 Newsletter',    disabled: isS },
            ] as const).map(({ key, label, disabled }) => {
              const isOn = genSrc === key
              const bgOn = isAg ? 'rgba(245,166,35,.15)' : C.al
              const colorOn = isAg ? '#9A6600' : C.a
              return (
                <button
                  key={key}
                  disabled={disabled}
                  onClick={() => { if (!disabled) { setGenSrc(key); setGenId('') } }}
                  title={disabled ? 'Upgrade to Pro' : undefined}
                  style={{
                    height: 28, padding: '0 10px', fontSize: 11, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
                    border: 'none', background: isOn ? bgOn : '#fff', color: isOn ? colorOn : C.ts,
                    borderRight: `1px solid ${C.br}`, opacity: disabled ? 0.4 : 1,
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* Source dropdown */}
          <select
            value={genId}
            onChange={e => setGenId(e.target.value)}
            style={{
              height: 28, padding: '0 8px', borderRadius: 7, border: `1px solid ${C.br}`,
              fontSize: 11, color: C.ts, background: '#fff', flex: 1, minWidth: 150,
              fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="">Select {genSrc === 'report' ? 'report' : genSrc === 'brief' ? 'signal brief' : 'newsletter'}…</option>
            {genDropdownItems.map(item => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>

          <button
            onClick={handleGenerate}
            disabled={generating || !genId}
            style={{
              height: 30, padding: '0 14px', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600,
              border: 'none', cursor: generating || !genId ? 'not-allowed' : 'pointer',
              background: isAg ? C.ag : C.li,
              opacity: generating || !genId ? 0.6 : 1,
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}
          >
            {generating ? 'Generating…' : 'Generate →'}
          </button>

          {/* Coming soon pill */}
          {!isS && (
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, paddingTop: 4 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0',
                borderRadius: 9999, fontSize: 10, fontWeight: 600, padding: '2px 8px',
              }}>
                🗓 Direct scheduling — coming soon
              </span>
              <span style={{ fontSize: 11, color: C.tt }}>Posts are copy-paste ready — direct LinkedIn scheduling is planned for a future release</span>
            </div>
          )}
        </div>

        {genError && (
          <div style={{ marginTop: 8, fontSize: 11, color: C.da, background: C.dab, padding: '8px 10px', borderRadius: 7 }}>
            {genError}
          </div>
        )}
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
        {niches.map(niche => (
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
        filteredPosts.map(post => (
          <PostSetCard key={post.id} post={post} plan={plan} />
        ))
      )}
    </div>
  )
}
