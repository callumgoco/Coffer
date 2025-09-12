import React from 'react'

type Props = {
  value: number
  size?: number
  stroke?: number
  className?: string
  trackColor?: string
  progressColor?: string
  label?: string
}

export default function ProgressRing({
  value,
  size = 72,
  stroke = 8,
  className = '',
  trackColor = 'rgb(var(--muted))',
  progressColor = 'rgb(var(--accent))',
  label,
}: Props) {
  const clamped = Math.max(0, Math.min(100, value))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - clamped / 100)

  return (
    <div className={className} style={{ width: size, height: size }} aria-label={label ?? `Progress ${clamped}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={trackColor}
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={progressColor}
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </g>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-medium select-none">
        {Math.round(clamped)}%
      </div>
    </div>
  )
}


