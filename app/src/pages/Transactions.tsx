import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import { useTransactions, useAccounts, useBudgets } from '../hooks/useData'
import CSVImport from '../components/CSVImport'
import { useQueryClient } from '@tanstack/react-query'
import { service } from '../services/adapters'
import { useMemo, useState, useEffect, useRef } from 'react'
import EmptyState from '../components/EmptyState'
import Skeleton from '../components/Skeleton'
import Modal from '../components/Modal'
import { Metric } from '../components/Metric'
import { useCurrencyStore } from '../stores/currency'
import { useRates, convertAmount } from '../services/currency/rates'
import { formatMoney } from '../utils/money'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts'

export default function TransactionsPage() {
  const { data: txs, isLoading } = useTransactions()
  const { data: accounts } = useAccounts()
  const { data: budgets } = useBudgets()
  const accMap = new Map((accounts ?? []).map((a) => [a.id, a.name]))
  const accCurrency = new Map((accounts ?? []).map((a) => [a.id, a.currency]))
  const { baseCurrency } = useCurrencyStore()
  const { data: rates } = useRates(baseCurrency)

  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'merchant' | 'category' | 'amount'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [category, setCategory] = useState<string>('')
  const [editOpen, setEditOpen] = useState(false)
  const [draft, setDraft] = useState<{ id?: string; date: string; merchant: string; category: string; amount: number; accountId: string; currency?: 'GBP'|'USD'|'EUR'; notes?: string } | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [csvOpen, setCsvOpen] = useState(false)
  const csvRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setCsvOpen(false) }
    function onClick(e: MouseEvent) {
      if (!csvRef.current) return
      if (csvOpen && !csvRef.current.contains(e.target as Node)) setCsvOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick) }
  }, [csvOpen])

  async function handleImport(rows: Record<string, string>[]) {
    // Minimal mapping step: accept headers id,date,merchant,category,amount,accountId,currency,notes
    const mapped = rows.map((r) => {
      const incomingAccountId = r.accountId ?? r.account_id ?? ''
      const validAccountId = (accounts ?? []).some(a => a.id === incomingAccountId)
        ? incomingAccountId
        : (accounts?.[0]?.id ?? '')
      return {
        id: r.id || crypto.randomUUID(),
        date: r.date,
        merchant: r.merchant ?? '',
        category: r.category ?? '',
        amount: Number(r.amount ?? 0),
        accountId: validAccountId,
        currency: (r as any).currency as any,
        notes: r.notes ?? undefined,
      }
    })
    if ((accounts ?? []).length === 0) {
      alert('No accounts exist. Please create an account first before importing transactions.')
      return
    }
    await service.upsertTransactions?.(mapped as any)
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['transactions'] }),
      qc.invalidateQueries({ queryKey: ['budgets'] }),
    ])
  }

  function openNew() {
    setDraft({ date: new Date().toISOString().slice(0,10), merchant: '', category: '', amount: 0, accountId: accounts?.[0]?.id ?? '', currency: 'GBP', notes: '' })
    setEditOpen(true)
  }
  function openEdit(t: any) {
    setDraft({ ...t })
    setEditOpen(true)
  }
  async function saveDraft() {
    if (!draft) return
    // Ensure accountId is valid to avoid FK constraint error
    let accountId = draft.accountId
    const hasValidAccount = (accounts ?? []).some(a => a.id === accountId)
    if (!hasValidAccount) accountId = accounts?.[0]?.id ?? ''
    if (!accountId) {
      alert('No accounts found. Please create an account first before saving a transaction.')
      return
    }
    const row = { ...draft, accountId, id: draft.id || crypto.randomUUID() }
    await service.upsertTransactions?.([row] as any)
    setEditOpen(false)
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['transactions'] }),
      qc.invalidateQueries({ queryKey: ['budgets'] }),
    ])
  }
  async function confirmDelete() {
    if (!confirmId) return
    await service.deleteTransaction?.(confirmId)
    setConfirmId(null)
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['transactions'] }),
      qc.invalidateQueries({ queryKey: ['budgets'] }),
    ])
  }

  function downloadTemplate() {
    const headers = ['id','date','merchant','category','amount','accountId','currency','notes']
    const csv = headers.join(',') + '\n'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'transactions_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportCsv(rows: typeof view) {
    const headers = ['id','date','merchant','category','amount','accountId','currency','notes']
    const lines = [headers.join(',')]
    for (const r of rows) {
      const vals = [r.id, r.date, r.merchant, r.category, String(r.amount), r.accountId, (r as any).currency ?? '', r.notes ?? '']
      lines.push(vals.map(v => {
        if (v == null) return ''
        const s = String(v)
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s
      }).join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'transactions_export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const categories = useMemo(() => {
    const set = new Set<string>()
    ;(budgets ?? []).forEach(b => b.category && set.add(b.category))
    ;(txs ?? []).forEach(t => t.category && set.add(t.category))
    return Array.from(set).sort()
  }, [txs, budgets])

  const view = useMemo(() => {
    let list = (txs ?? []).slice()
    const qNorm = q.trim().toLowerCase()
    if (qNorm) {
      list = list.filter(t =>
        t.merchant.toLowerCase().includes(qNorm) ||
        t.category.toLowerCase().includes(qNorm) ||
        (accMap.get(t.accountId)?.toLowerCase() ?? '').includes(qNorm)
      )
    }
    if (category) list = list.filter(t => t.category === category)
    list.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortBy === 'amount') return (a.amount - b.amount) * dir
      if (sortBy === 'date') return (a.date.localeCompare(b.date)) * dir
      if (sortBy === 'merchant') return a.merchant.localeCompare(b.merchant) * dir
      return a.category.localeCompare(b.category) * dir
    })
    return list
  }, [txs, q, sortBy, sortDir, category, accMap])

  const metrics = useMemo(() => {
    const now = new Date()
    const monthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
    let monthOut = 0
    let monthIn = 0
    ;(txs ?? []).forEach(t => {
      const cur = (t as any).currency ?? accCurrency.get(t.accountId) ?? baseCurrency
      const amountBase = convertAmount(Math.abs(t.amount), cur as any, baseCurrency, rates)
      if ((t.date ?? '').startsWith(monthKey)) {
        if (t.amount < 0) monthOut += amountBase
        else monthIn += amountBase
      }
    })
    const count = (txs ?? []).length
    const avgOut = monthOut > 0 ? (monthOut / Math.max(1, (txs ?? []).filter(t => (t.date ?? '').startsWith(monthKey) && t.amount < 0).length)) : 0
    return { monthOut, monthIn, net: monthIn - monthOut, count, avgOut }
  }, [txs, baseCurrency, rates, accCurrency])

  const spendSeries = useMemo(() => {
    const map = new Map<string, number>()
    ;(txs ?? []).forEach(t => {
      if (t.amount >= 0) return
      const cur = (t as any).currency ?? accCurrency.get(t.accountId) ?? baseCurrency
      const valBase = convertAmount(-t.amount, cur as any, baseCurrency, rates)
      map.set(t.date, (map.get(t.date) ?? 0) + valBase)
    })
    return Array.from(map.entries()).sort((a,b)=>a[0].localeCompare(b[0])).map(([date, value])=>({ date, value }))
  }, [txs, baseCurrency, rates, accCurrency])

  return (
    <>
      <PageHeader title="Transactions" actions={<>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search merchant/category/account"
          className="input"
          aria-label="Search transactions"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="select"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="select"
          aria-label="Sort by"
        >
          <option value="date">Date</option>
          <option value="merchant">Merchant</option>
          <option value="category">Category</option>
          <option value="amount">Amount</option>
        </select>
        <button className="btn btn-outline" onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')} aria-label="Toggle sort direction">
          {sortDir === 'asc' ? 'Asc' : 'Desc'}
        </button>
        <button className="btn btn-primary" onClick={openNew}>Add</button>
        <div className="relative">
          <button
            className="btn btn-outline"
            aria-haspopup="menu"
            aria-expanded={csvOpen}
            onClick={() => setCsvOpen(v => !v)}
          >
            CSV
          </button>
          {csvOpen ? (
            <div className="absolute right-0 mt-2 z-50" role="menu" aria-label="CSV actions">
              <div className="card p-2 w-56" ref={csvRef}>
                <div className="flex flex-col gap-2">
                  <button className="btn btn-outline" onClick={() => { setCsvOpen(false); downloadTemplate() }}>CSV template</button>
                  <button className="btn btn-outline" onClick={() => { setCsvOpen(false); exportCsv(view) }}>Export CSV</button>
                  <CSVImport onRows={(rows) => { setCsvOpen(false); handleImport(rows) }} />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </>} />
      {/* Metrics */}
      <Card className="mt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Metric label="This month − spent" value={formatMoney(metrics.monthOut, baseCurrency)} />
          <Metric label="This month − income" value={formatMoney(metrics.monthIn, baseCurrency)} />
          <Metric label="This month − net" value={formatMoney(metrics.net, baseCurrency)} />
          <Metric label="Transactions" value={String(metrics.count)} sub={metrics.avgOut ? `Avg spend ${formatMoney(metrics.avgOut, baseCurrency)}` : undefined} />
        </div>
      </Card>

      {/* Spending trend */}
      <Card className="mt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Spending trend</h2>
          <span className="badge text-subtler">mock data</span>
        </div>
        <div className="mt-4 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spendSeries}>
              <XAxis dataKey="date" stroke="currentColor" tick={{ fill: 'currentColor', fontSize: 12 }} hide={spendSeries.length > 30} />
              <YAxis stroke="currentColor" tick={{ fill: 'currentColor', fontSize: 12 }} hide />
              <Tooltip contentStyle={{ background: 'rgb(var(--card))', border: '1px solid rgb(var(--border))' }} formatter={(v:any)=>formatMoney(Number(v)||0, baseCurrency)} />
              <Area type="monotone" dataKey="value" stroke="rgb(var(--accent))" fill="rgb(var(--accent))" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Table */}
      <Card className="mt-4">
      <div className="mt-4">
        {isLoading ? (
          <div className="space-y-2">
            <div className="hidden md:grid md:grid-cols-8 items-center border-b border-border pb-2 text-xs text-subtler gap-2">
              <div>Date</div>
              <div>Merchant</div>
              <div>Category</div>
              <div className="text-right">Amount</div>
              <div>Currency</div>
              <div>Account</div>
              <div>Notes</div>
              <div className="text-right">Actions</div>
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between md:grid md:grid-cols-8 border-b border-border py-2 gap-2">
                <div><Skeleton className="h-4 w-24 rounded" /></div>
                <div><Skeleton className="h-4 w-28 rounded" /></div>
                <div><Skeleton className="h-4 w-20 rounded" /></div>
                <div className="text-right"><Skeleton className="h-4 w-16 rounded ml-auto" /></div>
                <div><Skeleton className="h-4 w-16 rounded" /></div>
                <div><Skeleton className="h-4 w-24 rounded" /></div>
                <div className="truncate"><Skeleton className="h-4 w-32 rounded" /></div>
                <div className="flex justify-end gap-2"><Skeleton className="h-8 w-28 rounded" /></div>
              </div>
            ))}
          </div>
        ) : view.length === 0 ? (
          <EmptyState title="No transactions" hint="Import a CSV or add some via Supabase." />
        ) : (
          <>
            <div className="hidden md:grid md:grid-cols-8 items-center border-b border-border pb-2 text-xs text-subtler gap-2">
              <div>Date</div>
              <div>Merchant</div>
              <div>Category</div>
              <div className="text-right">Amount</div>
              <div>Currency</div>
              <div>Account</div>
              <div>Notes</div>
              <div className="text-right">Actions</div>
            </div>
            {view.map((t) => (
              <div key={t.id} className="flex items-center justify-between md:grid md:grid-cols-8 border-b border-border py-2 gap-2">
                <div>{t.date}</div>
                <div className="truncate">{t.merchant}</div>
                <div className="truncate">{t.category}</div>
                <div className={`text-right ${t.amount < 0 ? 'text-danger' : 'text-success'}`}>{t.amount.toFixed(2)}</div>
                <div>{(t as any).currency ?? ''}</div>
                <div className="truncate">{accMap.get(t.accountId) ?? t.accountId}</div>
                <div className="truncate">{t.notes ?? ''}</div>
                <div className="flex justify-end gap-2">
                  <button className="btn btn-outline" onClick={() => openEdit(t)}>Edit</button>
                  <button className="btn btn-danger" onClick={() => setConfirmId(t.id)}>Delete</button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={draft?.id ? 'Edit transaction' : 'New transaction'}>
        {draft ? (
          <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={(e) => { e.preventDefault(); saveDraft() }}>
            <label className="text-sm">Date
              <input className="input mt-1" type="date" value={draft.date} onChange={(e)=> setDraft({ ...draft, date: e.target.value })} required />
            </label>
            <label className="text-sm">Amount
              <input className="input mt-1" type="number" step="0.01" value={draft.amount} onChange={(e)=> setDraft({ ...draft, amount: Number(e.target.value) })} required />
            </label>
            <label className="text-sm col-span-2">Merchant
              <input className="input mt-1" value={draft.merchant} onChange={(e)=> setDraft({ ...draft, merchant: e.target.value })} />
            </label>
            <label className="text-sm col-span-2">Category
              <select className="select mt-1" value={draft.category} onChange={(e)=> setDraft({ ...draft, category: e.target.value })}>
                <option value="">Uncategorized</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-sm col-span-2">Account
              <select className="select mt-1" value={draft.accountId} onChange={(e)=> setDraft({ ...draft, accountId: e.target.value })}>
                {(accounts ?? []).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
            <label className="text-sm">Currency
              <select className="select mt-1" value={draft.currency} onChange={(e)=> setDraft({ ...draft, currency: e.target.value as any })}>
                <option value="GBP">GBP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="CAD">CAD</option>
              </select>
            </label>
            <label className="text-sm col-span-2">Notes
              <textarea className="textarea mt-1" value={draft.notes ?? ''} onChange={(e)=> setDraft({ ...draft, notes: e.target.value })} />
            </label>
            <div className="col-span-2 mt-2 flex justify-end gap-2">
              <button type="button" className="btn btn-outline" onClick={()=> setEditOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save</button>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal open={!!confirmId} onClose={()=> setConfirmId(null)} title="Delete transaction">
        <div className="text-sm text-subtler">This action cannot be undone.</div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn btn-outline" onClick={()=> setConfirmId(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={confirmDelete}>Delete</button>
        </div>
      </Modal>
    </Card>
    </>
  )
}


