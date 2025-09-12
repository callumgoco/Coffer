import { ReactNode, useEffect } from 'react'

export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 modal-overlay" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-card p-4 md:p-5 shadow-card modal-panel">
        {(title || onClose) ? (
          <div className="flex items-start justify-between mb-3">
            {title ? <h2 className="text-base font-medium">{title}</h2> : <span />}
            <button aria-label="Close" className="btn btn-ghost btn-icon" onClick={onClose}>×</button>
          </div>
        ) : null}
        <div>{children}</div>
        {footer ? <div className="mt-4 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, body }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; body?: string }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="text-sm text-subtler">{body}</div>
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={onConfirm}>Confirm</button>
      </div>
    </Modal>
  )
}

export default Modal

