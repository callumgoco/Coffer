import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import { useTransactions } from '../hooks/useData'
import { useMemo } from 'react'
import { useCurrencyStore } from '../stores/currency'
import { useRates, convertAmount } from '../services/currency/rates'
import { formatMoney } from '../utils/money'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts'

export default function ReportsPage() {
  const { data: txs } = useTransactions()
  const { baseCurrency } = useCurrencyStore()
  const { data: rates } = useRates(baseCurrency)

  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    ;(txs ?? []).forEach(t => {
      if (t.amount >= 0) return
      const cur = (t as any).currency ?? baseCurrency
      const v = convertAmount(-t.amount, cur as any, baseCurrency, rates)
      map.set(t.category || 'Uncategorized', (map.get(t.category || 'Uncategorized') ?? 0) + v)
    })
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [txs, baseCurrency, rates])

  const cashflow = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>()
    ;(txs ?? []).forEach(t => {
      const month = (t.date ?? '').slice(0, 7)
      if (!month) return
      const cur = (t as any).currency ?? baseCurrency
      const v = convertAmount(Math.abs(t.amount), cur as any, baseCurrency, rates)
      const row = map.get(month) ?? { income: 0, expense: 0 }
      if (t.amount < 0) row.expense += v
      else row.income += v
      map.set(month, row)
    })
    return Array.from(map.entries()).sort((a,b)=>a[0].localeCompare(b[0])).map(([month, r]) => ({ month, income: r.income, expense: r.expense, net: r.income - r.expense }))
  }, [txs, baseCurrency, rates])
  return (
    <>
      <PageHeader title="Reports" actions={<button className="btn btn-outline">Export CSV</button>} />
      <Card className="mt-4">
        <h2 className="text-lg font-medium">Spending by category</h2>
        <div className="h-80 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}>
                {byCategory.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={index % 2 ? 'rgb(var(--accent))' : '#9ca3af'} />
                ))}
              </Pie>
              <Tooltip formatter={(v:any, name:any)=>[formatMoney(Number(v)||0, baseCurrency), name]} contentStyle={{ background: 'rgb(var(--card))', border: '1px solid rgb(var(--border))' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="mt-4">
        <h2 className="text-lg font-medium">Monthly cash flow</h2>
        <div className="h-80 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cashflow}>
              <XAxis dataKey="month" stroke="currentColor" tick={{ fill: 'currentColor' }} />
              <YAxis stroke="currentColor" tick={{ fill: 'currentColor' }} tickFormatter={(v:any)=>formatMoney(Number(v)||0, baseCurrency)} width={80} />
              <Tooltip contentStyle={{ background: 'rgb(var(--card))', border: '1px solid rgb(var(--border))' }} formatter={(v:any)=>formatMoney(Number(v)||0, baseCurrency)} />
              <Bar dataKey="income" fill="rgb(var(--accent))" />
              <Bar dataKey="expense" fill="#9ca3af" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </>
  )
}


