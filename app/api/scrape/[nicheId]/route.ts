import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import Parser from 'rss-parser'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { userRatelimit } from '@/lib/ratelimit'
import { embedAndStoreBatch } from '@/lib/rag'

const parser = new Parser()

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

  // ── 2. Rate limit (user-level only — no Claude call) ─────────
  const { success } = await userRatelimit.limit(user.id)
  if (!success)
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })

  // ── 3. Validate nicheId from params ──────────────────────────
  const nicheId = params.nicheId
  if (!nicheId)
    return NextResponse.json({ error: 'Missing nicheId' }, { status: 400 })

  // ── 4. Load workspace via user client ────────────────────────
  const { data: workspace } = await supabase
    .from('workspaces').select('id').eq('user_id', user.id).single()
  if (!workspace)
    return NextResponse.json({ error: 'No workspace' }, { status: 404 })

  // ── 5. Verify niche ownership ────────────────────────────────
  const { data: niche } = await supabase
    .from('niches')
    .select('id, name, slug')
    .eq('id', nicheId)
    .eq('workspace_id', workspace.id)
    .single()
  if (!niche)
    return NextResponse.json({ error: 'Niche not found' }, { status: 404 })

  // ── 6. Fetch RSS feeds and filter by niche keywords ──────────
  const feeds = [
    'https://hnrss.org/frontpage?points=100', // HN top posts
    'https://techcrunch.com/feed/',            // TechCrunch
  ]

  // Build keyword set from niche name + slug for case-insensitive matching
  const keywords = [
    niche.name.toLowerCase(),
    ...(niche.slug ?? '').toLowerCase().split('-').filter((k: string) => k.length > 2),
  ].filter(Boolean)

  const signalRows: Array<{
    workspace_id: string
    niche_id: string
    text: string
    platform: string
    source_url: string
    signal_type: string
    signal_source: string
  }> = []

  for (const feedUrl of feeds) {
    try {
      const feed = await parser.parseURL(feedUrl)
      // Take top 10 articles per feed for on-demand scrape
      const articles = feed.items.slice(0, 10)

      for (const article of articles) {
        const titleLower = (article.title ?? '').toLowerCase()
        const snippetLower = (article.contentSnippet ?? article.content ?? '').toLowerCase()
        const combined = `${titleLower} ${snippetLower}`

        // Only include articles that contain at least one niche keyword
        const isRelevant = keywords.some(kw => combined.includes(kw))
        if (!isRelevant) continue

        const text = `${article.title ?? ''}\n${article.contentSnippet ?? article.content ?? ''}`.trim()
        if (text.length < 50) continue

        const platform = feedUrl.includes('hnrss') ? 'hacker_news' : 'techcrunch'

        signalRows.push({
          workspace_id: workspace.id,
          niche_id: niche.id,
          text,
          platform,
          source_url: article.link ?? feedUrl,
          signal_type: 'article',
          signal_source: 'public',
        })
      }
    } catch (feedErr) {
      console.error(`Failed to fetch feed ${feedUrl}:`, feedErr)
    }
  }

  // ── 7. Embed + store via embedAndStoreBatch ───────────────────
  if (signalRows.length > 0) {
    try {
      await embedAndStoreBatch(signalRows)
    } catch (embedErr) {
      console.error('embedAndStoreBatch failed:', embedErr)
      return NextResponse.json({ error: 'Signal storage failed' }, { status: 500 })
    }
  }

  // ── 8. Update last_scraped_at ─────────────────────────────────
  await supabaseAdmin
    .from('niches')
    .update({ last_scraped_at: new Date().toISOString() })
    .eq('id', nicheId)

  // ── 9. Return signal count ────────────────────────────────────
  return NextResponse.json({ success: true, signalCount: signalRows.length })
}
