// lib/plans.ts — NO import 'server-only' (no secrets here, safe to import anywhere)
export const PLAN_LIMITS = {
  trial: {
    workspaces: 1, nichesPerWorkspace: 3,
    reportsPerMonth: 12,
    signalBriefs: 12, newsletters: 4, linkedinPosts: 4, dashboards: 12,
    scrapeIntervalHours: 2, privateUpload: false, whiteLabel: false, customSignalTypes: false,
  },
  starter: {
    workspaces: 1, nichesPerWorkspace: 3,
    reportsPerMonth: 4,
    signalBriefs: 0,
    newsletters: 0, linkedinPosts: 0, dashboards: 0,
    scrapeIntervalHours: 6, privateUpload: false, whiteLabel: false, customSignalTypes: false,
  },
  pro: {
    workspaces: 1, nichesPerWorkspace: 7,
    reportsPerMonth: 12,
    signalBriefs: 12, newsletters: 4, linkedinPosts: 4, dashboards: 12,
    scrapeIntervalHours: 2, privateUpload: false, whiteLabel: false, customSignalTypes: false,
  },
  agency: {
    workspaces: 5, nichesPerWorkspace: 5,
    reportsPerMonth: 12,
    signalBriefs: 12, newsletters: 4, linkedinPosts: 4, dashboards: Infinity,
    scrapeIntervalHours: 1, privateUpload: true, whiteLabel: true, customSignalTypes: true,
  },
} as const

export type Plan = keyof typeof PLAN_LIMITS

export function getPlanLimits(plan: string) {
  return PLAN_LIMITS[plan as Plan] ?? PLAN_LIMITS.starter
}

export function isLocked(plan: Plan, feature: keyof typeof PLAN_LIMITS.starter): boolean {
  const v = PLAN_LIMITS[plan][feature]
  return v === 0 || v === false
}
