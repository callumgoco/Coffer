import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useCurrencyStore, type CurrencyCode } from '../stores/currency'

interface CurrencySelectProps {
  size?: 'xs' | 'sm' | 'md'
}

const CURRENCIES: CurrencyCode[] = ['GBP', 'USD', 'EUR', 'CAD']

export default function CurrencySelect({ size = 'xs' }: CurrencySelectProps) {
  const { baseCurrency, setBaseCurrency } = useCurrencyStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const sizeClass = size === 'xs' ? 'select-xs' : size === 'sm' ? 'select-sm' : ''

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`select ${sizeClass} w-auto pr-6`}
        onClick={() => setOpen(v => !v)}
      >
        {baseCurrency}
        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </button>
      {open ? (
        <div className="absolute left-0 top-full mt-1 min-w-full z-50">
          <div className="card p-1 shadow-lg">
            <ul role="listbox">
              {CURRENCIES.map((code) => (
                <li key={code}>
                  <button
                    className={`w-full text-left px-3 py-1 rounded hover:bg-muted ${code === baseCurrency ? 'font-medium' : ''}`}
                    role="option"
                    aria-selected={code === baseCurrency}
                    onClick={() => {
                      setBaseCurrency(code)
                      setOpen(false)
                    }}
                  >
                    {code}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  )
}


