// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.5"

type Holding = {
  id: string
  user_id: string
  symbol: string
  quantity: number
  average_cost: number
  last_price?: number | null
  currency?: string | null
}

type Rates = Record<string, number>

function convertAmount(amount: number, from: string, to: string, rates: Rates | null): number {
  const f = (from || to || '').toUpperCase()
  const t = (to || '').toUpperCase()
  if (!amount || f === t) return amount
  if (!rates || !rates[f] || !rates[t]) return amount
  // Normalize to USD-like base using provided rates
  const baseAmount = amount / rates[f]
  return baseAmount * rates[t]
}

async function fetchRates(base: string, apiKey?: string): Promise<Rates | null> {
  try {
    if (!apiKey) return null
    const res = await fetch(`https://api.freecurrencyapi.com/v1/latest?apikey=${encodeURIComponent(apiKey)}&base_currency=${encodeURIComponent(base)}`)
    if (!res.ok) return null
    const json: any = await res.json()
    const data = json?.data
    if (data && typeof data === 'object') {
      // freecurrencyapi returns map of target->rate when base=base
      const rates: Rates = { [base.toUpperCase()]: 1 }
      for (const [k, v] of Object.entries(data)) rates[String(k).toUpperCase()] = Number(v)
      return rates
    }
    return null
  } catch (_) { return null }
}

serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Missing Supabase env' }), { status: 500 })
    }
    const DEFAULT_BASE = (Deno.env.get('BASE_CURRENCY_DEFAULT') ?? 'GBP').toUpperCase()
    const FREECURRENCY_API_KEY = Deno.env.get('FREECURRENCY_API_KEY') ?? undefined

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const today = new Date().toISOString().slice(0, 10)

    // Optional: per-user base currency from profiles table
    const { data: users, error: usersErr } = await supabase
      .from('holdings')
      .select('user_id')
      .neq('user_id', null)
      .order('user_id', { ascending: true })
    if (usersErr) throw usersErr
    const userIds = Array.from(new Set((users ?? []).map((u: any) => u.user_id))).filter(Boolean)

    let ratesCache: Record<string, Rates | null> = {}

    let written = 0
    for (const uid of userIds) {
      // Resolve base currency per user (fallback to DEFAULT_BASE)
      let baseCurrency = DEFAULT_BASE
      try {
        const { data: profile } = await supabase.from('profiles').select('base_currency').eq('id', uid).maybeSingle()
        if (profile?.base_currency) baseCurrency = String(profile.base_currency).toUpperCase()
      } catch (_) {}

      // Read holdings for user
      const { data: holdings, error: holdErr } = await supabase
        .from('holdings')
        .select('id,symbol,quantity,average_cost,last_price,currency,user_id')
        .eq('user_id', uid)
      if (holdErr) continue

      const list = (holdings ?? []) as Holding[]
      if (list.length === 0) continue

      // Load FX rates once per base currency
      if (!(baseCurrency in ratesCache)) {
        ratesCache[baseCurrency] = await fetchRates(baseCurrency, FREECURRENCY_API_KEY)
      }
      const rates = ratesCache[baseCurrency]

      let totalCurrent = 0
      let totalCost = 0
      for (const h of list) {
        const curr = (h.currency ?? baseCurrency).toUpperCase()
        const currentNative = Number.isFinite(h.last_price ?? NaN) && (h.last_price ?? 0) > 0
          ? (h.last_price as number) * h.quantity
          : h.average_cost * h.quantity
        const costNative = h.average_cost * h.quantity
        totalCurrent += convertAmount(currentNative, curr, baseCurrency, rates)
        totalCost += convertAmount(costNative, curr, baseCurrency, rates)
      }
      const unrealized = totalCurrent - totalCost

      // Upsert snapshot for today (idempotent per user_id+date)
      const id = crypto.randomUUID()
      const payload = { id, user_id: uid, date: today, value: totalCurrent, currency: baseCurrency, book_cost: totalCost, unrealized, pnl: unrealized }
      const { error: upErr } = await supabase.from('portfolio_snapshots').upsert(payload, { onConflict: 'user_id,date' })
      if (!upErr) written++
    }

    return new Response(JSON.stringify({ ok: true, written }), { headers: { 'content-type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), { status: 500 })
  }
})


