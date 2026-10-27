import * as React from 'react'
import { cn } from './_cn'

// Donut chart. Portion segments drawn with stroke-dasharray, total label in the middle.
// Segments use the neutral lightness ramp (chart-1 to chart-6), never a rainbow.

export interface DonutSegment {
  label: string
  value: number
}

export interface DonutChartProps extends React.HTMLAttributes<HTMLDivElement> {
  segments: DonutSegment[]
  size?: number
}

const RAMP = [
  'stroke-chart-1',
  'stroke-chart-2',
  'stroke-chart-3',
  'stroke-chart-4',
  'stroke-chart-5',
  'stroke-chart-6',
] as const

const DOT = [
  'bg-chart-1',
  'bg-chart-2',
  'bg-chart-3',
  'bg-chart-4',
  'bg-chart-5',
  'bg-chart-6',
] as const

export const DonutChart = React.forwardRef<HTMLDivElement, DonutChartProps>(
  ({ segments, size = 140, className, ...props }, ref) => {
    const total = segments.reduce((sum, s) => sum + s.value, 0)
    const stroke = Math.max(10, Math.round(size * 0.1))
    const r = (size - stroke) / 2
    const cx = size / 2
    const C = 2 * Math.PI * r

    let acc = 0
    const arcs = segments.map((s, i) => {
      const frac = total > 0 ? s.value / total : 0
      const arc = { frac, offset: acc, ramp: RAMP[i % RAMP.length] }
      acc += frac
      return arc
    })

    return (
      <div ref={ref} className={cn('inline-flex flex-col gap-4', className)} {...props}>
        <div className="relative" style={{ width: size, height: size }}>
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            aria-hidden="true"
            className="-rotate-90"
          >
            <circle
              cx={cx}
              cy={cx}
              r={r}
              fill="none"
              strokeWidth={stroke}
              className="stroke-border-soft"
            />
            {arcs.map((a, i) => (
              <circle
                key={i}
                cx={cx}
                cy={cx}
                r={r}
                fill="none"
                strokeWidth={stroke}
                strokeDasharray={`${a.frac * C} ${C}`}
                strokeDashoffset={-a.offset * C}
                className={a.ramp}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-h2 font-semibold tabular-nums text-text">
              {total.toLocaleString('en-US')}
            </span>
            <span className="text-caption text-text-subtle">Total</span>
          </div>
        </div>

        <ul className="flex flex-col gap-1.5">
          {segments.map((s, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span
                className={cn('size-2 shrink-0 rounded-full', DOT[i % DOT.length])}
                aria-hidden="true"
              />
              <span className="flex-1 text-text-muted">{s.label}</span>
              <span className="tabular-nums font-medium text-text">
                {s.value.toLocaleString('en-US')}
              </span>
            </li>
          ))}
        </ul>
      </div>
    )
  },
)
DonutChart.displayName = 'DonutChart'
