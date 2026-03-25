'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Plan } from '@/lib/plans'
import type { VoiceTraits } from '@/lib/claude'
import {
  analyzeWritingSamples,
  buildFinalProfile,
  runVoiceTest,
  activateBrandVoice,
} from '@/app/actions/brand-voice'

// ── Brand colours ──────────────────────────────────────────────────
const C = {
  a: '#5B5FC7', al: '#EEEEFF', am: '#A3A6E8',
  tp: '#1A1A3E', ts: '#6B6B8A', tt: '#A0A0BE',
  br: '#E4E4F0', bp: '#F0F0F7', bm: '#F7F7FC',
  su: '#4CAF82', sub: '#E8F7EF',
  wa: '#F5A623', wab: '#FFF4E0',
  da: '#E85757', dab: '#FDEAEA',
  ag: '#1A1A3E', agb: '#F5A623',
}

// ── Types ──────────────────────────────────────────────────────────
type WizardStep = 1 | 2 | 3 | 4 | 5

interface CalibrationState {
  scales: number[]  // indices 0-4, values 1-5
  radios: string[]  // indices 0-2
}

const DEFAULT_CALIBRATION: CalibrationState = {
  scales: [4, 4, 2, 3, 1],
  radios: ['first-person', 'text-only', 'inline'],
}

// ── Icons ──────────────────────────────────────────────────────────
function IconCheck({ color = C.su, size = 12 }: { color?: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" style={{ width: size, height: size }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
function IconEdit({ size = 11 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ width: size, height: size }}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}
function IconBack({ size = 11 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ width: size, height: size }}>
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
  )
}
function IconPlus({ size = 11 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ width: size, height: size }}>
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

// ── Step indicator bar ─────────────────────────────────────────────
const STEPS = [
  { num: 1, label: 'Writing samples',   sublabel: 'Paste your writing' },
  { num: 2, label: 'AI extraction',     sublabel: 'Analyse your style' },
  { num: 3, label: 'Confirmation',      sublabel: 'Verify the findings' },
  { num: 4, label: 'Generated profile', sublabel: 'Your voice in words' },
  { num: 5, label: 'Test & approve',    sublabel: 'Validate before use' },
]

function StepBar({ step, isAg }: { step: WizardStep; isAg: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', marginBottom: 22,
      background: '#fff', border: `1px solid ${C.br}`, borderRadius: 12, padding: '12px 16px',
    }}>
      {STEPS.map((s, i) => {
        const state = s.num < step ? 'done' : s.num === step ? 'active' : 'todo'
        const dotBg   = state === 'done' ? C.su : state === 'active' ? (isAg ? C.agb : C.a) : C.bp
        const dotColor = state === 'done' ? '#fff' : state === 'active' ? (isAg ? C.ag : '#fff') : C.tt
        const labelColor = state === 'done' ? C.ts : state === 'active' ? (isAg ? '#9A6600' : C.a) : C.tt
        const isLast = i === STEPS.length - 1
        return (
          <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, position: 'relative' }}>
            <div style={{
              width: 24, height: 24, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, flexShrink: 0, transition: 'all .2s',
              background: dotBg, color: dotColor,
              ...(state === 'todo' ? { border: `1.5px solid ${C.br}` } : {}),
            }}>
              {state === 'done' ? '✓' : s.num}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, paddingRight: isLast ? 0 : 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3, color: labelColor }}>{s.label}</div>
              <div style={{ fontSize: 10, color: C.tt }}>{s.sublabel}</div>
            </div>
            {!isLast && (
              <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', width: 1, height: 28, background: C.br }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Card wrapper ───────────────────────────────────────────────────
function Card({ title, subtitle, badge, children }: {
  title: string; subtitle?: string; badge?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.br}`, borderRadius: 13, overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ padding: '13px 18px 11px', borderBottom: `1px solid ${C.br}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.tp }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: C.tt, marginTop: 1 }}>{subtitle}</div>}
        </div>
        {badge}
      </div>
      <div style={{ padding: '16px 18px' }}>{children}</div>
    </div>
  )
}

