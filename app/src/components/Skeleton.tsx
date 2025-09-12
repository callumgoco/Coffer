export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden bg-muted ${className}`}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      <style>{`@keyframes shimmer{100%{transform:translateX(100%);}}`}</style>
    </div>
  )
}

export default Skeleton

