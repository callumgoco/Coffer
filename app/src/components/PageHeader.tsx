import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

export default function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    function onClick(e: MouseEvent) {
      if (!panelRef.current) return
      if (open && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick) }
  }, [open])

  return (
    <div className="relative flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold flex items-baseline gap-2">{title}</h1>
        {subtitle ? <div className="text-xs text-subtler mt-0.5">{subtitle}</div> : null}
      </div>
      {actions ? (
        <>
          <div className="hidden sm:flex items-center gap-2">{actions}</div>
          <div className="sm:hidden">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={() => setOpen(v => !v)}
            >
              Actions
            </button>
          </div>
          {open ? (
            <div className="absolute right-0 top-full mt-2 z-50" ref={panelRef} role="menu" aria-label="Page actions">
              <div className="card p-3 w-[calc(100vw-2rem)] max-w-sm">
                <div className="flex flex-col gap-2">
                  {actions}
                  <button className="btn btn-outline" onClick={() => setOpen(false)}>Close</button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}


