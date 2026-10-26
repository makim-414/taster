import * as React from 'react'
import { cn } from './_cn'

// Funnel as a stack of horizontal bars that shrink from top to bottom.
// Lightest bar on top, darkest at the bottom. Value and percent use tabular numerals.

export interface FunnelStage {
  label: string
  value: number
}

export interface FunnelProps extends React.HTMLAttributes<HTMLDivElement> {
  stages: FunnelStage[]
}

const RAMP = [
  'fill-chart-1',
  'fill-chart-2',
  'fill-chart-3',
  'fill-chart-4',
  'fill-chart-5',
  'fill-chart-6',
] as const

export const Funnel = React.forwardRef<HTMLDivElement, FunnelProps>(
  ({ stages, className, ...props }, ref) => {
    const max = stages.reduce((m, s) => Math.max(m, s.value), 0) || 1

    return (
      <div ref={ref} className={cn('flex flex-col gap-2', className)} {...props}>
        {stages.map((stage, i) => {
          const pct = Math.round((stage.value / max) * 100)
          const fill = RAMP[Math.min(i, RAMP.length - 1)]
          return (
            <div key={stage.label} className="flex items-center gap-3">
              <span className="w-20 shrink-0 truncate text-sm text-text-muted">
                {stage.label}
              </span>
              <div className="min-w-0 flex-1">
                <svg
                  aria-hidden="true"
                  className="block h-5 w-full"
                  preserveAspectRatio="none"
                  viewBox="0 0 100 20"
                >
                  <rect
                    className="fill-bg-sunken"
                    x="0"
                    y="0"
                    width="100"
                    height="20"
                    rx="3"
                  />
                  <rect
                    className={fill}
                    x="0"
                    y="0"
                    width={Math.max(pct, 1)}
                    height="20"
                    rx="3"
                  />
                </svg>
              </div>
              <span className="w-10 shrink-0 text-right text-sm tabular-nums text-text">
                {stage.value}
              </span>
              <span className="w-10 shrink-0 text-right text-xs tabular-nums text-text-subtle">
                {pct}%
              </span>
            </div>
          )
        })}
      </div>
    )
  },
)
Funnel.displayName = 'Funnel'
