import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import { Metric } from '../components/Metric'
import { formatMoney } from '../utils/money'
import { AlphaVantageProvider, fmp } from '../services/marketData/provider'
import { service } from '../services/adapters'
import { useMemo } from 'react'
import { useAccounts, useTransactions, useHoldings, useAssets } from '../hooks/useData'
import EmptyState from '../components/EmptyState'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts'
import { useCurrencyStore } from '../stores/currency'
import { useRates, convertAmount } from '../services/currency/rates'
import { useAuthStore } from '../stores/auth'

export default function Overview() {
  const { data: accounts } = useAccounts()
  const { data: transactions } = useTransactions()
  const { data: holdings } = useHoldings()
  const { data: assets } = useAssets()
  const { baseCurrency } = useCurrencyStore()
  const { data: rates } = useRates(baseCurrency)
  const profile = useAuthStore(s => s.profile)
  const displayName = useMemo(() => {
    const full = (profile?.full_name ?? '').trim()
    if (full) return full.split(' ')[0]
    const email = (profile?.email ?? '').trim()
    if (email) return email.split('@')[0]
    return 'there'
  }, [profile])

  async function refreshPrices() {
    const syms = Array.from(new Set((holdings ?? []).map(h => h.symbol)))
    const useFmp = Boolean(import.meta.env.VITE_FMP_API_KEY)
    for (const s of syms) {
      const q = useFmp ? await fmp.getQuote(s) : await new AlphaVantageProvider().getQuote(s)
      if (q.price) await service.updateHoldingPrice?.(s, q.price)
    }
  }

  const totals = useMemo(() => {
    const assetsTotal = (assets ?? []).reduce((s, a) => s + convertAmount(a.value ?? 0, ((a as any).currency ?? baseCurrency) as any, baseCurrency, rates), 0)
    const cash = (accounts ?? []).reduce((s, a) => s + convertAmount(a.balance ?? 0, a.currency, baseCurrency, rates), 0) + assetsTotal
    // Use current market value for investments to align with Investments page
    const inv = (holdings ?? []).reduce((s, h) => {
      const currentNative = (((h as any).lastPrice ?? h.averageCost) * h.quantity)
      return s + convertAmount(currentNative, (h as any).currency ?? baseCurrency, baseCurrency, rates)
    }, 0)
    const net = cash + inv
    const now = new Date()
    const monthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
    const monthSpend = (transactions ?? []).filter(t => (t.date ?? '').startsWith(monthKey)).reduce((s, t) => s + (t.amount < 0 ? convertAmount(-t.amount, ((t as any).currency ?? (accounts ?? []).find(a=>a.id===t.accountId)?.currency ?? baseCurrency) as any, baseCurrency, rates) : 0), 0)
    return { cash, inv, net, monthSpend }
  }, [accounts, assets, holdings, transactions, baseCurrency, rates])

  const spendSeries = useMemo(() => {
    const map = new Map<string, number>()
    ;(transactions ?? []).forEach(t => {
      if (t.amount >= 0) return
      map.set(t.date, (map.get(t.date) ?? 0) + -t.amount)
    })
    return Array.from(map.entries()).sort((a,b)=>a[0].localeCompare(b[0])).map(([date, value])=>({ date, value }))
  }, [transactions])

  return (
    <>
    <PageHeader
      title={
        <>
          <span>Overview</span>
          <span className="ml-3 text-lg md:text-xl font-medium text-subtler">Hello {displayName}! 👋</span>
        </>
      }
    />
    <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-3 mt-4">
      {(accounts ?? []).length === 0 && (transactions ?? []).length === 0 && (holdings ?? []).length === 0 && (assets ?? []).length === 0 ? (
        <Card className="lg:col-span-3">
          <EmptyState title="Welcome to your new dashboard" hint="You have no data yet. Import transactions, add assets or holdings to get started." />
        </Card>
      ) : null}
      <Metric label="Net worth" value={formatMoney(totals.net, baseCurrency)} />
      <Metric label="Cash & assets" value={formatMoney(totals.cash, baseCurrency)} />
      <Metric label="Investments" value={formatMoney(totals.inv, baseCurrency)} />

      <Card className="lg:col-span-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Spending this month</h2>
          <span className="badge text-subtler">mock data</span>
        </div>
        <div className="mt-4 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spendSeries}>
              <XAxis dataKey="date" stroke="currentColor" tick={{ fill: 'currentColor', fontSize: 12 }} hide={spendSeries.length > 30} />
              <YAxis stroke="currentColor" tick={{ fill: 'currentColor', fontSize: 12 }} hide />
              <Tooltip contentStyle={{ background: 'rgb(var(--card))', border: '1px solid rgb(var(--border))' }} />
              <Area type="monotone" dataKey="value" stroke="rgb(var(--accent))" fill="rgb(var(--accent))" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Prices</h2>
          <button className="btn btn-xs" onClick={refreshPrices}>Refresh prices</button>
        </div>
        <div className="mt-3 text-sm text-subtler">Press refresh to update latest prices for your holdings.</div>
      </Card>
    </div>
    </>
  )
}
