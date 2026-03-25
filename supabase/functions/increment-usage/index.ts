// supabase/functions/increment-usage/index.ts
// Note: The actual increment_usage logic is implemented as a PostgreSQL
// SECURITY DEFINER function in 003_functions.sql.
// API routes call: supabaseAdmin.rpc('increment_usage', { ... })
// This keeps usage write logic in the DB, not duplicated across routes.
//
// This Edge Function is a fallback/alternative interface if needed.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  try {
    const { workspace_id, action_type, month } = await req.json()

    if (!workspace_id || !action_type || !month) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: workspace_id, action_type, month' }),
        { status: 400 }
      )
    }

    const { error } = await supabase.rpc('increment_usage', {
      p_workspace_id: workspace_id,
      p_action_type: action_type,
      p_month: month,
    })

    if (error) {
      console.error('Usage increment failed:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (err) {
    console.error('Usage increment error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 })
  }
})
