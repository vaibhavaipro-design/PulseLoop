import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import Parser from 'rss-parser'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { userRatelimit, ipRatelimit } from '@/lib/ratelimit'
import { embedAndStoreBatch } from '@/lib/rag'
import {
  fetchReddit,
  fetchSubstack,
  fetchBluesky,
  fetchPolymarket,
  fetchGitHubTrending,
  fetchEUParliament,
  fetchCNIL,
  type SourceResult,
} from '@/lib/sources'

const parser = new Parser()

function parseSignalMemoryDays(mem: string | null): number {
  const match = (mem ?? '').match(/(\d+)/)
  return match ? parseInt(match[1]) : 90
}

// User-triggered on-demand scrape for a single niche
export async function POST(
  request: NextRequest,
  { params }: { params: { nicheId: string } }
) {
  // ── 1. Auth ──────────────────────────────────────────────────
  const supabase = createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── 2. Rate limit (user + IP — route calls Gemini embeddings) ──
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  const [userLimit, ipLimit] = await Promise.all([
    userRatelimit.limit(user.id),
    ipRatelimit.limit(ip),
  ])
  if (!userLimit.success || !ipLimit.success)
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })

  // ── 3. Validate nicheId from params ──────────────────────────
  const nicheId = params.nicheId
  if (!nicheId)
    return NextResponse.json({ error: 'Missing nicheId' }, { status: 400 })

  // ── 4. Load workspace via user client ────────────────────────
  const { data: workspace } = await supabase
    .from('workspaces').select('id').eq('user_id', user.id).order('created_at').limit(1).single()
  if (!workspace)
    return NextResponse.json({ error: 'No workspace' }, { status: 404 })

  // ── 5a. Subscription check — expired trials cannot trigger scrapes ──
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('plan, trial_ends_at')
    .eq('workspace_id', workspace.id)
    .single()

  if (sub?.plan === 'trial' && sub.trial_ends_at) {
    if (new Date(sub.trial_ends_at) < new Date()) {
      return NextResponse.json({ error: 'Trial expired' }, { status: 403 })
    }
  }

  // ── 5. Verify niche ownership ────────────────────────────────
  const { data: niche } = await supabase
    .from('niches')
    .select('id, name, slug, keywords, description, sources, signal_memory')
    .eq('id', nicheId)
    .eq('workspace_id', workspace.id)
    .single()
  if (!niche)
    return NextResponse.json({ error: 'Niche not found' }, { status: 404 })

  // ── 6. Build search query and keyword set ─────────────────────
  const nicheKeywords: string[] = (niche.keywords ?? []) as string[]
  const nicheSources: string[] = (niche.sources ?? []) as string[]

  // Rich search query: niche name + top 3 keywords + up to 3 meaningful terms from description
  const descTerms = (niche.description ?? '')
    .split(/\s+/)
    .filter((w: string) => w.length > 3)
    .slice(0, 3)
  const searchQuery = [niche.name, ...nicheKeywords.slice(0, 3), ...descTerms].join(' ')

  // Keyword filter set for RSS feeds (include 2-char terms like "ai")
  const keywords = [
    niche.name.toLowerCase(),
    ...(niche.slug ?? '').toLowerCase().split('-').filter((k: string) => k.length > 1),
    ...nicheKeywords.map((k: string) => k.toLowerCase()),
  ].filter(Boolean)

  // Signal memory: how long to keep signals
  const memoryDays = parseSignalMemoryDays(niche.signal_memory)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + memoryDays)
  const expiresAtStr = expiresAt.toISOString()

  // ── 7. Fetch from all selected sources ───────────────────────
  const signalRows: Array<{
    workspace_id: string
    niche_id: string
    text: string
    platform: string
    source_url: string
    signal_type: string
    signal_source: string
    expires_at: string
  }> = []

  function addResults(results: SourceResult[]) {
    for (const r of results) {
      if (r.text.length < 50) continue
      signalRows.push({
        workspace_id: workspace.id,
        niche_id: niche.id,
        text: r.text,
        platform: r.platform,
        source_url: r.source_url,
        signal_type: 'article',
        signal_source: 'public',
        expires_at: expiresAtStr,
      })
    }
  }

  // All sources with their platformKeys — only run if in niche.sources (or sources is empty = all)
  const useAllSources = nicheSources.length === 0
  const has = (key: string) => useAllSources || nicheSources.includes(key)

  // ── RSS-based feeds ───────────────────────────────────────────
  const rssFeeds: Array<{ url: string; platform: string; platformKey: string }> = [
    { url: 'https://hnrss.org/frontpage?points=100', platform: 'hacker_news', platformKey: 'hackernews' },
    { url: 'https://techcrunch.com/feed/', platform: 'techcrunch', platformKey: 'techcrunch' },
    { url: 'https://www.frenchweb.fr/feed', platform: 'frenchweb', platformKey: 'frenchweb' },
    { url: 'https://www.maddyness.com/feed/', platform: 'maddyness', platformKey: 'maddyness' },
    { url: 'https://www.producthunt.com/feed?category=tech', platform: 'producthunt', platformKey: 'producthunt' },
    {
      url: `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery)}&hl=en&gl=FR&ceid=FR:en`,
      platform: 'google_news',
      platformKey: 'googlenews',
    },
  ]

  for (const feed of rssFeeds) {
    if (!has(feed.platformKey)) continue
    try {
      const parsedFeed = await parser.parseURL(feed.url)
      const articles = parsedFeed.items.slice(0, 25)

      for (const article of articles) {
        const titleLower = (article.title ?? '').toLowerCase()
        const snippetLower = (article.contentSnippet ?? article.content ?? '').toLowerCase()
        const combined = `${titleLower} ${snippetLower}`

        // Google News results are already niche-specific — skip keyword filter
        const isRelevant = feed.platformKey === 'googlenews'
          ? true
          : keywords.some(kw => combined.includes(kw))
        if (!isRelevant) continue

        const text = `${article.title ?? ''}\n${article.contentSnippet ?? article.content ?? ''}`.trim()
        if (text.length < 50) continue

        signalRows.push({
          workspace_id: workspace.id,
          niche_id: niche.id,
          text,
          platform: feed.platform,
          source_url: article.link ?? feed.url,
          signal_type: 'article',
          signal_source: 'public',
          expires_at: expiresAtStr,
        })
      }
    } catch (feedErr) {
      console.error(`Failed to fetch feed ${feed.url}:`, feedErr)
    }
  }

  // ── Dynamic API sources ───────────────────────────────────────
  const dynamicFetches: Promise<void>[] = []

  if (has('reddit')) {
    dynamicFetches.push(fetchReddit(searchQuery).then(addResults))
  }
  if (has('substack')) {
    dynamicFetches.push(fetchSubstack(searchQuery).then(addResults))
  }
  if (has('bluesky')) {
    dynamicFetches.push(fetchBluesky(searchQuery).then(addResults))
  }
  if (has('polymarket')) {
    dynamicFetches.push(fetchPolymarket(searchQuery).then(addResults))
  }
  if (has('github')) {
    dynamicFetches.push(fetchGitHubTrending(searchQuery).then(addResults))
  }
  if (has('euparliament')) {
    dynamicFetches.push(fetchEUParliament(keywords).then(addResults))
  }
  if (has('cnil')) {
    dynamicFetches.push(fetchCNIL(keywords).then(addResults))
  }

  await Promise.allSettled(dynamicFetches)

  // ── 8. Embed + store via embedAndStoreBatch ───────────────────
  if (signalRows.length > 0) {
    try {
      await embedAndStoreBatch(signalRows)
    } catch (embedErr) {
      console.error('embedAndStoreBatch failed:', embedErr)
      return NextResponse.json({ error: 'Signal storage failed' }, { status: 500 })
    }
  }

  // ── 9. Update last_scraped_at ─────────────────────────────────
  await supabaseAdmin
    .from('niches')
    .update({ last_scraped_at: new Date().toISOString() })
    .eq('id', nicheId)
    .eq('workspace_id', workspace.id)

  // ── 10. Return signal count ───────────────────────────────────
  return NextResponse.json({ success: true, signalCount: signalRows.length })
}
