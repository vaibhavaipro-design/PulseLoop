import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getUser, getWorkspaceWithSub, getAllWorkspaces } from '@/lib/data/queries'
import { getPlanLimits } from '@/lib/plans'
import Topbar from '@/components/layout/Topbar'

type ItemStatus = 'done' | 'active' | 'pending' | 'locked'
type ItemKey = 'report' | 'brief' | 'newsletter' | 'linkedin'

interface LoopItem {
  key: ItemKey
  label: string
  status: ItemStatus
  note: string
}

function getWeekNumber(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function formatTime(created: string, now: Date): string {
  const d = new Date(created)
  const diffH = Math.floor((now.getTime() - d.getTime()) / 3600000)
  if (diffH < 1) return 'Just now'
  if (diffH < 24) return `${diffH}h ago`
  if (diffH < 48) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
  return d.toLocaleDateString('en-GB', { weekday: 'short' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function getActivityDay(created: string, now: Date): 'Today' | 'Yesterday' | 'Earlier this week' {
  const d = new Date(created)
  const today = new Date(now); today.setHours(0, 0, 0, 0)
  const yest = new Date(today); yest.setDate(yest.getDate() - 1)
  if (d >= today) return 'Today'
  if (d >= yest) return 'Yesterday'
  return 'Earlier this week'
}

type NicheRow = { id: string; name: string; icon: string; is_active: boolean }

function NicheCard({ niche, items, isAgency, isStarter, weekNum }: {
  niche: NicheRow
  items: LoopItem[]
  isAgency: boolean
  isStarter: boolean
  weekNum: number
}) {
  const allDone = items.every(i => i.status === 'done')
  const hasActive = items.some(i => i.status === 'active')

  const leftBorder = allDone
    ? 'border-l-[3px] border-l-green-500'
    : hasActive
    ? isAgency ? 'border-l-[3px] border-l-amber-500' : 'border-l-[3px] border-l-indigo-500'
    : ''

  let footText: React.ReactNode = 'All done for this niche this week'
  let footHref = `/reports?niche=${niche.id}`
  let footVariant: 'primary' | 'secondary' | 'upgrade' = 'secondary'
  let footLabel = 'View report'

  if (isStarter) {
    footText = 'Briefs & newsletters locked on Starter'
    footLabel = 'Upgrade to Pro'
    footHref = '/settings'
    footVariant = 'upgrade'
  } else if (!allDone) {
    const next = items.find(i => i.status === 'active' || i.status === 'pending')
    if (next?.key === 'report') {
      footText = <>Start with a <strong className="font-semibold text-slate-700">Trend Report</strong></>
      footHref = '/reports'; footVariant = 'primary'; footLabel = 'Generate'
    } else if (next?.key === 'brief') {
      footText = <>Next step: <strong className="font-semibold text-slate-700">Signal Brief</strong></>
      footHref = '/signal-briefs'; footVariant = 'primary'; footLabel = 'Generate'
    } else if (next?.key === 'newsletter') {
      footText = <>Next step: <strong className="font-semibold text-slate-700">Newsletter</strong> is ready</>
      footHref = '/newsletters'; footVariant = 'primary'; footLabel = 'Generate'
    } else if (next?.key === 'linkedin') {
      footText = <>Next step: <strong className="font-semibold text-slate-700">LinkedIn Posts</strong></>
      footHref = '/linkedin'; footVariant = 'primary'; footLabel = 'Generate'
    }
  }

  const itemBg: Record<ItemStatus, string> = {
    done: 'bg-green-50 border border-green-200',
    active: isAgency ? 'bg-amber-50 border border-amber-200' : 'bg-indigo-50 border border-indigo-200',
    pending: 'bg-[#F7F7FC] border border-slate-200',
    locked: 'bg-[#F0F0F7] border border-dashed border-slate-300',
  }
  const iconBg: Record<ItemStatus, string> = {
    done: 'bg-green-500',
    active: isAgency ? 'bg-amber-500' : 'bg-indigo-500',
    pending: 'bg-white border border-slate-200',
    locked: 'bg-[#F0F0F7] border border-dashed border-slate-300',
  }
  const labelColor: Record<ItemStatus, string> = {
    done: 'text-green-600',
    active: isAgency ? 'text-amber-700' : 'text-indigo-600',
    pending: 'text-slate-400',
    locked: 'text-slate-300',
  }
  const noteColor: Record<ItemStatus, string> = {
    done: 'text-slate-500',
    active: 'text-slate-500',
    pending: 'text-slate-400',
    locked: 'text-slate-300',
  }
  const iconStrokeFor = (s: ItemStatus) =>
    s === 'done' || s === 'active' ? 'stroke-white' : s === 'locked' ? 'stroke-slate-300' : 'stroke-slate-400'

  return (
    <div className={`bg-white border border-slate-200 rounded-[13px] overflow-hidden mb-2.5 ${leftBorder}`}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 py-3">
        <span className="text-lg flex-shrink-0">{niche.icon || '🤖'}</span>
        <div className="text-[13px] font-bold text-[#1A1A3E] flex-1 truncate">{niche.name}</div>
        <span className="text-[11px] text-[#A0A0BE] mr-1.5">Week {weekNum}</span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          allDone
            ? 'bg-green-50 text-green-600'
            : isAgency ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-600'
        }`}>
          {allDone ? '✓ Complete' : 'In progress'}
        </span>
      </div>

      {/* 4-item status grid */}
      <div className="grid grid-cols-4 gap-1.5 px-3.5 pb-3">
        {items.map(item => {
          const iconKey = item.status === 'done' ? 'done' : item.status === 'locked' ? 'lock' : item.key
          return (
            <div key={item.key} className={`rounded-[9px] p-2 flex flex-col gap-1 ${itemBg[item.status]}`}>
              <div className="flex items-center gap-1.5">
                <div className={`w-[18px] h-[18px] rounded-[5px] flex items-center justify-center flex-shrink-0 ${iconBg[item.status]}`}>
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className={`w-2.5 h-2.5 ${iconStrokeFor(item.status)}`}>
                    {iconKey === 'report'     && <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />}
                    {iconKey === 'brief'      && <><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></>}
                    {iconKey === 'newsletter' && <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></>}
                    {iconKey === 'linkedin'   && <><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></>}
                    {iconKey === 'done'       && <polyline points="20 6 9 17 4 12" />}
                    {iconKey === 'lock'       && <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>}
                  </svg>
                </div>
                <div className={`text-[10px] font-bold leading-tight ${labelColor[item.status]}`}>{item.label}</div>
              </div>
              <div className={`text-[10px] leading-tight ${noteColor[item.status]}`}>{item.note}</div>
            </div>
          )
        })}
      </div>

      {/* Footer CTA */}
      <div className="flex items-center justify-between px-3.5 py-2 border-t border-slate-100 bg-[#F7F7FC]">
        <span className="text-[11px] text-[#6B6B8A]">{footText}</span>
        <Link
          href={footHref}
          className={`h-[26px] px-3 rounded-[7px] text-[11px] font-semibold inline-flex items-center whitespace-nowrap transition-colors ${
            footVariant === 'secondary'
              ? isAgency
                ? 'bg-transparent text-amber-700 border border-amber-300 hover:bg-amber-50'
                : 'bg-transparent text-indigo-500 border border-indigo-200 hover:bg-indigo-50'
              : isAgency
              ? 'bg-[#1A1A3E] text-amber-400 hover:bg-[#2D2D5E]'
              : 'bg-indigo-500 text-white hover:bg-indigo-600'
          }`}
        >
          {footLabel}
        </Link>
      </div>
    </div>
  )
}

export default async function OverviewPage({ searchParams }: { searchParams: { ws?: string } }) {
  const user = await getUser()
  if (!user) redirect('/login')

  const { workspace: primaryWorkspace, subscription } = await getWorkspaceWithSub(user.id)
  const plan = subscription?.plan ?? 'trial'
  const trialEndsAt = subscription?.trial_ends_at ?? null
  const displayName = user.email?.split('@')[0] ?? 'User'
  const isAgency = plan === 'agency'
  const isStarter = plan === 'starter'

  // Agency: allow workspace switching via ?ws param
  let workspace = primaryWorkspace
  let allWorkspaces: { id: string; name: string }[] = []
  if (isAgency) {
    allWorkspaces = await getAllWorkspaces(user.id)
    if (searchParams.ws) {
      const found = allWorkspaces.find(w => w.id === searchParams.ws)
      if (found) workspace = found
    }
  }

  const now = new Date()
  const currentMonth = now.toISOString().slice(0, 7)

  // Monday of current week
  const weekStart = new Date(now)
  const dow = weekStart.getDay()
  weekStart.setDate(weekStart.getDate() - (dow === 0 ? 6 : dow - 1))
  weekStart.setHours(0, 0, 0, 0)
  const weekNum = getWeekNumber(now)

  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'
  const todayStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const supabase = createSupabaseServerClient()
  const wid = workspace?.id

  // Fetch niche counts for all workspaces (for agency tab badges)
  const wsNicheCountMap: Record<string, number> = {}
  if (isAgency && allWorkspaces.length > 0) {
    const allWsIds = allWorkspaces.map(w => w.id)
    const { data: allNicheCounts } = await supabase
      .from('niches')
      .select('workspace_id')
      .in('workspace_id', allWsIds)
    ;(allNicheCounts ?? []).forEach((r: { workspace_id: string }) => {
      wsNicheCountMap[r.workspace_id] = (wsNicheCountMap[r.workspace_id] ?? 0) + 1
    })
  }

  const [usageResult, nichesResult, weekReportsResult] = wid
    ? await Promise.all([
        supabaseAdmin.from('usage_logs').select('action_type, count').eq('workspace_id', wid).eq('month', currentMonth),
        supabase.from('niches').select('id, name, icon, is_active').eq('workspace_id', wid).order('name'),
        supabaseAdmin.from('trend_reports').select('id, niche_id, title, created_at').eq('workspace_id', wid)
          .gte('created_at', weekStart.toISOString()).order('created_at', { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }]

  type UsageRow   = { action_type: string; count: number }
  type ReportRow  = { id: string; niche_id: string; title: string | null; created_at: string }

  const usageMap: Record<string, number> = {}
  ;(usageResult.data as UsageRow[] ?? []).forEach(r => { usageMap[r.action_type] = r.count })

  const niches     = (nichesResult.data as NicheRow[])     ?? []
  const weekReports = (weekReportsResult.data as ReportRow[]) ?? []

  // Build per-niche content status sets
  const weekReportIds   = weekReports.map(r => r.id)
  const nicheHasReport  = new Set<string>(weekReports.map(r => r.niche_id))
  const nichesWithBrief      = new Set<string>()
  const nichesWithNewsletter = new Set<string>()
  const nichesWithLinkedIn   = new Set<string>()

  if (weekReportIds.length > 0) {
    const [briefsRes, nlRes] = await Promise.all([
      supabaseAdmin.from('signal_briefs').select('trend_report_id').in('trend_report_id', weekReportIds),
      supabaseAdmin.from('newsletters').select('id, trend_report_id').in('trend_report_id', weekReportIds),
    ])

    const reportToNiche = new Map<string, string>(weekReports.map(r => [r.id, r.niche_id]))

    ;(briefsRes.data as { trend_report_id: string }[] ?? []).forEach(b => {
      const n = reportToNiche.get(b.trend_report_id)
      if (n) nichesWithBrief.add(n)
    })

    const nlData    = (nlRes.data as { id: string; trend_report_id: string }[]) ?? []
    const weekNlIds = nlData.map(n => n.id)
    nlData.forEach(n => {
      const nid = reportToNiche.get(n.trend_report_id)
      if (nid) nichesWithNewsletter.add(nid)
    })

    if (weekNlIds.length > 0) {
      const postsRes = await supabaseAdmin.from('linkedin_posts').select('newsletter_id').in('newsletter_id', weekNlIds)
      const nlToNiche = new Map<string, string>(nlData.map(n => [n.id, reportToNiche.get(n.trend_report_id) ?? '']))
      ;(postsRes.data as { newsletter_id: string }[] ?? []).forEach(p => {
        const nid = nlToNiche.get(p.newsletter_id)
        if (nid) nichesWithLinkedIn.add(nid)
      })
    }
  }

  // Compute 4-item loop status for a niche
  function computeItems(nicheId: string): LoopItem[] {
    const hasReport      = nicheHasReport.has(nicheId)
    const hasBrief       = nichesWithBrief.has(nicheId)
    const hasNewsletter  = nichesWithNewsletter.has(nicheId)
    const hasLinkedIn    = nichesWithLinkedIn.has(nicheId)
    return [
      {
        key: 'report', label: 'Trend Report',
        status: hasReport ? 'done' : 'active',
        note:   hasReport ? 'Generated this week' : 'Ready to generate',
      },
      {
        key: 'brief', label: 'Signal Brief',
        status: isStarter ? 'locked' : hasBrief ? 'done' : hasReport ? 'active' : 'pending',
        note:   isStarter ? 'Pro only' : hasBrief ? 'Generated this week' : hasReport ? 'Ready to generate' : 'After report',
      },
      {
        key: 'newsletter', label: 'Newsletter',
        status: isStarter ? 'locked' : hasNewsletter ? 'done' : hasBrief ? 'active' : 'pending',
        note:   isStarter ? 'Pro only' : hasNewsletter ? 'Generated this week' : hasBrief ? 'Ready to generate' : 'After brief',
      },
      {
        key: 'linkedin', label: 'LinkedIn Posts',
        status: hasLinkedIn ? 'done' : hasNewsletter ? 'active' : 'pending',
        note:   hasLinkedIn ? 'Posts ready' : hasNewsletter ? 'Ready to generate' : isStarter ? 'After report' : 'After newsletter',
      },
    ]
  }

  // Stats
  const limits        = getPlanLimits(plan)
  const reportsUsed   = usageMap['trend_report'] ?? 0
  const reportsTotal  = limits.reportsPerMonth as number
  const reportsPct    = reportsTotal > 0 ? Math.round(reportsUsed / reportsTotal * 100) : 0
  const barColor      = reportsPct >= 90 ? '#E85757' : isAgency ? '#F5A623' : '#5B5FC7'
  const contentCount  = (usageMap['signal_brief'] ?? 0) + (usageMap['newsletter'] ?? 0) + (usageMap['linkedin_post'] ?? 0)

  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - now.getTime()) / 86400000))
    : 0

  // Activity feed (from week reports)
  type ActivityItem = { icon: string; bg: string; action: string; niche: string; time: string; href: string }
  const nicheMap = new Map<string, string>(niches.map(n => [n.id, n.name]))
  const activityByDay = new Map<string, ActivityItem[]>()

  weekReports.forEach(r => {
    const day = getActivityDay(r.created_at, now)
    const arr = activityByDay.get(day) ?? []
    arr.push({
      icon: '📊', bg: '#EEEEFF',
      action: 'Trend Report generated',
      niche: nicheMap.get(r.niche_id) ?? 'Unknown niche',
      time: formatTime(r.created_at, now),
      href: `/reports/${r.id}`,
    })
    activityByDay.set(day, arr)
  })

  const activityGroups = (['Today', 'Yesterday', 'Earlier this week'] as const)
    .map(d => ({ day: d, items: activityByDay.get(d) ?? [] }))
    .filter(g => g.items.length > 0)

  const activeWsId = workspace?.id ?? allWorkspaces[0]?.id

  return (
    <>
      <Topbar title="Overview" userName={displayName} />

      <div className="flex-1 overflow-y-auto p-5 bg-[#F7F7FC]">

        {/* ── Greeting ── */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xl font-bold text-[#1A1A3E] mb-0.5">{greeting}, {displayName} 👋</div>
            <div className="text-[13px] text-[#6B6B8A]">
              Week {weekNum} · {todayStr}
              {isAgency && workspace ? ` · ${workspace.name}` : ''}
            </div>
          </div>
        </div>

        {/* ── Trial nudge ── */}
        {plan === 'trial' && trialDaysLeft > 0 && (
          <div className="flex items-center gap-2.5 rounded-xl bg-indigo-50 border border-indigo-200 px-3.5 py-2.5 mb-4">
            <div className="w-[30px] h-[30px] rounded-lg bg-white flex items-center justify-center text-sm flex-shrink-0">⏱️</div>
            <div className="flex-1">
              <div className="text-[12px] font-bold text-indigo-600">
                Trial: {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining
              </div>
              <div className="text-[11px] text-[#6B6B8A] mt-0.5">
                You have full Pro access during your trial. Choose a plan to keep your signals.
              </div>
            </div>
            <Link href="/settings" className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 whitespace-nowrap flex-shrink-0">
              Choose plan →
            </Link>
          </div>
        )}

        {/* ── Starter nudge ── */}
        {isStarter && (
          <div className="flex items-center gap-2.5 rounded-xl bg-indigo-50 border border-indigo-200 px-3.5 py-2.5 mb-4">
            <div className="w-[30px] h-[30px] rounded-lg bg-white flex items-center justify-center text-sm flex-shrink-0">⚡</div>
            <div className="flex-1">
              <div className="text-[12px] font-bold text-indigo-600">Unlock the full weekly loop — upgrade to Pro</div>
              <div className="text-[11px] text-[#6B6B8A] mt-0.5">
                Signal Briefs and Newsletters are locked on Starter. Pro unlocks all 4 content types from every Trend Report.
              </div>
            </div>
            <Link
              href="/settings"
              className="h-[28px] px-3 rounded-lg bg-indigo-500 text-white text-[11px] font-semibold inline-flex items-center whitespace-nowrap flex-shrink-0 hover:bg-indigo-600 transition-colors"
            >
              Upgrade to Pro →
            </Link>
          </div>
        )}

        {/* ── Stats row (3 cards) ── */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {/* Reports this month */}
          <div className="bg-white border border-slate-200 rounded-[11px] p-3 pb-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6B6B8A] mb-1">Reports this month</div>
            <div className="text-2xl font-bold text-[#1A1A3E] leading-none">{reportsUsed}</div>
            <div className="text-[11px] text-slate-400 mt-1">
              {isAgency ? `of ${reportsTotal}/workspace · Agency` : `of ${reportsTotal} · ${plan.charAt(0).toUpperCase() + plan.slice(1)}`}
            </div>
            <div className="h-1 rounded-full bg-slate-100 mt-2.5 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(reportsPct, 100)}%`, background: barColor }} />
            </div>
          </div>

          {/* Content published */}
          <div className="bg-white border border-slate-200 rounded-[11px] p-3 pb-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6B6B8A] mb-1">Content published</div>
            <div className="text-2xl font-bold text-[#1A1A3E] leading-none">{contentCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">
              {isStarter ? 'Locked content · upgrade for more' : 'Briefs + newsletters + posts'}
            </div>
          </div>

          {/* Plan usage */}
          <div className="bg-white border border-slate-200 rounded-[11px] p-3 pb-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6B6B8A] mb-1">Plan usage</div>
            <div className="text-base font-bold text-[#1A1A3E] leading-none pt-1">{reportsUsed} / {reportsTotal}</div>
            <div className="text-[11px] mt-1">
              <span className="text-slate-400">reports used · </span>
              {reportsPct >= 90
                ? <span className="font-semibold" style={{ color: '#E85757' }}>Near limit</span>
                : <span className="text-slate-400">{Math.max(0, reportsTotal - reportsUsed)} remaining</span>}
            </div>
            <div className="h-1 rounded-full bg-slate-100 mt-2.5 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(reportsPct, 100)}%`, background: barColor }} />
            </div>
          </div>
        </div>

        {/* ── Agency workspace tabs ── */}
        {isAgency && allWorkspaces.length > 0 && (
          <div className="mb-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Workspace</div>
            <div className="flex gap-1.5 flex-wrap">
              {allWorkspaces.map(ws => {
                const isActive = ws.id === activeWsId
                return (
                  <Link
                    key={ws.id}
                    href={`/overview?ws=${ws.id}`}
                    className={`h-7 px-3 rounded-[7px] text-[12px] font-semibold inline-flex items-center gap-1.5 transition-colors ${
                      isActive ? 'bg-[#1A1A3E] text-white' : 'bg-white text-[#6B6B8A] border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    🏢 {ws.name}
                    <span className={`text-[10px] rounded-full px-1.5 py-px ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {wsNicheCountMap[ws.id] ?? 0} niches
                    </span>
                  </Link>
                )
              })}
              <Link
                href="/settings"
                className="h-7 px-3 rounded-[7px] text-[12px] font-semibold inline-flex items-center text-[#6B6B8A] border border-dashed border-slate-300 hover:border-slate-400 transition-colors"
              >
                + Add workspace
              </Link>
            </div>
          </div>
        )}

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-[1fr_308px] gap-3.5">

          {/* Left: Weekly loop status */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-2">
              Weekly loop status
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {niches.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center gap-4 py-14 text-center">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${isAgency ? 'bg-amber-50' : 'bg-indigo-50'}`}>
                  🌱
                </div>
                <div className="text-lg font-bold text-[#1A1A3E]">Welcome to PulseLoop, {displayName}</div>
                <p className="text-[13px] text-[#6B6B8A] max-w-[340px] leading-relaxed">
                  You&apos;re 3 steps away from your first weekly intelligence loop. Takes about 5 minutes.
                </p>
                <div className="flex flex-col gap-2 w-full max-w-[360px]">
                  {[
                    { n: 1, title: 'Set up your first niche', sub: 'Define the market you want to track — e.g. "AI Tooling for French B2B SaaS"' },
                    { n: 2, title: 'Configure your brand voice', sub: 'Paste 3 samples of your writing — takes 2 minutes' },
                    { n: 3, title: 'Run your first Trend Report', sub: 'PulseLoop scrapes 18 EU sources and generates your first intelligence brief' },
                  ].map(step => (
                    <div key={step.n} className="bg-white border border-slate-200 rounded-[10px] px-3.5 py-2.5 flex items-center gap-2.5 text-left">
                      <div className={`w-[22px] h-[22px] rounded-[6px] text-[11px] font-bold flex items-center justify-center flex-shrink-0 ${
                        isAgency ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-600'
                      }`}>
                        {step.n}
                      </div>
                      <div>
                        <div className="text-[12px] font-semibold text-[#1A1A3E]">{step.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{step.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  href="/niches"
                  className={`h-9 px-7 rounded-[10px] text-[13px] font-semibold inline-flex items-center text-white transition-colors ${
                    isAgency ? 'bg-[#1A1A3E] hover:bg-[#2D2D5E]' : 'bg-indigo-500 hover:bg-indigo-600'
                  }`}
                >
                  Set up my first niche →
                </Link>
              </div>
            ) : (
              <div>
                {niches.map(niche => (
                  <NicheCard
                    key={niche.id}
                    niche={niche}
                    items={computeItems(niche.id)}
                    isAgency={isAgency}
                    isStarter={isStarter}
                    weekNum={weekNum}
                  />
                ))}

                {/* Starter teaser: more niches on Pro */}
                {isStarter && (
                  <div className="border-2 border-dashed border-slate-300 rounded-[13px] p-4 flex items-center gap-3 bg-white hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5 text-slate-400">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-[12px] font-semibold text-[#6B6B8A]">2 more niches available on Pro</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Starter includes 1 niche · Pro gives you 7 with the full loop</div>
                    </div>
                    <Link
                      href="/settings"
                      className="h-[26px] px-3 rounded-[7px] bg-indigo-500 text-white text-[11px] font-semibold inline-flex items-center whitespace-nowrap flex-shrink-0 hover:bg-indigo-600 transition-colors"
                    >
                      Upgrade →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Activity feed */}
          <div className="bg-white border border-slate-200 rounded-[13px] overflow-hidden flex flex-col" style={{ maxHeight: 500 }}>
            <div className="px-3.5 py-3 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <span className="text-[13px] font-bold text-[#1A1A3E]">Recent activity</span>
              <span className="text-[10px] text-slate-400">This week</span>
            </div>

            <div className="flex-1 overflow-y-auto">
              {activityGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center px-4">
                  <p className="text-[13px] text-slate-400">No activity yet</p>
                  <p className="text-[11px] text-slate-300">Generate your first report to see it here</p>
                </div>
              ) : (
                activityGroups.map(group => (
                  <div key={group.day}>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3.5 py-2 bg-[#F7F7FC] border-b border-slate-100">
                      {group.day}
                    </div>
                    {group.items.map((item, i) => (
                      <Link
                        key={i}
                        href={item.href}
                        className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-slate-100 last:border-b-0 hover:bg-[#F7F7FC] transition-colors"
                      >
                        <div
                          className="w-[26px] h-[26px] rounded-[7px] flex items-center justify-center text-[12px] flex-shrink-0"
                          style={{ background: item.bg }}
                        >
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-semibold text-[#1A1A3E]">{item.action}</div>
                          <div className="text-[10px] text-[#6B6B8A] truncate mt-0.5">{item.niche}</div>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                          <span className="text-[10px] text-slate-400">{item.time}</span>
                          <span className={`text-[10px] font-semibold ${isAgency ? 'text-amber-600' : 'text-indigo-500'}`}>
                            View →
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
