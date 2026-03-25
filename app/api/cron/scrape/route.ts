import { NextResponse } from 'next/server'
import Parser from 'rss-parser'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { embedText } from '@/lib/gemini'
import { generateClaudeResponse } from '@/lib/claude'

const parser = new Parser()

// This route should be triggered via a tool like Vercel Cron or GitHub Actions
// We secure it with a simple bearer token for this MVP
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Fetch all active niches
    const { data: niches } = await supabaseAdmin
      .from('niches')
      .select('id, workspace_id, name, keywords, created_at')
      .eq('is_active', true)

    if (!niches || niches.length === 0) {
      return NextResponse.json({ message: 'No active niches found' })
    }

    // 2. Fetch a couple of generic tech/business RSS feeds as MVP connectors
    const feeds = [
      'https://hnrss.org/frontpage?points=100', // HN top posts
      'https://techcrunch.com/feed/', // Techcrunch
    ]

    let totalSignalsAdded = 0

    for (const feedUrl of feeds) {
      try {
        const feed = await parser.parseURL(feedUrl)
        
        // Take top 5 recent articles per feed to avoid rate limits during cron
        const articles = feed.items.slice(0, 5)

        for (const article of articles) {
          const contentStr = `${article.title}\n${article.contentSnippet || article.content || ''}`
          
          if (!contentStr || contentStr.length < 50) continue

          // Generate embedding for the article content
          const embedding = await embedText(contentStr)

          // 3. For each active niche, evaluate relevance using a vector similarity threshold
          // In a full production app, you might use pgvector to find relevant niches, 
          // or ask Claude "Is this highly relevant to [niche]?"
          
          for (const niche of niches) {
            // Ask Claude to evaluate relevance and extract a summarized 'signal'
            const prompt = `You are a market intelligence analyst.
Evaluate this article for the niche: "${niche.name}".
Article:
${contentStr}

If the article is highly relevant to the niche, output a JSON object:
{ "relevant": true, "summary": "A 2-sentence summary of the core insight", "score": <0-100> }
If not, output:
{ "relevant": false }

Only return valid JSON.`

            try {
              const res = await generateClaudeResponse(prompt, "Evaluate relevance.")
              const parsed = JSON.parse(res)

              if (parsed.relevant && parsed.score > 60) {
                // Save signal
                const expiresAt = new Date()
                expiresAt.setDate(expiresAt.getDate() + 14) // Signals live for 14 days

                const { error: insertError } = await supabaseAdmin
                  .from('signals')
                  .insert({
                    workspace_id: niche.workspace_id,
                    niche_id: niche.id,
                    source_url: article.link || feedUrl,
                    content: parsed.summary,
                    metadata: { original_title: article.title, score: parsed.score },
                    embedding,
                    expires_at: expiresAt.toISOString(),
                  })

                if (!insertError) {
                  totalSignalsAdded++
                }
              }
            } catch (claudeErr) {
              console.error('Claude parsing error:', claudeErr)
            }
          }
        }
      } catch (feedErr) {
        console.error(`Failed to process feed ${feedUrl}:`, feedErr)
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Scraping complete. Added ${totalSignalsAdded} valid signals.` 
    })

  } catch (error: any) {
    console.error('Scraping pipeline failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
