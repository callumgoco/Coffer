// Centralized Recharts theming helpers for consistent, modern visuals
// Keep this file dependency-free to avoid bundle bloat

export const chartColors = {
  grid: 'rgb(var(--muted))',
  axis: 'currentColor',
  tick: 'currentColor',
  tooltipBg: 'rgb(var(--card))',
  tooltipBorder: '1px solid rgb(var(--border))',
  accent: 'rgb(var(--accent))',
}

export const xAxisCommon = {
  stroke: chartColors.axis,
  tick: { fill: chartColors.tick, fontSize: 12 },
  axisLine: { stroke: chartColors.axis, strokeOpacity: 0.25 },
  tickLine: { stroke: chartColors.axis, strokeOpacity: 0.2 },
} as const

export const yAxisCommon = {
  stroke: chartColors.axis,
  tick: { fill: chartColors.tick, fontSize: 12 },
  axisLine: { stroke: chartColors.axis, strokeOpacity: 0.25 },
  tickLine: { stroke: chartColors.axis, strokeOpacity: 0.2 },
} as const

export const gridCommon = {
  stroke: chartColors.grid,
  strokeOpacity: 0.2,
  vertical: false,
} as const

export const areaCommon = {
  stroke: chartColors.accent,
  strokeWidth: 2,
  dot: false,
  type: 'monotone' as const,
}

export const tooltipCommon = {
  contentStyle: { background: chartColors.tooltipBg, border: chartColors.tooltipBorder },
} as const


