/* eslint-disable */
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.5"

type Table = { name: string; userColumn: string }

const USER_TABLES: Table[] = [
  { name: 'transactions', userColumn: 'user_id' },
  { name: 'budgets', userColumn: 'user_id' },
  { name: 'assets', userColumn: 'user_id' },
  { name: 'holdings', userColumn: 'user_id' },
  { name: 'watchlist', userColumn: 'user_id' },
  { name: 'incomes', userColumn: 'user_id' },
  { name: 'portfolio_snapshots', userColumn: 'user_id' },
]

serve(async (req) => {
  try {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    }
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })

    // SUPABASE_URL is provided by the Edge runtime
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    // SERVICE_ROLE_KEY must be provided via function secret (reserved prefix SUPABASE_ is blocked by CLI)
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Missing Supabase env' }), { status: 500, headers: corsHeaders })
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get auth user from session
    const auth = req.headers.get('Authorization')
    if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }
    const jwt = auth.split(' ')[1]
    const { data: userData } = await supabaseAdmin.auth.getUser(jwt)
    let userId = userData?.user?.id ?? null
    if (!userId) {
      try {
        const b64 = jwt.split('.')[1]
        const json = atob(b64.replace(/-/g, '+').replace(/_/g, '/'))
        const claims = JSON.parse(json)
        userId = claims?.sub ?? null
      } catch (_) {}
    }
    if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    // Delete all user-owned rows across tables; ignore errors per-table to be resilient
    for (const t of USER_TABLES) {
      try {
        await supabaseAdmin.from(t.name).delete().eq(t.userColumn, userId)
      } catch (_) {}
    }

    // Delete profile row
    try { await supabaseAdmin.from('profiles').delete().eq('id', userId) } catch (_) {}

    // Finally, delete the auth user itself
    try { await supabaseAdmin.auth.admin.deleteUser(userId) } catch (e) {
      // If this fails, still report cleanup status
      console.error('delete auth user failed', e)
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json', ...corsHeaders } })
  } catch (e) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    }
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), { status: 500, headers: corsHeaders })
  }
})


