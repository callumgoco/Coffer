import Papa from 'papaparse'
import { useRef, useState } from 'react'

type Row = Record<string, string>

export function CSVImport({ onRows }: { onRows: (rows: Row[]) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handlePick() {
    inputRef.current?.click()
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res: any) => {
        if (res.errors?.length) {
          setError(res.errors[0].message)
          return
        }
        onRows((res.data ?? []).filter(Boolean))
      },
      error: (err: any) => setError(err.message),
    })
    e.currentTarget.value = ''
  }

  return (
    <div className="inline-flex items-center gap-2">
      <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
      <button className="btn" onClick={handlePick}>Import CSV</button>
      {error ? <span className="text-xs text-subtler">{error}</span> : null}
    </div>
  )
}

export default CSVImport

