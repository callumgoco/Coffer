import type { Account, Transaction, Budget, Holding, AssetItem, WatchItem, Income, PortfolioSnapshot } from '../../types'
import { supabase } from '../supabase/client'

let cachedUserId: string | null = null

// Keep cache in sync with auth changes
try {
  if (supabase) supabase.auth.onAuthStateChange((_event, session) => {
    cachedUserId = session?.user?.id ?? null
  })
} catch {}

async function getUserId(): Promise<string | null> {
  console.debug('[Supabase] getUserId start')
  if (cachedUserId) {
    console.debug('[Supabase] getUserId from cache')
    return cachedUserId
  }
  // Prefer getSession (fast/local) then fall back to getUser
  const timeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error('getUser timeout')), ms))
  try {
    const sessionRes: any = await Promise.race([
      supabase ? supabase.auth.getSession() : Promise.resolve({ data: { session: null } }),
      timeout(5000),
    ])
    const uid = sessionRes?.data?.session?.user?.id ?? null
    if (uid) {
      cachedUserId = uid
      console.debug('[Supabase] getUserId result via session')
      return uid
    }
  } catch (e) {
    console.debug('[Supabase] getSession failed or timed out', e)
  }
  try {
    const { data, error } = await Promise.race([
      supabase ? supabase.auth.getUser() : Promise.resolve({ data: { user: null } }),
      timeout(5000),
    ]) as any
    console.debug('[Supabase] getUserId result', { hasUser: !!data?.user, error: error ? (error as any).message : null })
    cachedUserId = data?.user?.id ?? null
    return cachedUserId
  } catch (e) {
    console.debug('[Supabase] getUser failed or timed out', e)
    return null
  }
}

async function selectAll(table: string): Promise<any[]> {
  if (!supabase) return []
  const uid = await getUserId()
  if (!uid) return []
  const { data, error } = await supabase.from(table).select('*').eq('user_id', uid)
  if (error) {
    const message = (error as any).message ?? ''
    if (/user_id/.test(message) && /column/i.test(message)) return []
    throw error
  }
  return (data ?? [])
}

