import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getPlanLimits } from '@/lib/plans'
import Topbar from '@/components/layout/Topbar'
import UsageBar from '@/components/ui/UsageBar'

export default async function OverviewPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const displayName = user?.email?.split('@')[0] ?? 'User'

  // Load workspace (agency users can have multiple — take the first)
  const { data: workspaceRows } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: true })
    .limit(1)
  const workspace = workspaceRows?.[0] ?? null

  // Load subscription
  let plan = 'trial'
  let trialEndsAt: string | null = null
  if (workspace) {
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('plan, trial_ends_at')
      .eq('workspace_id', workspace.id)
      .single()
    if (sub) {
      plan = sub.plan
      trialEndsAt = sub.trial_ends_at
    }
  }

  // Load usage stats
  const currentMonth = new Date().toISOString().slice(0, 7)
  const { data: usageLogs } = workspace
    ? await supabaseAdmin
        .from('usage_logs')
        .select('action_type, count')
        .eq('workspace_id', workspace.id)
        .eq('month', currentMonth)
    : { data: [] }

  const usageMap: Record<string, number> = {}
  usageLogs?.forEach(log => { usageMap[log.action_type] = log.count })

  // Load niches
  const { data: niches } = workspace
    ? await supabase
        .from('niches')
        .select('id, name, slug, is_active, last_scraped_at')
        .eq('workspace_id', workspace.id)
        .order('name')
    : { data: [] }

  // Calculate trial days left
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  const limits = getPlanLimits(plan)

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <>
      <Topbar title="Overview" userName={displayName} />
      <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
        {/* Greeting */}
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-800">{greeting}, {displayName} 👋</h2>
          <p className="text-sm text-slate-500">
            Week {Math.ceil((new Date().getDate()) / 7)} · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Trial banner */}
        {plan === 'trial' && trialDaysLeft > 0 && (
          <div className="flex items-center gap-3 rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3 mb-4">
            <span className="text-base">⏱️</span>
            <div className="flex-1">
              <p className="text-xs font-bold text-indigo-600">Trial: {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining</p>
              <p className="text-[11px] text-slate-500">You have full Pro access during your trial. Choose a plan to keep your signals.</p>
            </div>
            <a href="/settings" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 whitespace-nowrap">
              Choose plan →
            </a>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {/* Reports */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Reports this month</div>
            <div className="text-2xl font-bold text-slate-800">{usageMap['trend_report'] ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-1">of {limits.reportsPerMonth} · {plan.charAt(0).toUpperCase() + plan.slice(1)}</div>
            <UsageBar
              used={usageMap['trend_report'] ?? 0}
              total={limits.reportsPerMonth}
              showText={false}
              className="mt-2.5"
            />
          </div>

          {/* Content */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Content published</div>
            <div className="text-2xl font-bold text-slate-800">
              {(usageMap['signal_brief'] ?? 0) + (usageMap['newsletter'] ?? 0)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Briefs + newsletters</div>
          </div>

          {/* Active niches */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Active niches</div>
            <div className="text-2xl font-bold text-slate-800">{niches?.filter(n => n.is_active).length ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-1">of {limits.nichesPerWorkspace} allowed</div>
          </div>
        </div>

        {/* Usage bars */}
        {(limits.signalBriefs > 0 || limits.newsletters > 0) && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Monthly usage</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <UsageBar
                label="Reports"
                used={usageMap['trend_report'] ?? 0}
                total={limits.reportsPerMonth}
              />
              {limits.signalBriefs > 0 && (
                <UsageBar
                  label="Signal Briefs"
                  used={usageMap['signal_brief'] ?? 0}
                  total={limits.signalBriefs}
                />
              )}
              {limits.newsletters > 0 && (
                <UsageBar
                  label="Newsletters"
                  used={usageMap['newsletter'] ?? 0}
                  total={limits.newsletters}
                />
              )}
              {limits.dashboards > 0 && limits.dashboards !== Infinity && (
                <UsageBar
                  label="Dashboards"
                  used={usageMap['dashboard'] ?? 0}
                  total={limits.dashboards as number}
                />
              )}
            </div>
          </div>
        )}

        {/* Two column layout */}
        <div className="grid grid-cols-[1fr_320px] gap-3.5">
          {/* Left: Niche status cards */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-2">
              Weekly loop status
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {(!niches || niches.length === 0) ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-3xl">🌱</div>
                <div className="text-lg font-bold text-slate-800">Welcome to PulseLoop, {displayName}</div>
                <p className="text-sm text-slate-500 max-w-sm">
                  You&apos;re 3 steps away from your first weekly intelligence loop. Takes about 5 minutes.
                </p>
                <div className="flex flex-col gap-2 w-full max-w-sm">
                  {['Set up your first niche', 'Configure your brand voice', 'Run your first Trend Report'].map((step, i) => (
                    <div key={step} className="bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 flex items-center gap-2.5 text-left">
                      <div className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </div>
                      <span className="text-xs font-medium text-slate-700">{step}</span>
                    </div>
                  ))}
                </div>
                <a
                  href="/niches"
                  className="inline-flex items-center justify-center h-9 px-6 rounded-lg text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors"
                >
                  Set up my first niche →
                </a>
              </div>
            ) : (
              /* Niche cards */
              <div className="space-y-2.5">
                {niches.map((niche) => (
                  <div key={niche.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-2.5 px-3.5 py-3">
                      <span className="text-lg">🎯</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold text-slate-800 truncate">{niche.name}</div>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${niche.is_active ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                        {niche.is_active ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-3.5 py-2 border-t border-slate-100 bg-slate-50/50">
                      <span className="text-[11px] text-slate-500">
                        {niche.last_scraped_at
                          ? `Last scraped ${new Date(niche.last_scraped_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                          : 'Not scraped yet'}
                      </span>
                      <a href={`/reports?niche=${niche.id}`} className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700">
                        View reports →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Activity feed */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col h-fit max-h-[500px]">
            <div className="px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <span className="text-[13px] font-bold text-slate-800">Recent activity</span>
              <span className="text-[10px] text-slate-400">This week</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="px-3.5 py-8 text-center">
                <p className="text-sm text-slate-400">No activity yet</p>
                <p className="text-xs text-slate-300 mt-1">Create a niche to get started</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
