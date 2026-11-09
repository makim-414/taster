import * as React from 'react'
import { cn } from './_cn'

// Meter. A measured amount against a known limit: storage, seats, monthly quota. A thin neutral track, an accent
// fill, the figure in words beside the label ("7.2 of 10 GB") and optional threshold ticks, instead of turning the
// bar green, yellow and red. role="meter" with min, max, value and a readable value text.
// For the progress of a running job use Progress (blocks/progress).

export interface MeterProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: number
  max: number
  min?: number
  /** Formats one number, for example (n) => `${n} GB`. */
  format?: (n: number) => string
  /** Values where a tick sits on the track, for example a soft limit. */
  thresholds?: number[]
  caption?: React.ReactNode
}

export const Meter = React.forwardRef<HTMLDivElement, MeterProps>(
  ({ label, value, max, min = 0, format = (n) => String(n), thresholds, caption, className, ...props }, ref) => {
    const span = max - min || 1
    const pct = (n: number) => Math.min(100, Math.max(0, ((n - min) / span) * 100))
    const text = `${format(value)} of ${format(max)}`
    const labelId = React.useId()
    return (
      <div ref={ref} className={cn('flex w-full min-w-0 flex-col gap-1.5', className)} {...props}>
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span id={labelId} className="text-text">
            {label}
          </span>
          <span className="tabular-nums text-text-muted">{text}</span>
        </div>
        <div
          role="meter"
          aria-labelledby={labelId}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={text}
          className="relative h-2 w-full rounded-pill bg-bg-sunken"
        >
          <div className="h-full rounded-pill bg-accent" style={{ width: `${pct(value)}%` }} />
          {thresholds?.map((t) => (
            <span key={t} aria-hidden="true" className="absolute -top-1 h-4 w-px bg-text-subtle" style={{ left: `${pct(t)}%` }} />
          ))}
        </div>
        {caption && <p className="text-label text-text-muted">{caption}</p>}
      </div>
    )
  },
)
Meter.displayName = 'Meter'
