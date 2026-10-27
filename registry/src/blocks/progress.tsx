import * as React from 'react'
import { cn } from './_cn'

// Progress bar. Neutral track, accent fill, so a theme recolors it with one token.
// API follows shadcn/ui progress (MIT). Values use tabular numerals.

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  label?: string
}

function clamp(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.min(100, Math.max(0, n))
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ value, label, className, ...props }, ref) => {
    const pct = clamp(value)
    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {label ? (
          <div className="mb-1.5 flex items-center justify-between text-caption">
            <span className="text-text-muted">{label}</span>
            <span className="text-text-muted tabular-nums">{Math.round(pct)}%</span>
          </div>
        ) : null}
        <div
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
          className="h-2 w-full overflow-hidden rounded-full border border-border-soft bg-bg-elev"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    )
  },
)
Progress.displayName = 'Progress'
