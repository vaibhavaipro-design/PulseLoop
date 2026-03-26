import 'server-only'
import Parser from 'rss-parser'

const parser = new Parser()

export interface SourceResult {
  text: string
  source_url: string
  platform: string
}

// ── Reddit ────────────────────────────────────────────────────────────────────
// Uses Reddit's public search RSS — no auth required
export async function fetchReddit(searchQuery: string): Promise<SourceResult[]> {
  try {
    const url = `https://www.reddit.com/search.rss?q=${encodeURIComponent(searchQuery)}&sort=new&limit=15`
    const feed = await parser.parseURL(url)
    return feed.items
      .filter(item => {
        const text = `${item.title ?? ''}\n${item.contentSnippet ?? item.content ?? ''}`.trim()
        return text.length >= 50
      })
      .map(item => ({
        text: `${item.title ?? ''}\n${item.contentSnippet ?? item.content ?? ''}`.trim(),
        source_url: item.link ?? url,
        platform: 'reddit',
      }))
  } catch {
    return []
  }
}

// ── Substack ──────────────────────────────────────────────────────────────────
// Unofficial search API — no auth, returns published posts
export async function fetchSubstack(searchQuery: string): Promise<SourceResult[]> {
  try {
    const url = `https://substack.com/api/v1/search/published?query=${encodeURIComponent(searchQuery)}&limit=10`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PulseLoop/1.0)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const posts: any[] = data?.posts ?? []
    return posts
      .filter(p => p.title && (p.subtitle || p.description))
      .map(p => ({
        text: `${p.title}\n${p.subtitle ?? p.description ?? ''}`.trim(),
        source_url: p.canonical_url ?? p.url ?? 'https://substack.com',
        platform: 'substack',
      }))
  } catch {
    return []
  }
}

// ── Bluesky ───────────────────────────────────────────────────────────────────
// AT Protocol public search — no auth required for public posts
export async function fetchBluesky(searchQuery: string): Promise<SourceResult[]> {
  try {
    const url = `https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(searchQuery)}&limit=20`
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const posts: any[] = data?.posts ?? []
    return posts
      .filter(p => p.record?.text && p.record.text.length >= 50)
      .map(p => ({
        text: p.record.text,
        source_url: `https://bsky.app/profile/${p.author?.handle}/post/${p.uri?.split('/').pop()}`,
        platform: 'bluesky',
      }))
  } catch {
    return []
  }
}

// ── Polymarket ────────────────────────────────────────────────────────────────
// Free public REST API — returns prediction markets as market intelligence signals
export async function fetchPolymarket(searchQuery: string): Promise<SourceResult[]> {
  try {
    const url = `https://gamma-api.polymarket.com/markets?search=${encodeURIComponent(searchQuery)}&active=true&limit=10`
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const markets: any[] = await res.json()
    return markets
      .filter(m => m.question && m.description)
      .map(m => {
        const yesPrice = m.outcomePrices?.[0] ?? null
        const probability = yesPrice ? ` (market probability: ${Math.round(parseFloat(yesPrice) * 100)}%)` : ''
        return {
          text: `Prediction market: ${m.question}${probability}\n${m.description ?? ''}`.trim(),
          source_url: m.marketMakerAddress
            ? `https://polymarket.com/event/${m.conditionId}`
            : 'https://polymarket.com',
          platform: 'polymarket',
        }
      })
  } catch {
    return []
  }
}

// ── GitHub Trending ───────────────────────────────────────────────────────────
// Uses mshibanami's RSS wrapper — returns today's trending repos
// Falls back to weekly if daily has no results for the query
export async function fetchGitHubTrending(searchQuery: string): Promise<SourceResult[]> {
  try {
    // Build a slug from the query for the RSS wrapper
    const slug = searchQuery.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const urls = [
      `https://mshibanami.github.io/GitHubTrendingRSS/daily/${slug}.xml`,
      `https://mshibanami.github.io/GitHubTrendingRSS/weekly/unknown.xml`,
    ]

    for (const url of urls) {
      try {
        const feed = await parser.parseURL(url)
        const results = feed.items
          .filter(item => {
            const text = `${item.title ?? ''} ${item.contentSnippet ?? item.content ?? ''}`.trim()
            return text.length >= 30
          })
          .slice(0, 8)
          .map(item => ({
            text: `GitHub Trending: ${item.title ?? ''}\n${item.contentSnippet ?? item.content ?? ''}`.trim(),
            source_url: item.link ?? 'https://github.com/trending',
            platform: 'github',
          }))
        if (results.length > 0) return results
      } catch {
        continue
      }
    }
    return []
  } catch {
    return []
  }
}

// ── EU Parliament ─────────────────────────────────────────────────────────────
// Official RSS feed — filter by keywords
export async function fetchEUParliament(keywords: string[]): Promise<SourceResult[]> {
  try {
    const url = 'https://www.europarl.europa.eu/rss/doc/top-stories/en.rss'
    const feed = await parser.parseURL(url)
    const kwSet = keywords.map(k => k.toLowerCase())
    return feed.items
      .filter(item => {
        const combined = `${item.title ?? ''} ${item.contentSnippet ?? item.content ?? ''}`.toLowerCase()
        return kwSet.some(kw => combined.includes(kw))
      })
      .slice(0, 5)
      .map(item => ({
        text: `${item.title ?? ''}\n${item.contentSnippet ?? item.content ?? ''}`.trim(),
        source_url: item.link ?? url,
        platform: 'euparliament',
      }))
  } catch {
    return []
  }
}

// ── CNIL ──────────────────────────────────────────────────────────────────────
// Official French data protection authority RSS — filter by keywords
export async function fetchCNIL(keywords: string[]): Promise<SourceResult[]> {
  try {
    const url = 'https://www.cnil.fr/fr/rss.xml'
    const feed = await parser.parseURL(url)
    const kwSet = keywords.map(k => k.toLowerCase())
    return feed.items
      .filter(item => {
        const combined = `${item.title ?? ''} ${item.contentSnippet ?? item.content ?? ''}`.toLowerCase()
        return kwSet.some(kw => combined.includes(kw))
      })
      .slice(0, 5)
      .map(item => ({
        text: `${item.title ?? ''}\n${item.contentSnippet ?? item.content ?? ''}`.trim(),
        source_url: item.link ?? url,
        platform: 'cnil',
      }))
  } catch {
    return []
  }
}
