import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { userRatelimit, ipRatelimit } from '@/lib/ratelimit'
import { extractBrandVoiceFromPDF, extractBrandVoiceFromText } from '@/lib/claude'
import FileType from 'file-type'

const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword',  // .doc
  'text/plain',
])

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export async function POST(request: NextRequest) {
  // ── 1. Auth ──────────────────────────────────────────────────
  const supabase = createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── 2. Rate limit ────────────────────────────────────────────
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const [userLimit, ipLimit] = await Promise.all([
    userRatelimit.limit(user.id), ipRatelimit.limit(ip),
  ])
  if (!userLimit.success || !ipLimit.success)
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 })

  // ── 3. Parse multipart form ──────────────────────────────────
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 400 })

  // ── 4. Validate MIME bytes server-side ───────────────────────
  const buffer = Buffer.from(await file.arrayBuffer())
  const detected = await FileType.fromBuffer(buffer)
  const mime = detected?.mime ?? 'text/plain'

  // Allow .txt (no magic bytes) but block everything else unexpected
  if (detected && !ALLOWED_MIMES.has(mime))
    return NextResponse.json({ error: 'Unsupported file type. Please upload a PDF, DOCX, or TXT file.' }, { status: 400 })

  // ── 5. Workspace ─────────────────────────────────────────────
  const { data: workspace } = await supabase
    .from('workspaces').select('id').eq('user_id', user.id).order('created_at').limit(1).single()
  if (!workspace)
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

  // ── 6. Subscription ──────────────────────────────────────────
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions').select('plan, trial_ends_at').eq('workspace_id', workspace.id).single()
  if (!subscription)
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })

  if (subscription.plan === 'trial' && new Date(subscription.trial_ends_at!) < new Date())
    return NextResponse.json({ error: 'Trial expired.' }, { status: 403 })

  // ── 7. Extract text from file ────────────────────────────────
  try {
    let profile = ''

    if (mime === 'application/pdf') {
      // Use Claude's native PDF beta support
      const pdfBase64 = buffer.toString('base64')
      profile = await extractBrandVoiceFromPDF(pdfBase64)

    } else if (
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      (mime as string) === 'application/msword'
    ) {
      // Extract text from DOCX using mammoth
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      const text = result.value?.trim()
      if (!text) return NextResponse.json({ error: 'Could not extract text from document.' }, { status: 400 })
      profile = await extractBrandVoiceFromText(text)

    } else {
      // Plain text
      const text = buffer.toString('utf-8').trim()
      if (!text) return NextResponse.json({ error: 'File appears to be empty.' }, { status: 400 })
      profile = await extractBrandVoiceFromText(text)
    }

    if (!profile)
      return NextResponse.json({ error: 'Could not extract brand voice from file.' }, { status: 500 })

    // ── 8. Save to brand_voice_profiles ─────────────────────────
    const { data: existing } = await supabaseAdmin
      .from('brand_voice_profiles')
      .select('id')
      .eq('workspace_id', workspace.id)
      .maybeSingle()

    if (existing) {
      await supabaseAdmin
        .from('brand_voice_profiles')
        .update({ content: profile, source: 'upload', updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await supabaseAdmin
        .from('brand_voice_profiles')
        .insert({ workspace_id: workspace.id, content: profile, source: 'upload' })
    }

    return NextResponse.json({ profile })

  } catch (error: any) {
    console.error('Brand voice upload failed', error)
    return NextResponse.json({ error: 'Processing failed. Please try again.' }, { status: 500 })
  }
}
