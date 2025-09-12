import { useState } from 'react'
import { addMonths, formatISO } from 'date-fns'

export type DateRange = { from: string; to: string }

export function DateRangePicker({ value, onChange }: { value?: DateRange; onChange: (range: DateRange) => void }) {
  const initialFrom = value?.from ?? formatISO(new Date(new Date().getFullYear(), new Date().getMonth(), 1), { representation: 'date' })
  const initialTo = value?.to ?? formatISO(addMonths(new Date(initialFrom), 1), { representation: 'date' })
  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState(initialTo)
  return (
    <div className="flex items-center gap-2">
      <input type="date" className="border border-border rounded px-2 py-1 bg-bg" value={from} onChange={(e)=> setFrom(e.target.value)} />
      <span className="text-subtler text-sm">to</span>
      <input type="date" className="border border-border rounded px-2 py-1 bg-bg" value={to} onChange={(e)=> setTo(e.target.value)} />
      <button className="btn" onClick={()=> onChange({ from, to })}>Apply</button>
    </div>
  )
}

export default DateRangePicker

