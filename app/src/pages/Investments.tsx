import Card from '../components/Card'
import { Metric } from '../components/Metric'
import PageHeader from '../components/PageHeader'
import { useHoldings, usePortfolioSnapshots } from '../hooks/useData'
import { useEffect, useMemo, useState } from 'react'
import Modal from '../components/Modal'
import { fmp, alphaVantage } from '../services/marketData/provider'
import { queryClient } from '../services/queryClient'
import { service } from '../services/adapters'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import EmptyState from '../components/EmptyState'
import { PencilIcon } from '../components/icons'
import Skeleton from '../components/Skeleton'
import { formatMoney } from '../utils/money'
import { useCurrencyStore } from '../stores/currency'
import { useRates, convertAmount } from '../services/currency/rates'

export default function InvestmentsPage() {
  const { data, isLoading } = useHoldings()
  const { data: snapshots } = usePortfolioSnapshots()
  const { baseCurrency } = useCurrencyStore()
  const { data: rates } = useRates(baseCurrency)
  // watchlist UI removed; keep placeholder to avoid breaking layout
  // const { data: watchlist } = { data: [] as any }
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Array<{ symbol: string; name: string; region: string; currency?: string }>>([])
  const [searching, setSearching] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selectedResult, setSelectedResult] = useState<{ symbol: string; name: string; region: string; currency?: string } | null>(null)

  const [addOpen, setAddOpen] = useState(false)
  const [draftQty, setDraftQty] = useState<number>(0)
  const [draftCost, setDraftCost] = useState<number>(0)
  const [draftCurrency, setDraftCurrency] = useState<string>('USD')
  const [addError, setAddError] = useState<string | null>(null)
  const [adding, setAdding] = useState<boolean>(false)

  // Edit holding state
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<string>('')
  const [editSymbol, setEditSymbol] = useState<string>('')
  const [editQty, setEditQty] = useState<number>(0)
  const [editCost, setEditCost] = useState<number>(0)
  const [editCurrency, setEditCurrency] = useState<string>('USD')
  const [editRegion, setEditRegion] = useState<string | undefined>(undefined)
  const [editError, setEditError] = useState<string | null>(null)

  // Lightweight toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2500)
  }

  // Portfolio chart state
  type Timeframe = '1M' | '3M' | '6M' | '1Y'
  type Resolution = 'D' | 'W' | 'M'
  const [timeframe, setTimeframe] = useState<Timeframe>('3M')
  const [resolution, setResolution] = useState<Resolution>('D')
  const [seriesLoading, setSeriesLoading] = useState(false)
  const [portfolioSeries, setPortfolioSeries] = useState<Array<{ date: string; value: number }>>([])

  // function onSearchChange(value: string) {
  //   setQuery(value)
  // }

  async function runSearch() {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults([])
      setRateLimited(false)
      setSearching(false)
      setSearchError(null)
      return
    }
    setSearching(true)
    setRateLimited(false)
    setSearchError(null)
    const useFmp = Boolean(import.meta.env.VITE_FMP_API_KEY)
    const r: any = useFmp ? await fmp.searchSymbols(trimmed) : await alphaVantage.searchSymbols(trimmed)
    setResults(r.results)
    setRateLimited(Boolean(r.rateLimited))
    setSearchError(r.error ?? null)
    setSearching(false)
  }

  // async function onAdd(symbol: string) {
  //   await service.addToWatchlist?.(symbol)
  //   queryClient.invalidateQueries({ queryKey: ['watchlist'] })
  //   setQuery('')
  //   setResults([])
  // }

  // Compute overview metrics
  const { totalCost, totalCurrent, totalPnL, dailyPct } = useMemo(() => {
    const holdings = data ?? []
    const totalCostLocal = holdings.reduce((s, h) => s + convertAmount(h.averageCost * h.quantity, (h as any).currency ?? baseCurrency, baseCurrency, rates), 0)
    const totalCurrentLocal = holdings.reduce((s, h) => s + convertAmount((((h as any).lastPrice ?? h.averageCost) * h.quantity), (h as any).currency ?? baseCurrency, baseCurrency, rates), 0)
    const pnlLocal = totalCurrentLocal - totalCostLocal
    const last = portfolioSeries[portfolioSeries.length - 1]?.value
    const prev = portfolioSeries[portfolioSeries.length - 2]?.value
    const dailyPctLocal = last != null && prev != null && prev !== 0 ? ((last - prev) / prev) * 100 : 0
    return { totalCost: totalCostLocal, totalCurrent: totalCurrentLocal, totalPnL: pnlLocal, dailyPct: dailyPctLocal }
  }, [data, baseCurrency, rates, portfolioSeries])

  // Load and aggregate historical series for the portfolio (prefer persisted snapshots)
  useEffect(() => {
    // If snapshots exist, filter to timeframe and convert currency if needed
    if (Array.isArray(snapshots) && snapshots.length > 0) {
      const daysMap: Record<Timeframe, number> = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365 }
      const rangeDays = daysMap[timeframe]
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - rangeDays - 2)
      const cutoffStr = cutoff.toISOString().slice(0, 10)
      const filtered = snapshots
        .filter(s => s.date >= cutoffStr)
        .map(s => ({ date: s.date, value: convertAmount(s.value, (s as any).currency ?? baseCurrency, baseCurrency, rates) }))
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      setPortfolioSeries(filtered)
      return
    }
    const holdings = Array.isArray(data) ? (data as Array<any>) : []
    if (!holdings.length) { setPortfolioSeries([]); return }
    const useFmp = Boolean(import.meta.env.VITE_FMP_API_KEY)
    const provider = useFmp ? fmp : alphaVantage
    const daysMap: Record<Timeframe, number> = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365 }
    const rangeDays = daysMap[timeframe]
    let cancelled = false
    async function load() {
      setSeriesLoading(true)
      try {
        const uniqueSymbols = Array.from(new Set(holdings.map(h => h.symbol)))
        const bySymbol = new Map<string, Array<{ date: string; close: number }>>()
        const results = await Promise.all(uniqueSymbols.map(sym => provider.getDailySeries(sym, rangeDays)))
        uniqueSymbols.forEach((sym, i) => bySymbol.set(sym, results[i] ?? []))

        // Build union date set
        const dateSet = new Set<string>()
        for (const arr of bySymbol.values()) for (const p of arr) dateSet.add(p.date)
        // Ensure dates are within range and sorted
        const dates = Array.from(dateSet)
          .filter(Boolean)
          .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))

        // Prepare pointers for carry-forward close
        const pointers: Record<string, number> = {}
        const arrays: Record<string, Array<{ date: string; close: number }>> = {}
        for (const h of holdings) {
          const arr = bySymbol.get(h.symbol) ?? []
          arrays[h.symbol] = arr
          pointers[h.symbol] = 0
        }

        const aggregated: Array<{ date: string; value: number }> = []
        for (const d of dates) {
          let valueThisDate = 0
          for (const h of holdings) {
            const sym = h.symbol
            const arr = arrays[sym]
            if (!arr || arr.length === 0) {
              // Fallback to averageCost if no series
              const fallback = convertAmount(h.averageCost * h.quantity, (h as any).currency ?? baseCurrency, baseCurrency, rates)
              valueThisDate += fallback
              continue
            }
            let idx = pointers[sym]
            while (idx + 1 < arr.length && arr[idx + 1].date <= d) idx++
            pointers[sym] = idx
            const close = arr[idx]?.date <= d ? arr[idx]?.close : arr[0]?.close
            const holdingValueNative = (Number.isFinite(close) ? close : h.averageCost) * h.quantity
            const holdingValue = convertAmount(holdingValueNative, (h as any).currency ?? baseCurrency, baseCurrency, rates)
            valueThisDate += holdingValue
          }
          aggregated.push({ date: d, value: valueThisDate })
        }

        // Downsample per resolution
        let sampled = aggregated
        if (resolution === 'W') {
          const out: typeof aggregated = []
          let lastPicked: string | null = null
          for (const p of aggregated) {
            if (!lastPicked) { out.push(p); lastPicked = p.date; continue }
            const lastDate = new Date(lastPicked)
            const curr = new Date(p.date)
            const diffDays = Math.floor((curr.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
            if (diffDays >= 7) { out.push(p); lastPicked = p.date }
          }
          sampled = out
        } else if (resolution === 'M') {
          const byMonth = new Map<string, { date: string; value: number }>()
          for (const p of aggregated) {
            const key = p.date.slice(0, 7)
            // keep last entry of the month
            byMonth.set(key, p)
          }
          sampled = Array.from(byMonth.values()).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
        }

        if (!cancelled) setPortfolioSeries(sampled)
      } catch (e) {
        if (!cancelled) setPortfolioSeries([])
      } finally {
        if (!cancelled) setSeriesLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [data, timeframe, resolution, baseCurrency, rates])
  return (
    <>
      <PageHeader
        title="Investments"
        actions={(
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button className="btn btn-sm btn-primary" onClick={() => setAddOpen(true)}>Add Stock</button>
            <button className="btn btn-sm" onClick={async ()=>{
              const syms = Array.from(new Set((data ?? []).map(h => h.symbol)))
              console.debug('[Investments] Refresh prices for symbols', syms)
              const useFmp = Boolean(import.meta.env.VITE_FMP_API_KEY)
              const timeout = (ms: number) => new Promise((_, reject)=>setTimeout(()=>reject(new Error('timeout')), ms))
              await Promise.all(syms.map(async (s) => {
                try {
                  let q = useFmp ? await fmp.getQuote(s) : await alphaVantage.getQuote(s)
                  if (!(Number.isFinite(q.price) && q.price > 0)) {
                    const fallback = useFmp ? await alphaVantage.getQuote(s) : await fmp.getQuote(s)
                    if (Number.isFinite(fallback.price) && fallback.price > 0) q = fallback
                  }
                  console.debug('[Investments] Quote result', s, q)
                  if (Number.isFinite(q.price) && q.price > 0) {
                    await Promise.race([
                      (service.updateHoldingPrice?.(s, q.price) as any),
                      timeout(8000),
                    ])
                  }
                } catch (e) {
                  console.error('[Investments] Failed to refresh price for', s, e)
                }
              }))
              queryClient.invalidateQueries({ queryKey: ['holdings'] })
            }}>Refresh prices</button>
          </div>
        )}
      />
      {toast ? (
        <div className={`fixed right-4 top-20 z-[60] card px-3 py-2 text-sm ${toast.type === 'success' ? 'text-success' : 'text-danger'}`}>
          {toast.message}
        </div>
      ) : null}
      <Card className="mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="Total value" value={formatMoney(totalCurrent, baseCurrency)} />
        <Metric label="Book cost" value={formatMoney(totalCost, baseCurrency)} />
        <Metric label="Unrealized gains" value={`${totalPnL >= 0 ? '+' : '−'}${formatMoney(Math.abs(totalPnL), baseCurrency)}`} />
        <Metric label="Daily change" value={`${dailyPct >= 0 ? '+' : '−'}${Math.abs(dailyPct).toFixed(2)}%`} />
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-medium">Portfolio value</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 flex-nowrap">
              {(['1M','3M','6M','1Y'] as any).map((tf: '1M'|'3M'|'6M'|'1Y') => (
                <button key={tf} className={`btn btn-sm ${timeframe === tf ? 'btn-primary' : ''}`} onClick={() => setTimeframe(tf)}>{tf}</button>
              ))}
            </div>
            <select className="input input-sm" value={resolution} onChange={e=>setResolution(e.target.value as any)}>
              <option value="D">Daily</option>
              <option value="W">Weekly</option>
              <option value="M">Monthly</option>
            </select>
          </div>
        </div>
        <div className="h-64">
          {isLoading || seriesLoading ? (
            <div className="h-full flex items-center justify-center"><Skeleton className="h-6 w-40 rounded" /></div>
          ) : (data ?? []).length === 0 ? (
            <EmptyState title="No holdings" hint="Add holdings to see your portfolio chart." />
          ) : portfolioSeries.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-subtle">No chart data</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={portfolioSeries}>
                <CartesianGrid stroke="rgb(var(--muted))" strokeOpacity={0.2} />
                <XAxis dataKey="date" stroke="currentColor" tick={{ fill: 'currentColor' }} tickFormatter={(d:any)=>String(d).slice(5)} minTickGap={24} />
                <YAxis stroke="currentColor" tick={{ fill: 'currentColor' }} tickFormatter={(v:any)=>formatMoney(Number(v)||0, baseCurrency)} width={80} />
                <Tooltip contentStyle={{ background: 'rgb(var(--card))', border: '1px solid rgb(var(--border))' }} formatter={(v:any)=>formatMoney(Number(v)||0, baseCurrency)} labelFormatter={(d:any)=>new Date(d).toLocaleDateString()} />
                <Line type="monotone" dataKey="value" stroke="rgb(var(--accent))" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        {(data ?? []).map(h => {
          const currentNative = (((h as any).lastPrice ?? h.averageCost) * h.quantity)
          const current = convertAmount(currentNative, (h as any).currency ?? baseCurrency, baseCurrency, rates)
          return (
            <Metric key={h.id} label={`${h.symbol} · ${((h as any).currency ?? '')}`} value={formatMoney(current, baseCurrency)} />
          )
        })}
      </div>
      <div className="mt-4">
        {isLoading ? (
          <div className="space-y-2">
            <div className="hidden md:grid md:grid-cols-8 items-center border-b border-border pb-2 text-xs text-subtler gap-2">
              <div>Symbol</div>
              <div>Region</div>
              <div>Currency</div>
              <div className="text-right">Qty</div>
              <div className="text-right">Avg Cost</div>
              <div className="text-right">Last Price</div>
              <div className="text-right">P&L</div>
              <div className="text-right">Edit</div>
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between md:grid md:grid-cols-8 border-b border-border py-2 gap-2">
                <div><Skeleton className="h-4 w-20 rounded" /></div>
                <div><Skeleton className="h-4 w-16 rounded" /></div>
                <div><Skeleton className="h-4 w-12 rounded" /></div>
                <div className="text-right"><Skeleton className="h-4 w-12 rounded ml-auto" /></div>
                <div className="text-right"><Skeleton className="h-4 w-16 rounded ml-auto" /></div>
                <div className="text-right"><Skeleton className="h-4 w-16 rounded ml-auto" /></div>
                <div className="text-right"><Skeleton className="h-4 w-16 rounded ml-auto" /></div>
                <div className="text-right"><Skeleton className="h-4 w-6 rounded ml-auto" /></div>
              </div>
            ))}
          </div>
        ) : (data ?? []).length === 0 ? (
          <EmptyState title="No holdings" hint="Add holdings or import from your broker later." />
        ) : (
          <>
            <div className="hidden md:grid md:grid-cols-8 items-center border-b border-border pb-2 text-xs text-subtler gap-2">
              <div>Symbol</div>
              <div>Region</div>
              <div>Currency</div>
              <div className="text-right">Qty</div>
              <div className="text-right">Avg Cost</div>
              <div className="text-right">Last Price</div>
              <div className="text-right">P&L</div>
              <div className="text-right">Edit</div>
            </div>
            {(data ?? []).map((h) => (
              <div key={h.id} className="flex items-center justify-between md:grid md:grid-cols-8 border-b border-border py-2 gap-2">
                <div className="truncate">{h.symbol}</div>
                <div className="truncate">{(h as any).region ?? ''}</div>
                <div>{(h as any).currency ?? ''}</div>
                <div className="text-right">{h.quantity}</div>
                <div className="text-right">{h.averageCost.toFixed(2)}</div>
                <div className="text-right">{(h as any).lastPrice != null ? (h as any).lastPrice.toFixed(2) : '—'}</div>
                <div className="text-right">{(h as any).lastPrice != null ? ((h as any).lastPrice * h.quantity - h.averageCost * h.quantity).toFixed(2) : '—'}</div>
                <div className="text-right">
                  <button
                    className="btn btn-ghost btn-icon"
                    aria-label={`Edit ${h.symbol}`}
                    title="Edit"
                    onClick={() => {
                      setEditingId(h.id)
                      setEditSymbol(h.symbol)
                      setEditQty(h.quantity)
                      setEditCost(h.averageCost)
                      setEditCurrency(((h as any).currency ?? 'USD') as string)
                      setEditRegion(((h as any).region ?? undefined) as any)
                      setEditOpen(true)
                    }}
                  >
                    <PencilIcon className="w-4 h-4 text-subtler" />
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Watchlist removed per new flow */}
    </Card>
    <Modal open={addOpen} onClose={()=>setAddOpen(false)} title="Add holding" footer={(
      <>
        <button className="btn" onClick={()=>setAddOpen(false)}>Cancel</button>
        <button className="btn btn-primary" disabled={adding} onClick={async ()=>{
          setAdding(true)
          setAddError(null)
          const symbol = query.trim().toUpperCase()
          if (!symbol) { setAddError('Symbol is required'); showToast('Symbol is required', 'error'); return }
          if (draftQty <= 0) { setAddError('Quantity must be greater than 0'); showToast('Invalid quantity', 'error'); return }
          if (draftCost < 0) { setAddError('Average cost cannot be negative'); showToast('Invalid average cost', 'error'); return }
          try {
            const id = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
              ? crypto.randomUUID()
              : `h_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
            // Try to capture region via a one-off lookup but do not trigger extra calls later
            let region: string | undefined = (selectedResult && selectedResult.symbol.toUpperCase() === symbol) ? selectedResult.region : undefined
            if (!region) {
              const useFmp = Boolean(import.meta.env.VITE_FMP_API_KEY)
              const sr = useFmp ? await fmp.searchSymbols(symbol) : await alphaVantage.searchSymbols(symbol)
              region = sr.results?.[0]?.region
            }
            const currencyToSave = draftCurrency
            console.debug('[Investments] Add holding click', { id, symbol, quantity: draftQty, averageCost: draftCost, region, currencyToSave, selectedResult })
            // Persist to backend (no artificial timeout; let the request complete)
            await (service.upsertHoldings?.([
              { id, symbol, quantity: draftQty, averageCost: draftCost, region, currency: currencyToSave } as any,
            ]) as any)
            console.debug('[Investments] upsertHoldings complete')
            setAddOpen(false)
            setResults([])
            setQuery('')
            setSelectedResult(null)
            setDraftQty(0)
            setDraftCost(0)
            setDraftCurrency('USD')
            queryClient.invalidateQueries({ queryKey: ['holdings'] })
            showToast('Holding added', 'success')
          } catch (e) {
            console.error('[Investments] Failed to add holding', e)
            setAddError('Failed to add holding')
            showToast('Failed to add holding', 'error')
          } finally { setAdding(false) }
        }}>Add</button>
      </>
    )}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Symbol</label>
          <div className="flex gap-2">
            <input className="input input-sm w-full" value={query} onChange={e=>{ setQuery(e.target.value.toUpperCase()); setSelectedResult(null) }} onKeyDown={(e)=>{ if (e.key==='Enter') runSearch() }} />
            <button className="btn btn-sm" onClick={runSearch}>Search</button>
          </div>
          {addError ? <div className="text-danger text-xs mt-1">{addError}</div> : null}
          {(searching || results.length > 0 || !!searchError || rateLimited) && (
            <div className="mt-2 card p-2 max-h-48 overflow-auto">
              {searching ? (
                <div className="text-xs text-subtle p-2">Searching…</div>
              ) : rateLimited ? (
                <div className="text-xs text-subtle p-2">Rate limited, try again shortly</div>
              ) : searchError ? (
                <div className="text-xs text-subtle p-2">Search error: {searchError}</div>
              ) : results.length === 0 ? (
                <div className="text-xs text-subtle p-2">No matches</div>
              ) : (
                results.map(r => (
                  <button key={r.symbol} className={`w-full px-2 py-1 rounded hover:bg-muted flex items-center justify-between ${selectedResult?.symbol === r.symbol ? 'bg-muted' : ''}`} onClick={()=>{ setQuery(r.symbol); setSelectedResult(r); if (r.currency) setDraftCurrency(r.currency) }}>
                    <div className="text-left">
                      <div className="text-sm">{r.symbol}</div>
                      <div className="text-xs text-subtle">{r.name} · {r.region}{r.currency ? ` · ${r.currency}` : ''}</div>
                    </div>
                    {selectedResult?.symbol === r.symbol ? (
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" className="text-success"><path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm mb-1">Quantity</label>
            <input type="number" className="input input-sm w-full" value={draftQty} onChange={e=>setDraftQty(Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-sm mb-1">Average cost</label>
            <input type="number" className="input input-sm w-full" value={draftCost} onChange={e=>setDraftCost(Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-sm mb-1">Currency</label>
            <select className="input input-sm w-full" value={draftCurrency} onChange={e=>setDraftCurrency(e.target.value)}>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="EUR">EUR</option>
              <option value="CAD">CAD</option>
            </select>
          </div>
        </div>
      </div>
    </Modal>
    <Modal open={editOpen} onClose={()=>setEditOpen(false)} title="Edit holding" footer={(
      <>
        <button className="btn" onClick={()=>setEditOpen(false)}>Cancel</button>
        <button className="btn btn-primary" onClick={async ()=>{
          if (!editingId) { setEditOpen(false); return }
          setEditError(null)
          const symbol = editSymbol.trim().toUpperCase()
          if (!symbol) { setEditError('Symbol is required'); showToast('Symbol is required', 'error'); return }
          if (editQty <= 0) { setEditError('Quantity must be greater than 0'); showToast('Invalid quantity', 'error'); return }
          if (editCost < 0) { setEditError('Average cost cannot be negative'); showToast('Invalid average cost', 'error'); return }
          try {
            await service.upsertHoldings?.([
              { id: editingId, symbol, quantity: editQty, averageCost: editCost, region: editRegion, currency: editCurrency } as any,
            ])
            setEditOpen(false)
            queryClient.invalidateQueries({ queryKey: ['holdings'] })
            showToast('Holding updated', 'success')
          } catch (e) {
            showToast('Failed to update holding', 'error')
          }
        }}>Save</button>
      </>
    )}>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3">
            <label className="block text-sm mb-1">Symbol</label>
            <input className="input input-sm w-full" value={editSymbol} onChange={e=>setEditSymbol(e.target.value.toUpperCase())} />
          </div>
          <div>
            <label className="block text-sm mb-1">Quantity</label>
            <input type="number" className="input input-sm w-full" value={editQty} onChange={e=>setEditQty(Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-sm mb-1">Average cost</label>
            <input type="number" className="input input-sm w-full" value={editCost} onChange={e=>setEditCost(Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-sm mb-1">Currency</label>
            <select className="input input-sm w-full" value={editCurrency} onChange={e=>setEditCurrency(e.target.value)}>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="EUR">EUR</option>
              <option value="CAD">CAD</option>
            </select>
          </div>
          {editError ? <div className="col-span-3 text-danger text-xs">{editError}</div> : null}
          <div className="col-span-3 flex justify-between mt-1">
            <button className="btn btn-danger" onClick={async ()=>{
              if (!editingId) return
              const confirmed = window.confirm('Delete this holding?')
              if (!confirmed) return
              try {
                await (service as any).deleteHolding?.(editingId)
                setEditOpen(false)
                queryClient.invalidateQueries({ queryKey: ['holdings'] })
                showToast('Holding deleted', 'success')
              } catch (e) {
                showToast('Failed to delete holding', 'error')
              }
            }}>Delete</button>
          </div>
        </div>
      </div>
    </Modal>
    </>
  )
}

// Watchlist row removed per new flow


