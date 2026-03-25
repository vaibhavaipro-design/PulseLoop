// supabase/functions/nightly-cleanup/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async () => {
  const { data, error } = await supabase
    .from('signals')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id')

  if (error) {
    console.error('Nightly cleanup failed:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  console.log(`Nightly cleanup: deleted ${data?.length ?? 0} expired signals`)
  return new Response(JSON.stringify({ success: true, deleted: data?.length ?? 0 }), { status: 200 })
})
