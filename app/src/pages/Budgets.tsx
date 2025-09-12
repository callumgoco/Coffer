import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import { useBudgets } from '../hooks/useData'
import CSVImport from '../components/CSVImport'
import { useQueryClient } from '@tanstack/react-query'
import { service } from '../services/adapters'
import EmptyState from '../components/EmptyState'
import Skeleton from '../components/Skeleton'
import Modal from '../components/Modal'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { useEffect, useMemo, useRef, useState } from 'react'
import Metric from '../components/Metric'
import ProgressRing from '../components/ProgressRing'
import { PencilIcon } from '../components/icons'

export default function BudgetsPage() {
  const { data, isLoading } = useBudgets()
  // const { data: incomes } = useIncomes()
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [draft, setDraft] = useState<{ id?: string; category: string; limit: number; currency?: 'GBP'|'USD'|'EUR'|'CAD' } | null>(null)
  const [incOpen, setIncOpen] = useState(false)
  const [incDraft, setIncDraft] = useState<{ id?: string; date: string; source: string; amount: number; currency: 'GBP'|'USD'|'EUR'|'CAD' } | null>(null)
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

  const currencySymbol = (c?: string) => (
    (c ?? 'GBP') === 'GBP' ? '£' :
    (c === 'USD' ? '$' :
    (c === 'EUR' ? '€' :
    (c === 'CAD' ? 'CA$' : '')))
  )

  const totals = useMemo(() => {
    const list = data ?? []
    const totalLimit = list.reduce((sum, b) => sum + (b as any).limit, 0)
    const totalSpent = list.reduce((sum, b) => sum + (b as any).spent, 0)
    const currencies = new Set(list.map(b => (b as any).currency ?? 'GBP'))
    const symbol = currencies.size === 1 ? currencySymbol(list[0]?.currency) : ''
    const pct = totalLimit > 0 ? Math.min(100, Math.round((totalSpent / totalLimit) * 100)) : 0
    return { totalLimit, totalSpent, remaining: Math.max(0, totalLimit - totalSpent), symbol, pct }
  }, [data])

  const pieData = useMemo(() => ([
    { name: 'Spent', value: totals.totalSpent },
    { name: 'Remaining', value: totals.remaining },
  ]), [totals])

  function downloadTemplate() {
    const headers = ['id','category','limit','spent','currency']
    const csv = headers.join(',') + '\n'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'budgets_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportCsv() {
    const headers = ['id','category','limit','spent']
    const rows = (data ?? []).map(b => ({ id: b.id, category: b.category, limit: (b as any).limit ?? (b as any)["limit"], spent: b.spent }))
    const lines = [headers.join(',')]
    for (const r of rows) {
      lines.push([r.id, r.category, String(r.limit), String(r.spent)].join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'budgets_export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(rows: Record<string,string>[]) {
    const mapped = rows.map(r => ({
      id: r.id || crypto.randomUUID(),
      category: r.category ?? '',
      // support both headers
      limit: Number((r as any).limit ?? (r as any)["limit"] ?? 0),
      spent: Number(r.spent ?? 0),
      currency: (r as any).currency as any,
    }))
    await service.upsertBudgets?.(mapped as any)
    await qc.invalidateQueries({ queryKey: ['budgets'] })
  }

  function openNewBudget() {
    setDraft({ category: '', limit: 0, currency: 'GBP' })
    setEditOpen(true)
  }
  function openEditBudget(b: any) {
    setDraft({ id: b.id, category: b.category, limit: b.limit, currency: b.currency ?? 'GBP' })
    setEditOpen(true)
  }
  async function saveBudget() {
    if (!draft) return
    const row = { id: draft.id || crypto.randomUUID(), category: draft.category, limit: draft.limit, currency: draft.currency }
    await service.upsertBudgets?.([row] as any)
    setEditOpen(false)
    await qc.invalidateQueries({ queryKey: ['budgets'] })
  }

  function openNewIncome() {
    setIncDraft({ date: new Date().toISOString().slice(0,10), source: '', amount: 0, currency: 'GBP' })
    setIncOpen(true)
  }
  async function saveIncome() {
    if (!incDraft) return
    const row = { id: incDraft.id || crypto.randomUUID(), ...incDraft }
    await (service as any).upsertIncomes?.([row])
    setIncOpen(false)
    await qc.invalidateQueries({ queryKey: ['incomes'] })
  }
  return (
    <>
      <PageHeader title="Budgets" actions={<>
        <button className="btn btn-primary" onClick={openNewBudget}>New budget</button>
        <button className="btn btn-outline" onClick={openNewIncome}>Add income</button>
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
                  <button className="btn btn-outline" onClick={() => { setCsvOpen(false); exportCsv() }}>Export CSV</button>
                  <CSVImport onRows={(rows) => { setCsvOpen(false); handleImport(rows) }} />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </>} />
      <Card className="mt-4">
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Metric label="Total limit" value={`${totals.symbol}${totals.totalLimit.toFixed(2)}`} />
            <Metric label="Total spent" value={`${totals.symbol}${totals.totalSpent.toFixed(2)}`} />
            <Metric label="Remaining" value={`${totals.symbol}${totals.remaining.toFixed(2)}`} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          <>
            <Skeleton className="h-5 w-full rounded" />
            <Skeleton className="h-5 w-5/6 rounded" />
            <Skeleton className="h-5 w-2/3 rounded" />
          </>
        ) : (data ?? []).length === 0 ? (
          <EmptyState title="No budgets yet" hint="Import a CSV or add some." />
        ) : (data ?? []).map((b) => {
          const pct = Math.min(100, Math.round((b.spent / b.limit) * 100))
          return (
            <div key={b.id} className="card p-4 flex items-center gap-4">
              <div className="relative">
                <ProgressRing value={pct} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium truncate">{b.category}</div>
                  <button className="btn btn-xs btn-outline" aria-label="Edit budget" title="Edit" onClick={() => openEditBudget(b)}>
                    <PencilIcon />
                  </button>
                </div>
                <div className="mt-1 text-sm text-subtler truncate">
                  {currencySymbol(b.currency)}{b.spent.toFixed(2)} / {currencySymbol(b.currency)}{b.limit.toFixed(2)} ({pct}%)
                </div>
              </div>
            </div>
          )
        })}
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={2}
              >
                {pieData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? 'rgb(var(--accent))' : '#9ca3af'} />
                ))}
              </Pie>
              <Tooltip formatter={(val:any, name:any)=>[
                `${totals.symbol}${Number(val).toFixed(2)}`, name
              ]} contentStyle={{ background: 'rgb(var(--card))', border: '1px solid rgb(var(--border))' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>

    <Modal open={editOpen} onClose={() => setEditOpen(false)} title={draft?.id ? 'Edit budget' : 'New budget'}>
      {draft ? (
        <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={(e)=> { e.preventDefault(); saveBudget() }}>
          <label className="text-sm">Category
            <input className="input mt-1" value={draft.category} onChange={(e)=> setDraft({ ...draft, category: e.target.value })} required />
          </label>
          <label className="text-sm">Limit
            <input className="input mt-1" type="number" step="0.01" value={draft.limit} onChange={(e)=> setDraft({ ...draft, limit: Number(e.target.value) })} required />
          </label>
          <label className="text-sm">Currency
            <select className="select mt-1" value={draft.currency} onChange={(e)=> setDraft({ ...draft, currency: e.target.value as any })}>
              <option value="GBP">GBP</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="CAD">CAD</option>
            </select>
          </label>
          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <button type="button" className="btn btn-outline" onClick={()=> setEditOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </form>
      ) : null}
    </Modal>

    <Modal open={incOpen} onClose={() => setIncOpen(false)} title={incDraft?.id ? 'Edit income' : 'Add income'}>
      {incDraft ? (
        <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={(e)=> { e.preventDefault(); saveIncome() }}>
          <label className="text-sm">Date
            <input className="input mt-1" type="date" value={incDraft.date} onChange={(e)=> setIncDraft({ ...incDraft, date: e.target.value })} required />
          </label>
          <label className="text-sm">Amount
            <input className="input mt-1" type="number" step="0.01" value={incDraft.amount} onChange={(e)=> setIncDraft({ ...incDraft, amount: Number(e.target.value) })} required />
          </label>
          <label className="text-sm col-span-2">Source
            <input className="input mt-1" value={incDraft.source} onChange={(e)=> setIncDraft({ ...incDraft, source: e.target.value })} />
          </label>
          <label className="text-sm">Currency
            <select className="select mt-1" value={incDraft.currency} onChange={(e)=> setIncDraft({ ...incDraft, currency: e.target.value as any })}>
              <option value="GBP">GBP</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="CAD">CAD</option>
            </select>
          </label>
          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <button type="button" className="btn btn-outline" onClick={()=> setIncOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </form>
      ) : null}
    </Modal>
    </>
  )
}


