# CLAUDE.md — PulseLoop Build Instructions

> Read this file first, then read PRD.md before writing any code.
> All decisions here are final. Do not deviate without explicit instruction.

---

## QUICK SECURITY CHECKLIST

Run through this before completing ANY file, route, or module:

```
□ 1. Touches a secret key?          → import 'server-only' as first line
□ 2. AI generation route?           → Apply userRatelimit AND ipRatelimit both
□ 3. Cron route?                    → Check CRON_SECRET header before anything else
□ 4. Webhook route?                 → Verify HMAC signature before reading body
□ 5. Writes subscription/plan?      → supabaseAdmin only — never user client
□ 6. Writes usage_logs?             → supabaseAdmin.rpc('increment_usage') only
□ 7. Accepts file uploads?          → Validate MIME bytes server-side (file-type lib)
□ 8. Calls Claude?                  → Prompt injection data boundary in system prompt
□ 9. Queries DB with user input?    → .eq() client only — never string concatenation
□ 10. Runs as service role?         → Must be in /app/api/ not /components/
□ 11. Creates a user account?       → IP-based signup rate limit before creation
□ 12. Handles payment intent?       → Backend creates checkout URL — frontend redirects only
□ 13. Sends email?                  → lib/email.ts (server-only) only
□ 14. Reads from storage?           → Private bucket + RLS policy enforced
```

---

## 1. What You Are Building

**PulseLoop** — weekly Market Intelligence OS for French and EU B2B SaaS consultants and agencies. 18 EU-focused signal sources → trend reports, dashboards, signal briefs, newsletters, LinkedIn posts — all in brand voice, all cited.

**Full spec:** `PRD.md` — read for every product decision not covered here.

---

## 2. Tech Stack

```
Frontend:    Next.js 14 (App Router) + Tailwind CSS
Backend:     Next.js API Routes (serverless, Vercel)
Database:    Supabase PostgreSQL — EU Frankfurt ONLY. Never US region.
Vector:      Supabase pgvector
Auth:        Supabase Auth (email/password)
Embeddings:  Gemini 2.5 Flash-Lite — SERVER-ONLY (lib/gemini.ts)
AI:          Claude API — SERVER-ONLY (lib/claude.ts)
             Beta: claude-haiku-4-5  |  Paid: claude-sonnet-4-6
Payments:    Lemon Squeezy — SERVER-ONLY (lib/payments.ts)
Email:       Resend API — SERVER-ONLY (lib/email.ts)
Hosting:     Vercel
Rate limit:  Upstash Redis — user-level AND ip-level both required
Admin:       Supabase Edge Functions (cleanup, usage writes, digest email)
```

### npm packages
```bash
npm install @supabase/supabase-js @supabase/ssr
npm install @anthropic-ai/sdk
npm install @google/generative-ai
npm install @upstash/ratelimit @upstash/redis
npm install resend
npm install axios cheerio rss-parser
npm install zod date-fns
npm install file-type          # server-side MIME validation — NOT mime-types
npm install server-only        # prevents client bundle leaks
```

---

## 3. File Structure

> **Design System:** `PulseLoop-Design-System.docx` is the master UI reference.
> Read it before building any UI component, page, or layout. Docx wins over this file on conflicts.

```
/
├── app/
│   ├── (auth)/login/page.tsx  |  signup/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx           ← Shell: sidebar + topbar
│   │   ├── overview/  niches/  reports/[id]/
│   │   ├── signal-briefs/  newsletters/  linkedin/
│   │   ├── dashboards/[id]/  brand-voice/  sources/  settings/
│   ├── api/
│   │   ├── scrape/[nicheId]/route.ts
│   │   ├── rag-query/  trend-report/  signal-brief/
│   │   ├── newsletter-builder/  linkedin-posts/
│   │   ├── dashboard/generate/  [id]/revoke/  [id]/visual/
│   │   ├── brand-voice/  payments/create-checkout/
│   │   ├── cron/scrape/  cron/cleanup/          ← CRON_SECRET protected
│   │   ├── webhooks/lemon-squeezy/route.ts      ← HMAC verified
│   │   └── auth/signup/route.ts                 ← IP rate limited
│   └── share/brief/[shareId]/  dashboard/[shareId]/  ← public, no auth
├── lib/
│   ├── supabase/client.ts  server.ts  admin.ts
│   ├── claude.ts  gemini.ts  email.ts  payments.ts
│   ├── rag.ts  ratelimit.ts  plans.ts  crypto.ts  validation.ts
├── components/layout/  components/ui/
├── supabase/migrations/001–004  |  functions/
├── designs/          ← READ ONLY HTML reference files
├── PRD.md
├── PulseLoop-Design-System.docx
├── CLAUDE.md         ← This file
├── PATTERNS.md       ← Full code patterns: lib files, API route template, cron, webhooks, upload, RAG
└── SCHEMA.md         ← Full SQL migrations 001–004 + environment variables
```

