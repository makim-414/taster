import * as React from 'react'
import { cn } from './_cn'

// Sparkline. A small axis-less trend line to sit next to a KPI.
// Neutral by default, semantic color only when dir is up or down.
// A screen reader reads it as one image, so it needs a name: label (also the svg title), or aria-label or
// aria-labelledby. Say what the line is and where it went, for example 'Conversion, up 0.4 points this week'.

type ChartName =
  | { label: string }
  | { label?: undefined; 'aria-label': string }
  | { label?: undefined; 'aria-labelledby': string }

export type SparklineProps = Omit<React.SVGAttributes<SVGSVGElement>, 'width' | 'height'> & {
  data: number[]
  width?: number
  height?: number
  dir?: 'up' | 'down'
} & ChartName

export const Sparkline = React.forwardRef<SVGSVGElement, SparklineProps>(
  ({ data, width = 120, height = 32, dir, label, className, ...props }, ref) => {
    const pad = 3
    const plotW = Math.max(width - pad * 2, 1)
    const plotH = Math.max(height - pad * 2, 1)

    const min = Math.min(...data)
    const max = Math.max(...data)
    const span = max - min || 1

    const n = Math.max(data.length - 1, 1)
    const pt = (v: number, i: number) => {
      const x = pad + (i / n) * plotW
      const y = pad + plotH - ((v - min) / span) * plotH
      return [x, y] as const
    }

    const points = data.map((v, i) => pt(v, i).join(',')).join(' ')
    const last = pt(data[data.length - 1] ?? 0, data.length - 1)

    const tone =
      dir === 'up' ? 'text-delta-up' : dir === 'down' ? 'text-delta-down' : 'text-text-muted'

    return (
      <svg
        ref={ref}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={label}
        className={cn('block', tone, className)}
        {...props}
      >
        {label ? <title>{label}</title> : null}
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={last[0]} cy={last[1]} r={2.2} fill="currentColor" />
      </svg>
    )
  },
)
Sparkline.displayName = 'Sparkline'
