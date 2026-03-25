import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  // ── First thing: verify CRON_SECRET ──────────────────────────
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn('Unauthorized cron cleanup attempt', { ip: request.headers.get('x-forwarded-for') })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Delete expired signals (90-day rolling window)
    const { data: deleted, error } = await supabaseAdmin
      .from('signals')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id')

    if (error) {
      console.error('Cleanup failed:', error)
      return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      deleted: deleted?.length ?? 0,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Cron cleanup failed:', error)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}