---

## 4. Core Rules (read PATTERNS.md for full implementations)

### server-only
Every lib file touching a secret key: `import 'server-only'` as **first line**.
Applies to: `lib/claude.ts`, `lib/gemini.ts`, `lib/email.ts`, `lib/payments.ts`, `lib/supabase/admin.ts`, `lib/rag.ts`, `lib/ratelimit.ts`, `lib/crypto.ts`

### Two Supabase Clients — Never Mix

| Operation | Client | Why |
|---|---|---|
| Read user's workspace/niches | `createSupabaseServerClient()` | RLS enforces ownership |
| Read/write subscriptions | `supabaseAdmin` | Users must never write plan |
| Write usage_logs | `supabaseAdmin.rpc('increment_usage')` | Users must never write counts |
| Write signals/reports/briefs | `supabaseAdmin` | Generation pipeline |
| Public share page | `supabaseAdmin` | Bypass auth check |

### Ownership Verification
When a user sends any ID, always verify it belongs to their workspace:
```typescript
// ✅ Always include workspace check
.eq('id', body.reportId).eq('workspace_id', workspace.id)
// ❌ Never trust an ID alone
.eq('id', body.reportId)
```

### Plan Limits — Single Source of Truth
All limits live in `lib/plans.ts`. See PATTERNS.md for full `PLAN_LIMITS` constant.

---

## 5. Standard API Route — 11-Step Pattern

Every route must follow these steps in order. Full template in PATTERNS.md.

1. Auth — `createSupabaseServerClient()` + `getUser()`
2. Rate limit — `userRatelimit` AND `ipRatelimit` both
3. Validate body — Zod schema
4. Load workspace — user client
5. Load subscription — **admin client**
6. Check trial expiry
7. Verify resource ownership
8. Check plan limits via admin
9. Load brand voice
10. RAG + Claude (server-only libs)
11. Save via admin + increment usage via `rpc('increment_usage')`

---

## 6. Plan Limits Summary

| Feature | trial | starter | pro | agency |
|---|---|---|---|---|
| Workspaces | 1 | 1 | 1 | 5 |
| Niches | 3 | 3 | 7 | 5/ws |
| Reports/mo | 12 | 4 | 12 | 12/ws |
| Signal Briefs | 12 | 0 (locked) | 12 | 12/ws |
| Newsletters | 4 | 0 | 4 | 4/ws |
| Dashboards | 12 | 0 | 12 | ∞ |
| Scrape interval | 2h | 6h | 2h | 1h |
| Private upload | ❌ | ❌ | ❌ | ✅ |
| White-label | ❌ | ❌ | ❌ | ✅ |

---

## 7. What NOT to Build in V1

If asked, respond: *"This is V2 — not in scope per PRD.md"*

Outreach Writer · Lead Magnet · Prospect Management · Chrome Extension · TikTok/Instagram scraping · Power BI live connection · Full dashboard design editing · Posthog · Sentry · À la carte overage

---

## 8. Pre-Deploy Security Checklist

```bash
# 1. No secret keys in browser bundle
grep -r "sk-ant-\|AIza\|re_\|SERVICE_ROLE\|LMSQ" .next/static/ 2>/dev/null \
  && echo "❌ KEY LEAK DETECTED — DO NOT DEPLOY" || echo "✅ Bundle clean"

# 2. No service role key in frontend files
grep -rn "SERVICE_ROLE_KEY" ./app --include="*.tsx" --include="*.ts" | grep -v "/api/" \
  && echo "❌ SERVICE_ROLE_KEY in wrong location" || echo "✅ OK"

# 3. server-only in all sensitive libs
for f in lib/claude.ts lib/gemini.ts lib/email.ts lib/payments.ts lib/supabase/admin.ts lib/rag.ts lib/ratelimit.ts lib/crypto.ts; do
  head -1 $f | grep -q "server-only" && echo "✅ $f" || echo "❌ MISSING: $f"
done

# 4. .env not in git
git ls-files | grep "\.env" && echo "❌ ENV IN GIT" || echo "✅ OK"

# 5. Build succeeds
npm run build
```

Manual checks:
- [ ] Supabase region = EU Frankfurt
- [ ] `reports` storage bucket = PRIVATE
- [ ] All RLS policies enabled
- [ ] `increment_usage` function deployed
- [ ] `nightly-signal-cleanup` pg_cron scheduled
- [ ] Anthropic spending limit $20/mo
- [ ] Upstash budget limit $5/mo
- [ ] Vercel Attack Protection enabled
- [ ] Lemon Squeezy webhook URL + HMAC secret configured
- [ ] `CRON_SECRET` set in Vercel env

---

*PulseLoop · CLAUDE.md · March 2026*
*Security is not a feature — it is the foundation. Build it right the first time.*
