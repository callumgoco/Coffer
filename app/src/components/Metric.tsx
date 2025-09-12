type Props = {
  label: string
  value: string
  sub?: string
}

export function Metric({ label, value, sub }: Props) {
  return (
    <div className="card p-4">
      <div className="text-subtler text-[10px] uppercase tracking-[0.12em]">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub ? <div className="mt-1 text-xs text-subtler">{sub}</div> : null}
    </div>
  )
}

export default Metric