// ── Step 1: Writing samples ────────────────────────────────────────
function Step1({
  samples, setSamples, isAg,
}: {
  samples: string[]
  setSamples: (s: string[]) => void
  isAg: boolean
}) {
  const SAMPLE_TYPES = ['LinkedIn post', 'Newsletter excerpt', 'Client email / report', 'Report section', 'Other writing']
  const update = (i: number, val: string) => {
    const next = [...samples]; next[i] = val; setSamples(next)
  }
  const clear = (i: number) => {
    const next = [...samples]; next[i] = ''; setSamples(next)
  }
  const addSample = () => {
    if (samples.length < 5) setSamples([...samples, ''])
  }

  return (
    <Card
      title="Paste 3–5 pieces of your own writing"
      subtitle="LinkedIn posts, newsletter excerpts, client emails, reports — anything you've actually written. The more variety, the better the extraction."
    >
      {/* Hints */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' as const }}>
        {[
          { icon: '💼', label: 'LinkedIn posts' },
          { icon: '✉️', label: 'Newsletter excerpts' },
          { icon: '💬', label: 'Client emails' },
          { icon: '📄', label: 'Report sections' },
        ].map(h => (
          <div key={h.label} style={{
            background: C.bm, border: `1px solid ${C.br}`, borderRadius: 8,
            padding: '6px 10px', fontSize: 11, color: C.ts,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span>{h.icon}</span>{h.label}
          </div>
        ))}
      </div>

      {/* Sample boxes */}
      {samples.map((val, i) => (
        <div key={i} style={{ border: `1px solid ${C.br}`, borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 12px', background: C.bm, borderBottom: `1px solid ${C.br}`,
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: 5, fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              background: isAg ? 'rgba(245,166,35,.15)' : C.al,
              color: isAg ? '#9A6600' : C.a,
            }}>{i + 1}</div>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.ts }}>{SAMPLE_TYPES[i] ?? 'Writing sample'}</span>
            <button
              onClick={() => clear(i)}
              style={{
                marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer',
                fontSize: 10, color: isAg ? '#9A6600' : C.a, fontWeight: 500,
                display: 'inline-flex', alignItems: 'center', gap: 3,
              }}
            >Clear</button>
          </div>
          <textarea
            value={val}
            onChange={e => update(i, e.target.value)}
            rows={5}
            placeholder={`Paste a ${(SAMPLE_TYPES[i] ?? 'writing sample').toLowerCase()}…`}
            style={{
              width: '100%', border: 'none', outline: 'none',
              padding: '10px 12px', fontSize: 12, color: C.tp,
              fontFamily: 'inherit', resize: 'none', lineHeight: 1.65, background: '#fff',
            }}
          />
        </div>
      ))}

      {samples.length < 5 && (
        <button
          onClick={addSample}
          style={{
            height: 32, padding: '0 12px', borderRadius: 9, background: '#fff',
            color: C.tp, fontSize: 12, fontWeight: 500, border: `1px solid ${C.br}`,
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 4,
          }}
        >
          <IconPlus size={11} />Add another sample (up to 5)
        </button>
      )}
    </Card>
  )
}

// ── Step 2: AI extraction results ─────────────────────────────────
function Step2({
  extracting, traits, isAg,
}: {
  extracting: boolean
  traits: VoiceTraits | null
  isAg: boolean
}) {
  if (extracting) {
    return (
      <Card title="Analysing your writing…" subtitle="PulseLoop is reading your samples and extracting your voice patterns">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '32px 0', textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 9999, flexShrink: 0,
            border: `3px solid ${isAg ? 'rgba(245,166,35,.2)' : C.al}`,
            borderTopColor: isAg ? C.agb : C.a,
            animation: 'spin 1s linear infinite',
          }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: C.tp }}>Reading your writing samples</div>
          <div style={{ fontSize: 12, color: C.ts, maxWidth: 320, lineHeight: 1.6 }}>
            Detecting tone, sentence structure, vocabulary patterns, use of data vs narrative, formality level…
          </div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      </Card>
    )
  }

  if (!traits) return null

  return (
    <Card
      title="Here's what we found in your writing"
      subtitle={`Extracted from your writing samples · review and confirm in Step 3`}
      badge={
        <span style={{ background: C.sub, color: C.su, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 9999 }}>
          Analysis complete
        </span>
      }
    >
      {/* Trait cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
        {traits.traits.map(t => (
          <div key={t.label} style={{ background: '#fff', border: `1px solid ${C.br}`, borderRadius: 10, padding: '11px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.tt, textTransform: 'uppercase' as const, letterSpacing: '.4px', marginBottom: 4 }}>{t.label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.tp }}>{t.value}</div>
            <div style={{ height: 4, borderRadius: 9999, background: C.bp, marginTop: 7, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 9999, background: isAg ? C.agb : C.a, width: `${t.pct}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Phrases and avoid words */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.ts, textTransform: 'uppercase' as const, letterSpacing: '.4px', marginBottom: 7 }}>
            Recurring phrases detected
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
            {traits.phrases.map(p => (
              <span key={p} style={{
                background: isAg ? 'rgba(245,166,35,.15)' : C.al,
                color: isAg ? '#9A6600' : C.a,
                borderRadius: 9999, fontSize: 11, fontWeight: 500, padding: '3px 10px',
              }}>{p}</span>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.ts, textTransform: 'uppercase' as const, letterSpacing: '.4px', marginBottom: 7 }}>
            Words you never use
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
            {traits.avoidWords.map(p => (
              <span key={p} style={{ background: C.dab, color: C.da, borderRadius: 9999, fontSize: 11, fontWeight: 500, padding: '3px 10px' }}>{p}</span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

// ── Step 3: Calibration questions ─────────────────────────────────
const SCALE_QUESTIONS = [
  { text: 'Your writing tends to be direct and data-heavy, with short sentences. How accurate is that?', lo: 'Not me at all', hi: 'Exactly right' },
  { text: 'You write for a peer audience — not talking down, not simplifying. You assume the reader is smart. How true is that?', lo: 'I simplify a lot', hi: 'Always peer-level' },
  { text: 'Your posts tend to end with an open question or a provocation rather than a summary. Is that intentional?', lo: 'I prefer summaries', hi: 'Always a question' },
  { text: 'How opinionated do you want the content to feel — straightforward reporting vs strong point of view?', lo: 'Just the facts', hi: 'Strong opinion' },
  { text: 'How data-heavy should the writing be? Raw numbers and percentages vs narrative storytelling?', lo: 'Pure narrative', hi: 'All data/numbers' },
]

const RADIO_QUESTIONS = [
  {
    text: "Do you write in first person (I think, I've noticed) or prefer impersonal phrasing (The data shows, This week's signals)?",
    opts: [{ label: 'First person (I / we)', key: 'first-person' }, { label: 'Impersonal (The data, This week)', key: 'impersonal' }, { label: 'Mix of both', key: 'mix' }],
    idx: 0,
  },
  {
    text: 'Do you use emojis in your content, or keep it text-only?',
    opts: [{ label: 'Text-only', key: 'text-only' }, { label: 'Occasional emojis (1–2 per post)', key: 'occasional' }, { label: 'Emoji-heavy', key: 'heavy' }],
    idx: 1,
  },
  {
    text: 'How do you cite sources in your content?',
    opts: [{ label: 'Inline (FrenchWeb, 24 Mar)', key: 'inline' }, { label: 'Footnote at end', key: 'footnote' }, { label: "I don't cite explicitly", key: 'none' }],
    idx: 2,
  },
]

function Step3({ calibration, setCalibration, isAg }: {
  calibration: CalibrationState
  setCalibration: (c: CalibrationState) => void
  isAg: boolean
}) {
  const accentBg  = isAg ? C.agb : C.a
  const accentClr = isAg ? C.ag  : '#fff'

  function setScale(si: number, val: number) {
    const next = { ...calibration, scales: [...calibration.scales] }
    next.scales[si] = val
    setCalibration(next)
  }
  function setRadio(ri: number, key: string) {
    const next = { ...calibration, radios: [...calibration.radios] }
    next.radios[ri] = key
    setCalibration(next)
  }

  const allQs: React.ReactNode[] = []

  SCALE_QUESTIONS.forEach((q, i) => {
    allQs.push(
      <div key={`scale-${i}`} style={{ background: C.bm, border: `1px solid ${C.br}`, borderRadius: 11, padding: '13px 14px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.tp, marginBottom: 10 }}>{q.text}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: C.tt, whiteSpace: 'nowrap' as const }}>{q.lo}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 3, 4, 5].map(v => {
              const on = calibration.scales[i] === v
              return (
                <button
                  key={v}
                  onClick={() => setScale(i, v)}
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    border: on ? `1.5px solid ${accentBg}` : `1.5px solid ${C.br}`,
                    background: on ? accentBg : '#fff',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all .15s',
                    color: on ? accentClr : C.ts,
                  }}
                >{v}</button>
              )
            })}
          </div>
          <span style={{ fontSize: 10, color: C.tt, whiteSpace: 'nowrap' as const }}>{q.hi}</span>
        </div>
      </div>
    )
    // Insert radio questions in between scale questions at defined positions
    const radioAfter = [2, 3, 5] // insert radio 0 after scale 2, radio 1 after scale 3, radio 2 after scale 4
    const radioIdx = radioAfter.indexOf(i + 1)
    if (radioIdx !== -1 && RADIO_QUESTIONS[radioIdx]) {
      const rq = RADIO_QUESTIONS[radioIdx]
      allQs.push(
        <div key={`radio-${radioIdx}`} style={{ background: C.bm, border: `1px solid ${C.br}`, borderRadius: 11, padding: '13px 14px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.tp, marginBottom: 10 }}>{rq.text}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
            {rq.opts.map(opt => {
              const on = calibration.radios[rq.idx] === opt.key
              return (
                <div
                  key={opt.key}
                  onClick={() => setRadio(rq.idx, opt.key)}
                  style={{
                    padding: '7px 14px', borderRadius: 9999, cursor: 'pointer', fontSize: 12, fontWeight: 500,
                    border: on ? `1.5px solid ${accentBg}` : `1.5px solid ${C.br}`,
                    background: on ? (isAg ? 'rgba(245,166,35,.12)' : C.al) : '#fff',
                    color: on ? (isAg ? '#9A6600' : C.a) : C.ts,
                    transition: 'all .15s',
                  }}
                >
                  {opt.label}
                </div>
              )
            })}
          </div>
        </div>
      )
    }
  })

  return (
    <Card
      title="Confirm or correct the extraction"
      subtitle="7 questions — takes about 2 minutes. Your answers calibrate the final profile."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{allQs}</div>
    </Card>
  )
}

// ── Step 4: Generated profile ──────────────────────────────────────
function Step4({
  profile, setProfile, editing, setEditing, generating, isAg,
}: {
  profile: string; setProfile: (p: string) => void
  editing: boolean; setEditing: (e: boolean) => void
  generating: boolean; isAg: boolean
}) {
  if (generating) {
    return (
      <Card title="Generating your brand voice profile…" subtitle="Combining your writing samples and calibration answers">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '32px 0', textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 9999,
            border: `3px solid ${isAg ? 'rgba(245,166,35,.2)' : C.al}`,
            borderTopColor: isAg ? C.agb : C.a,
            animation: 'spin 1s linear infinite',
          }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: C.tp }}>Building your profile…</div>
          <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
        </div>
      </Card>
    )
  }

  const PROFILE_TAGS = [
    { label: 'Direct & data-led', color: 'a' as const },
    { label: 'Short sentences', color: 'a' as const },
    { label: 'First person', color: 'a' as const },
    { label: 'Peer-to-peer tone', color: 's' as const },
    { label: 'Inline citations', color: 'a' as const },
    { label: 'Ends with question', color: 'w' as const },
  ]
  const tagBg: Record<string, string>  = { a: C.al, s: C.sub, w: C.wab }
  const tagClr: Record<string, string> = { a: C.a, s: C.su, w: C.wa }

  return (
    <Card
      title="Your brand voice profile"
      subtitle="Generated from your writing samples + confirmation answers · you can edit this directly"
    >
      {editing ? (
        <>
          <label style={{ fontSize: 11, fontWeight: 600, color: C.ts, marginBottom: 6, display: 'block' }}>
            Edit your profile — Claude reads this exactly as written
          </label>
          <textarea
            value={profile}
            onChange={e => setProfile(e.target.value)}
            rows={8}
            style={{
              width: '100%', border: `1.5px solid ${C.a}`, borderRadius: 11,
              padding: 14, fontSize: 14, color: C.tp, fontFamily: 'inherit',
              outline: 'none', resize: 'none' as const, lineHeight: 1.9, background: '#fff',
            }}
          />
          <div style={{ fontSize: 10, color: C.tt, marginTop: 6 }}>
            This paragraph is what Claude receives as the brand voice instruction. Make it sound like you.
          </div>
        </>
      ) : (
        <div style={{ background: C.bm, border: `1px solid ${C.br}`, borderRadius: 11, padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '.5px', color: C.tt, marginBottom: 8 }}>
            Your voice — as Claude reads it
          </div>
          <div style={{ fontSize: 14, color: C.tp, lineHeight: 1.9, fontWeight: 400 }}>
            {profile.split(/(\*\*[^*]+\*\*|\*[^*]+\*|[A-Z][a-z]+ and [a-z]+-[a-z]+)/).map((part, i) => {
              if (i % 2 === 1) return <strong key={i} style={{ color: C.a, fontWeight: 600 }}>{part.replace(/\*/g, '')}</strong>
              return <span key={i}>{part}</span>
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginTop: 12 }}>
        {PROFILE_TAGS.map(t => (
          <span key={t.label} style={{
            fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 9999,
            background: isAg ? 'rgba(245,166,35,.15)' : tagBg[t.color],
            color: isAg ? '#9A6600' : tagClr[t.color],
          }}>{t.label}</span>
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: C.tt }}>
        Applied to: Trend Reports · Signal Briefs · Newsletters · LinkedIn Posts
      </div>
    </Card>
  )
}

// ── Step 5: Test & approve ─────────────────────────────────────────
const TEST_TYPES = ['LinkedIn post', 'Signal Brief opening', 'Newsletter lede', 'Trend Report summary']

function Step5({
  testType, setTestType, testSample, generatingTest, approved, isAg,
  onApprove, onRegenerate, onAdjustProfile,
}: {
  testType: string; setTestType: (t: string) => void
  testSample: string; generatingTest: boolean; approved: boolean; isAg: boolean
  onApprove: () => void; onRegenerate: () => void; onAdjustProfile: () => void
}) {
  const accentBg  = isAg ? C.ag : C.a
  const accentClr = '#fff'
  const onBg  = isAg ? 'rgba(245,166,35,.12)' : C.al
  const onClr = isAg ? '#9A6600' : C.a

  if (approved) {
    return (
      <Card title="Test your brand voice" subtitle="Claude wrote this sample paragraph using your profile.">
        <div style={{
          background: C.sub, border: '1px solid #BBF7D0', borderRadius: 10,
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <IconCheck color={C.su} size={14} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.su }}>Brand voice approved and active</div>
            <div style={{ fontSize: 11, color: C.ts, marginTop: 2 }}>
              All content generated from this point will use this voice profile. You can update it anytime from Settings → Brand Voice.
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card title="Test your brand voice" subtitle="Claude wrote this sample paragraph using your profile. Does it sound like you?">
      {/* Test type selector */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: C.ts, marginBottom: 5, display: 'block' }}>
          Test on this content type:
        </label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
          {TEST_TYPES.map(t => {
            const on = testType === t
            return (
              <div
                key={t}
                onClick={() => setTestType(t)}
                style={{
                  padding: '7px 14px', borderRadius: 9999, cursor: 'pointer', fontSize: 12, fontWeight: 500,
                  border: on ? `1.5px solid ${isAg ? C.agb : C.a}` : `1.5px solid ${C.br}`,
                  background: on ? onBg : '#fff',
                  color: on ? onClr : C.ts,
                  transition: 'all .15s',
                }}
              >{t}</div>
            )
          })}
        </div>
      </div>

      {/* Sample output */}
      <div style={{ background: C.bm, border: `1px solid ${C.br}`, borderRadius: 11, padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '.5px', color: C.tt, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Sample output — {testType}</span>
          <button
            onClick={onRegenerate}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 11, color: isAg ? '#9A6600' : C.a, fontWeight: 500 }}
          >↺ Regenerate</button>
        </div>
        {generatingTest ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', color: C.tt, fontSize: 12 }}>
            <div style={{
              width: 18, height: 18, borderRadius: 9999,
              border: `2px solid ${isAg ? 'rgba(245,166,35,.2)' : C.al}`,
              borderTopColor: isAg ? C.agb : C.a,
              animation: 'spin 1s linear infinite', flexShrink: 0,
            }} />
            Generating sample…
            <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: C.tp, lineHeight: 1.8, whiteSpace: 'pre-wrap' as const }}>{testSample}</div>
        )}
      </div>

      {/* Approve row */}
      <div>
        <div style={{ fontSize: 11, color: C.ts, fontWeight: 500, marginBottom: 6 }}>Does this sound like you?</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
          <button
            onClick={onApprove}
            style={{
              height: 32, padding: '0 14px', borderRadius: 9, color: '#fff', fontSize: 12, fontWeight: 600,
              border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
              background: accentBg,
            }}
          >
            <IconCheck color="#fff" size={12} />Yes — approve &amp; activate
          </button>
          <button
            onClick={onAdjustProfile}
            style={{
              height: 32, padding: '0 12px', borderRadius: 9, background: '#fff', color: C.tp,
              fontSize: 12, fontWeight: 500, border: `1px solid ${C.br}`, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}
          >
            <IconEdit size={11} />Adjust profile
          </button>
          <button
            onClick={onRegenerate}
            style={{
              height: 32, padding: '0 12px', borderRadius: 9, background: '#fff', color: C.tp,
              fontSize: 12, fontWeight: 500, border: `1px solid ${C.br}`, cursor: 'pointer',
            }}
          >Regenerate sample</button>
        </div>
      </div>
    </Card>
  )
}

// ── Existing profile view ──────────────────────────────────────────
function ExistingProfileBanner({
  content, source, updatedAt, onReset, isAg,
}: {
  content: string; source: string | null; updatedAt: string | null
  onReset: () => void; isAg: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const date = updatedAt ? new Date(updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null
  const sourceLabel = source === 'wizard' ? 'wizard' : source === 'manual' ? 'manual entry' : 'generated'

  return (
    <div style={{
      background: C.sub, border: '1px solid #BBF7D0', borderRadius: 12,
      padding: '13px 16px', marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <IconCheck color={C.su} size={14} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.su }}>Brand voice is active</div>
          <div style={{ fontSize: 11, color: C.ts, marginTop: 1 }}>
            Via {sourceLabel}{date ? ` · Updated ${date}` : ''} · Applied to all generated content
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 11, color: C.su, fontWeight: 500 }}
        >
          {expanded ? 'Hide ↑' : 'Preview ↓'}
        </button>
        <button
          onClick={onReset}
          style={{
            height: 28, padding: '0 10px', borderRadius: 7, background: '#fff', color: C.ts,
            fontSize: 11, fontWeight: 500, border: `1px solid ${C.br}`, cursor: 'pointer',
          }}
        >Re-run wizard</button>
      </div>
      {expanded && (
        <div style={{
          marginTop: 12, padding: '12px 14px', background: '#fff', borderRadius: 9,
          fontSize: 12, color: C.tp, lineHeight: 1.8, fontStyle: 'italic',
        }}>
          {content.slice(0, 400)}{content.length > 400 ? '…' : ''}
        </div>
      )}
    </div>
  )
}

// ── Main wizard component ──────────────────────────────────────────
export default function BrandVoiceWizard({
  existingProfile,
  existingSource,
  existingUpdatedAt,
  plan,
}: {
  existingProfile: string | null
  existingSource: string | null
  existingUpdatedAt: string | null
  plan: Plan
}) {
  const router = useRouter()
  const isAg = plan === 'agency'
  const accentBg  = isAg ? C.ag  : C.a
  const accentClr = '#fff'

  // Wizard state
  const [step,     setStep]     = useState<WizardStep>(1)
  const [samples,  setSamples]  = useState(['', '', ''])
  const [traits,   setTraits]   = useState<VoiceTraits | null>(null)
  const [calibration, setCalibration] = useState<CalibrationState>(DEFAULT_CALIBRATION)
  const [profile,  setProfile]  = useState('')
  const [editing,  setEditing]  = useState(false)
  const [testType, setTestType] = useState('LinkedIn post')
  const [testSample, setTestSample] = useState('')
  const [approved, setApproved] = useState(false)
  const [showExisting, setShowExisting] = useState(!!existingProfile)

  // Loading/error
  const [extracting,       setExtracting]       = useState(false)
  const [generatingProfile, setGeneratingProfile] = useState(false)
  const [generatingTest,   setGeneratingTest]   = useState(false)
  const [saving,           setSaving]           = useState(false)
  const [error,            setError]            = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()

  function reset() {
    setStep(1); setSamples(['', '', '']); setTraits(null)
    setCalibration(DEFAULT_CALIBRATION); setProfile(''); setEditing(false)
    setTestType('LinkedIn post'); setTestSample(''); setApproved(false)
    setExtracting(false); setGeneratingProfile(false); setGeneratingTest(false)
    setError(null); setShowExisting(false)
  }

  async function goStep2() {
    const nonEmpty = samples.filter(s => s.trim().length > 20)
    if (nonEmpty.length === 0) { setError('Please paste at least one writing sample (minimum 20 characters).'); return }
    setError(null); setExtracting(true); setStep(2)
    try {
      const data = await analyzeWritingSamples(samples)
      setTraits(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setExtracting(false)
    }
  }

  async function goStep4() {
    setError(null); setGeneratingProfile(true); setStep(4)
    try {
      const p = await buildFinalProfile(samples, calibration)
      setProfile(p)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setGeneratingProfile(false)
    }
  }

  async function goStep5() {
    setEditing(false); setStep(5)
    await generateTest('LinkedIn post')
  }

  async function generateTest(type: string) {
    if (!profile) return
    setTestType(type); setGeneratingTest(true)
    try {
      const sample = await runVoiceTest(profile, type)
      setTestSample(sample)
    } catch (e: any) {
      setTestSample('Generation failed — please try again.')
    } finally {
      setGeneratingTest(false)
    }
  }

  async function handleApprove() {
    setSaving(true); setError(null)
    try {
      await activateBrandVoice(profile)
      setApproved(true)
      startTransition(() => router.refresh())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // Nav footer config
  type NavConfig = {
    back?: { label: string; action: () => void }
    next: { label: string; action: () => void; disabled?: boolean }
    extra?: React.ReactNode
  }

  const navConfig: NavConfig = step === 1
    ? { next: { label: 'Analyse my writing →', action: goStep2 } }
    : step === 2
    ? {
        back: { label: 'Back', action: () => setStep(1) },
        next: { label: 'Looks right — confirm →', action: () => setStep(3), disabled: extracting },
      }
    : step === 3
    ? {
        back: { label: 'Back', action: () => setStep(2) },
        next: { label: 'Generate my profile →', action: goStep4 },
      }
    : step === 4
    ? {
        back: { label: 'Back', action: () => setStep(3) },
        next: { label: 'Test my voice →', action: goStep5 },
        extra: (
          <button
            onClick={() => setEditing(!editing)}
            style={{
              height: 32, padding: '0 12px', borderRadius: 9, background: '#fff', color: C.tp,
              fontSize: 12, fontWeight: 500, border: `1px solid ${C.br}`, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}
          >
            <IconEdit size={11} />{editing ? 'Done editing' : 'Edit profile'}
          </button>
        ),
      }
    : {
        back: { label: 'Back', action: () => setStep(4) },
        next: approved
          ? {
              label: 'Brand voice saved — active',
              action: () => {},
              disabled: true,
            }
          : {
              label: saving ? 'Saving…' : 'Approve & activate',
              action: handleApprove,
              disabled: saving || generatingTest,
            },
      }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Topbar actions */}
      {step > 1 && (
        <div style={{ position: 'absolute', top: 13, right: 20, zIndex: 10 }}>
          <button
            onClick={reset}
            style={{
              height: 28, padding: '0 10px', borderRadius: 7, background: '#fff', color: C.ts,
              fontSize: 11, fontWeight: 500, border: `1px solid ${C.br}`, cursor: 'pointer',
            }}
          >Start over</button>
        </div>
      )}

      {/* Scroll area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', background: C.bm }}>

        {/* Existing voice banner */}
        {showExisting && existingProfile && (
          <ExistingProfileBanner
            content={existingProfile}
            source={existingSource}
            updatedAt={existingUpdatedAt}
            onReset={reset}
            isAg={isAg}
          />
        )}

        {/* Step bar */}
        <StepBar step={step} isAg={isAg} />

        {/* Error */}
        {error && (
          <div style={{ marginBottom: 12, padding: '10px 14px', background: C.dab, border: `1px solid ${C.da}`, borderRadius: 9, fontSize: 12, color: C.da }}>
            {error}
          </div>
        )}

        {/* Step panels */}
        {step === 1 && <Step1 samples={samples} setSamples={setSamples} isAg={isAg} />}
        {step === 2 && <Step2 extracting={extracting} traits={traits} isAg={isAg} />}
        {step === 3 && <Step3 calibration={calibration} setCalibration={setCalibration} isAg={isAg} />}
        {step === 4 && (
          <Step4
            profile={profile} setProfile={setProfile}
            editing={editing} setEditing={setEditing}
            generating={generatingProfile} isAg={isAg}
          />
        )}
        {step === 5 && (
          <Step5
            testType={testType} setTestType={(t) => { setTestType(t); generateTest(t) }}
            testSample={testSample} generatingTest={generatingTest}
            approved={approved} isAg={isAg}
            onApprove={handleApprove}
            onRegenerate={() => generateTest(testType)}
            onAdjustProfile={() => setStep(4)}
          />
        )}
      </div>

      {/* Nav footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', borderTop: `1px solid ${C.br}`, background: '#fff', flexShrink: 0,
      }}>
        <div style={{ fontSize: 11, color: C.tt }}>Step {step} of 5</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {navConfig.extra}
          {navConfig.back && (
            <button
              onClick={navConfig.back.action}
              style={{
                height: 32, padding: '0 12px', borderRadius: 9, background: '#fff', color: C.tp,
                fontSize: 12, fontWeight: 500, border: `1px solid ${C.br}`, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}
            >
              <IconBack size={11} />{navConfig.back.label}
            </button>
          )}
          <button
            onClick={navConfig.next.action}
            disabled={navConfig.next.disabled || (step === 2 && extracting)}
            style={{
              height: 32, padding: '0 14px', borderRadius: 9, color: approved ? '#fff' : accentClr,
              fontSize: 12, fontWeight: 600, border: 'none', cursor: navConfig.next.disabled ? 'not-allowed' : 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: approved ? C.su : accentBg,
              opacity: navConfig.next.disabled ? 0.5 : 1,
            }}
          >
            {approved && <IconCheck color="#fff" size={12} />}
            {navConfig.next.label}
          </button>
        </div>
      </div>
    </div>
  )
}
