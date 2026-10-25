import * as React from 'react'
import { cn } from './_cn'

// Area / line chart as a light inline SVG. The line and the low-opacity fill share currentColor.

export interface AreaChartProps extends React.HTMLAttributes<HTMLDivElement> {
  data: number[]
  height?: number
}

export const AreaChart = React.forwardRef<HTMLDivElement, AreaChartProps>(
  ({ data, height = 160, className, ...props }, ref) => {
    const W = 600
    const H = height
    const pad = 6
    const max = Math.max(...data, 1)
    const min = Math.min(...data, 0)
    const span = max - min || 1
    const stepX = data.length > 1 ? (W - pad * 2) / (data.length - 1) : 0
    const pts = data.map((v, i) => {
      const x = pad + i * stepX
      const y = pad + (1 - (v - min) / span) * (H - pad * 2)
      return `${x},${y}`
    })
    const line = pts.join(' ')
    const lastX = pad + (data.length - 1) * stepX
    const area = `${pad},${H - pad} ${line} ${lastX},${H - pad}`
    return (
      <div ref={ref} className={cn('w-full text-text-muted', className)} {...props}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img" aria-label="area chart">
          <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} className="stroke-border" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <polygon points={area} fill="currentColor" fillOpacity={0.08} />
          <polyline points={line} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    )
  },
)
AreaChart.displayName = 'AreaChart'
