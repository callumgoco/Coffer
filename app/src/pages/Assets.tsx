import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import { useAssets } from '../hooks/useData'
import CSVImport from '../components/CSVImport'
import { useQueryClient } from '@tanstack/react-query'
import { service } from '../services/adapters'
import EmptyState from '../components/EmptyState'
import Skeleton from '../components/Skeleton'
import Modal from '../components/Modal'
import { useState, useMemo } from 'react'
import { useCurrencyStore } from '../stores/currency'
import { useRates, convertAmount } from '../services/currency/rates'
import { formatMoney } from '../utils/money'
import { Metric } from '../components/Metric'

export default function AssetsPage() {
  const { data, isLoading } = useAssets()
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [draft, setDraft] = useState<{ id?: string; name: string; value: number; currency: 'GBP'|'USD'|'EUR'|'CAD'; pricePaid?: number; acquiredOn?: string; notes?: string; url?: string } | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc')
  const { baseCurrency } = useCurrencyStore()
  const { data: rates } = useRates(baseCurrency)
  const total = useMemo(() => {
    return (data ?? []).reduce((s, a) => s + convertAmount(a.value ?? 0, ((a as any).currency ?? 'GBP') as any, baseCurrency, rates), 0)
  }, [data, baseCurrency, rates])

  const view = useMemo(() => {
    const list = (data ?? []).slice()
    list.sort((a, b) => {
      const av = convertAmount(a.value ?? 0, ((a as any).currency ?? 'GBP') as any, baseCurrency, rates)
      const bv = convertAmount(b.value ?? 0, ((b as any).currency ?? 'GBP') as any, baseCurrency, rates)
      return (av - bv) * (sortDir === 'asc' ? 1 : -1)
    })
    return list
  }, [data, sortDir, baseCurrency, rates])

  function openNew() {
    setDraft({ name: '', value: 0, currency: 'GBP', pricePaid: 0, acquiredOn: '', notes: '', url: '' })
    setEditOpen(true)
  }
  function openEdit(a: any) {
    setDraft({ id: a.id, name: a.name, value: a.value, currency: (a as any).currency ?? 'GBP', pricePaid: (a as any).pricePaid ?? 0, acquiredOn: (a as any).acquiredOn ?? '', notes: (a as any).notes ?? '', url: (a as any).url ?? '' })
    setEditOpen(true)
  }
  async function saveAsset() {
    if (!draft) return
    const row = { id: draft.id || crypto.randomUUID(), name: draft.name, value: draft.value, currency: draft.currency, pricePaid: draft.pricePaid ?? null, acquiredOn: draft.acquiredOn || null, notes: draft.notes || null, url: draft.url || null }
    await service.upsertAssets?.([row] as any)
    setEditOpen(false)
    await qc.invalidateQueries({ queryKey: ['assets'] })
  }
  async function confirmDelete() {
    if (!confirmId) return
    await (service as any).deleteAsset?.(confirmId)
    setConfirmId(null)
    await qc.invalidateQueries({ queryKey: ['assets'] })
  }
  return (
    <>
      <PageHeader title="Assets" actions={<>
        <button className="btn btn-primary" onClick={openNew}>Add asset</button>
        <button className="btn btn-outline btn-icon" title={sortDir === 'asc' ? 'Low → High' : 'High → Low'} aria-label="Toggle sort direction" onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>
          {sortDir === 'asc' ? '↑' : '↓'}
        </button>
        <button className="btn btn-outline" onClick={() => {
            const headers = ['id','name','value','currency','pricePaid','acquiredOn','url','notes']
            const lines = [headers.join(',')].concat((data ?? []).map(a => [a.id,a.name,String(a.value),(a as any).currency ?? '', (a as any).pricePaid ?? '', (a as any).acquiredOn ?? '', (a as any).url ?? '', (a as any).notes ? String((a as any).notes).replaceAll('\n',' ') : ''].join(',')))
            const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'assets_export.csv'
            a.click()
            URL.revokeObjectURL(url)
          }}>Export CSV</button>
          <CSVImport onRows={async rows => {
            const mapped = rows.map(r => ({ id: r.id || crypto.randomUUID(), name: r.name ?? '', value: Number(r.value ?? 0), currency: (r as any).currency as any, pricePaid: r.pricePaid !== undefined ? Number(r.pricePaid) : undefined, acquiredOn: (r as any).acquiredOn ?? undefined, url: (r as any).url ?? undefined, notes: (r as any).notes ?? undefined }))
            await service.upsertAssets?.(mapped as any)
            await qc.invalidateQueries({ queryKey: ['assets'] })
          }} />
      </>} />
      {/* Metrics */}
      <Card className="mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Metric label="Total assets" value={formatMoney(total, baseCurrency)} />
        <Metric label="Count" value={String((data ?? []).length)} />
        <Metric label="Avg value" value={formatMoney((data ?? []).length ? total / (data ?? []).length : 0, baseCurrency)} />
      </div>
    </Card>

    {/* List */}
    <Card className="mt-4">
      <div className="text-subtler text-sm">Total {formatMoney(total, baseCurrency)}</div>
      <div className="mt-4 space-y-2">
        {isLoading ? (
          <>
            <Skeleton className="h-5 w/full rounded" />
            <Skeleton className="h-5 w-5/6 rounded" />
          </>
        ) : view.length === 0 ? (
          <EmptyState title="No assets yet" hint="Import a CSV or add some." />
        ) : (
          <>
            <div className="hidden md:grid md:grid-cols-6 items-center border-b border-border pb-2 text-xs text-subtler gap-2">
              <div>Name</div>
              <div className="text-right">Value</div>
              <div className="text-right">Paid</div>
              <div className="text-left">URL</div>
              <div className="text-right">Acquired</div>
              <div className="text-right">Actions</div>
            </div>
            {view.map((a) => {
              const currency = ((a as any).currency ?? 'GBP') as any
              const paid = Number((a as any).pricePaid ?? 0)
              return (
                <div key={a.id} className="flex items-center justify-between md:grid md:grid-cols-6 border-b border-border py-2 gap-2">
                  <div className="truncate md:truncate">{a.name}</div>
                  <div className="text-right">{formatMoney(Number(a.value ?? 0), currency)}</div>
                  <div className="text-right">{paid ? formatMoney(paid, currency) : '—'}</div>
                  <div className="truncate md:text-left">{(a as any).url ? <a className="link inline-block max-w-full truncate align-middle" href={(a as any).url} target="_blank" rel="noreferrer">{(a as any).url}</a> : '—'}</div>
                  <div className="text-right">{(a as any).acquiredOn ? new Date((a as any).acquiredOn).toLocaleDateString() : '—'}</div>
                  <div className="flex justify-end gap-2">
                    <button className="btn btn-outline btn-xs" onClick={() => openEdit(a)}>Edit</button>
                    <button className="btn btn-danger btn-xs" onClick={() => setConfirmId(a.id)}>Delete</button>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </Card>

    <Modal open={editOpen} onClose={() => setEditOpen(false)} title={draft?.id ? 'Edit asset' : 'Add asset'}>
      {draft ? (
        <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={(e)=>{ e.preventDefault(); saveAsset() }}>
          <label className="text-sm">Name
            <input className="input mt-1" value={draft.name} onChange={(e)=> setDraft({ ...draft, name: e.target.value })} required />
          </label>
          <label className="text-sm">Value
            <input className="input mt-1" type="number" step="0.01" value={draft.value} onChange={(e)=> setDraft({ ...draft, value: Number(e.target.value) })} required />
          </label>
          <label className="text-sm">Currency
            <select className="select mt-1" value={draft.currency} onChange={(e)=> setDraft({ ...draft, currency: e.target.value as any })}
            >
              <option value="GBP">GBP</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="CAD">CAD</option>
            </select>
          </label>
          <label className="text-sm">Price paid
            <input className="input mt-1" type="number" step="0.01" value={draft.pricePaid ?? 0} onChange={(e)=> setDraft({ ...draft, pricePaid: Number(e.target.value) })} />
          </label>
          <label className="text-sm">Acquired on
            <input className="input mt-1" type="date" value={draft.acquiredOn ?? ''} onChange={(e)=> setDraft({ ...draft, acquiredOn: e.target.value })} />
          </label>
          <label className="text-sm md:col-span-2">URL
            <input className="input mt-1" type="url" value={draft.url ?? ''} onChange={(e)=> setDraft({ ...draft, url: e.target.value })} placeholder="https://example.com/asset" />
          </label>
          <label className="text-sm md:col-span-2">Notes
            <textarea className="input mt-1" rows={3} value={draft.notes ?? ''} onChange={(e)=> setDraft({ ...draft, notes: e.target.value })} />
          </label>
          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <button type="button" className="btn btn-outline" onClick={()=> setEditOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </form>
      ) : null}
    </Modal>

    <Modal open={!!confirmId} onClose={() => setConfirmId(null)} title="Delete asset">
      <div className="text-sm text-subtler">This action cannot be undone.</div>
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn btn-outline" onClick={()=> setConfirmId(null)}>Cancel</button>
        <button className="btn btn-danger" onClick={confirmDelete}>Delete</button>
      </div>
    </Modal>
    </>
  )
}


