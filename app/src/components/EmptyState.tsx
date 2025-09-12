export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="text-center text-subtler py-10">
      <div className="text-sm font-medium">{title}</div>
      {hint ? <div className="text-xs mt-1">{hint}</div> : null}
    </div>
  )
}

export default EmptyState