export const supabaseService = {
  async getAccounts(): Promise<Account[]> {
    const rows = await selectAll('accounts')
    return rows as Account[]
  },
  async getTransactions(): Promise<Transaction[]> {
    const rows = await selectAll('transactions')
    return rows.map((r: any) => ({
      id: r.id,
      date: r.date,
      merchant: r.merchant ?? '',
      category: r.category ?? '',
      amount: Number(r.amount ?? 0),
      accountId: r.account_id ?? r.accountId ?? '',
      currency: r.currency ?? undefined,
      notes: r.notes ?? undefined,
    }))
  },
  async getBudgets(): Promise<Budget[]> {
    const [budgetsRaw, txRows, accountsRows] = await Promise.all([
      selectAll('budgets'),
      selectAll('transactions'),
      selectAll('accounts'),
    ])
    const accountsById = new Map(accountsRows.map((a: any) => [a.id, a]))
    return budgetsRaw.map((b: any) => {
      const currency = b.currency ?? undefined
      const spent = txRows
        .filter((t: any) => t.category === b.category)
        .filter((t: any) => {
          const acc = accountsById.get(t.account_id ?? t.accountId)
          if (!acc) return false
          return currency ? (acc.currency === currency) : true
        })
        .reduce((sum: number, t: any) => sum + (Number(t.amount ?? 0) < 0 ? -Number(t.amount ?? 0) : 0), 0)
      return {
        id: b.id,
        category: b.category,
        limit: Number(b.limit ?? 0),
        spent,
        currency,
      } as Budget
    })
  },
  async getHoldings(): Promise<Holding[]> {
    const rows = await selectAll('holdings')
    return rows.map((r: any) => ({
      id: r.id,
      symbol: r.symbol,
      quantity: Number(r.quantity ?? 0),
      averageCost: Number(r.average_cost ?? r.averageCost ?? 0),
      lastPrice: r.last_price ?? undefined,
      region: r.region ?? undefined,
      currency: r.currency ?? undefined,
    }))
  },
  async getAssets(): Promise<AssetItem[]> {
    const rows = await selectAll('assets')
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      value: Number(r.value ?? 0),
      currency: r.currency ?? undefined,
      pricePaid: r.price_paid ?? r.pricePaid ?? undefined,
      acquiredOn: r.acquired_on ?? r.acquiredOn ?? undefined,
      notes: r.notes ?? undefined,
      url: r.url ?? r.link ?? undefined,
    }))
  },
  async getWatchlist(): Promise<WatchItem[]> { return (await selectAll('watchlist')) as WatchItem[] },

  async addToWatchlist(symbol: string) {
    if (!supabase) return
    const uid = await getUserId()
    if (!uid) return
    const { error } = await supabase.from('watchlist').upsert({ id: crypto.randomUUID(), symbol, user_id: uid })
    if (error) throw error
  },

  async upsertTransactions(rows: Transaction[]): Promise<void> {
    if (!supabase) return
    const uid = await getUserId()
    if (!uid) return
    const payload = rows.map((t) => ({
      id: t.id,
      date: t.date,
      merchant: t.merchant,
      category: t.category,
      amount: t.amount,
      account_id: t.accountId,
      currency: (t as any).currency ?? null,
      notes: t.notes ?? null,
      user_id: uid,
    }))
    const { error } = await supabase.from('transactions').upsert(payload, { onConflict: 'id' })
    if (error) throw error
  },
  async deleteTransaction(id: string): Promise<void> {
    if (!supabase) return
    const uid = await getUserId()
    if (!uid) return
    const { error } = await supabase.from('transactions').delete().eq('id', id).eq('user_id', uid)
    if (error) throw error
  },
  async upsertBudgets(rows: Budget[]): Promise<void> {
    if (!supabase) return
    const uid = await getUserId()
    if (!uid) return
    const payload = rows.map((b) => ({
      id: b.id,
      category: (b as any).category,
      limit: (b as any).limit ?? (b as any)["limit"],
      currency: (b as any).currency ?? null,
      user_id: uid,
    }))
    const { error } = await supabase.from('budgets').upsert(payload, { onConflict: 'id' })
    if (error) throw error
  },
  async upsertAssets(rows: AssetItem[]): Promise<void> {
    if (!supabase) return
    const uid = await getUserId()
    if (!uid) return
    const payload = rows.map((a) => ({
      id: a.id,
      name: a.name,
      value: a.value,
      currency: (a as any).currency ?? null,
      price_paid: (a as any).pricePaid ?? null,
      acquired_on: (a as any).acquiredOn ?? null,
      notes: (a as any).notes ?? null,
      url: (a as any).url ?? null,
      user_id: uid,
    }))
    const { error } = await supabase.from('assets').upsert(payload, { onConflict: 'id' })
    if (error) {
      const code = (error as any).code
      const message = (error as any).message ?? ''
      if (code === 'PGRST204' || /(currency|price_paid|acquired_on|notes|url)/.test(message)) {
        const fallback = rows.map((a) => ({ id: a.id, name: a.name, value: a.value, user_id: uid }))
        const { error: err2 } = await supabase.from('assets').upsert(fallback, { onConflict: 'id' })
        if (err2) throw err2
        return
      }
      throw error
    }
  },
  async deleteAsset(id: string): Promise<void> {
    if (!supabase) return
    const uid = await getUserId()
    if (!uid) return
    const { error } = await supabase.from('assets').delete().eq('id', id).eq('user_id', uid)
    if (error) throw error
  },

  async upsertHoldings(rows: Holding[]): Promise<void> {
    if (!supabase) return
    const uid = await getUserId()
    if (!uid) throw new Error('Not signed in')
    console.debug('[Supabase] upsertHoldings payload', rows, 'uid', uid)
    const payload = rows.map((h) => ({
      id: h.id,
      symbol: h.symbol,
      quantity: h.quantity,
      average_cost: h.averageCost,
      region: (h as any).region ?? null,
      currency: (h as any).currency ?? null,
      user_id: uid,
    }))
    console.debug('[Supabase] upsertHoldings sending', { table: 'holdings', payload })
    const { error } = await supabase.from('holdings').upsert(payload, { onConflict: 'id' })
    console.debug('[Supabase] upsertHoldings done')
    if (error) console.error('[Supabase] upsertHoldings error', error)
    if (error) throw error
  },

  async deleteHolding(id: string): Promise<void> {
    if (!supabase) return
    const uid = await getUserId()
    if (!uid) return
    const { error } = await supabase.from('holdings').delete().eq('id', id).eq('user_id', uid)
    if (error) throw error
  },

  async getIncomes(): Promise<Income[]> {
    const rows = await selectAll('incomes')
    return rows.map((r: any) => ({
      id: r.id,
      date: r.date,
      source: r.source,
      amount: Number(r.amount ?? 0),
      currency: r.currency,
    }))
  },
  async upsertIncomes(rows: Income[]): Promise<void> {
    if (!supabase) return
    const uid = await getUserId()
    if (!uid) return
    const payload = rows.map((i) => ({ id: i.id, date: i.date, source: i.source, amount: i.amount, currency: i.currency, user_id: uid }))
    const { error } = await supabase.from('incomes').upsert(payload, { onConflict: 'id' })
    if (error) throw error
  },
  async deleteIncome(id: string): Promise<void> {
    if (!supabase) return
    const uid = await getUserId()
    if (!uid) return
    const { error } = await supabase.from('incomes').delete().eq('id', id).eq('user_id', uid)
    if (error) throw error
  },

  async updateHoldingPrice(symbol: string, lastPrice: number): Promise<void> {
    if (!supabase) return
    const uid = await getUserId()
    if (!uid) return
    const { error } = await supabase.from('holdings').update({ last_price: lastPrice }).eq('symbol', symbol).eq('user_id', uid)
    if (error) throw error
  },

  async getPortfolioSnapshots(): Promise<PortfolioSnapshot[]> {
    if (!supabase) return []
    const uid = await getUserId()
    if (!uid) return []
    const { data: rows, error } = await supabase.from('portfolio_snapshots').select('*').eq('user_id', uid).order('date', { ascending: true })
    if (error) throw error
    return (rows ?? []).map((r: any) => ({
      id: r.id,
      date: r.date,
      value: Number(r.value ?? 0),
      currency: r.currency,
      bookCost: r.book_cost ?? r.bookCost ?? undefined,
      unrealized: r.unrealized ?? undefined,
      pnl: r.pnl ?? undefined,
    }))
  },

  async upsertPortfolioSnapshots(rows: PortfolioSnapshot[]): Promise<void> {
    if (!supabase) return
    const uid = await getUserId()
    if (!uid) return
    const payload = rows.map((s) => ({
      id: s.id,
      date: s.date,
      value: s.value,
      currency: s.currency,
      book_cost: (s as any).bookCost ?? null,
      unrealized: (s as any).unrealized ?? null,
      pnl: (s as any).pnl ?? null,
      user_id: uid,
    }))
    const { error } = await supabase.from('portfolio_snapshots').upsert(payload, { onConflict: 'id' })
    if (error) throw error
  },
}


