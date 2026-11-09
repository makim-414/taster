import * as React from 'react'
import { cn } from './_cn'

// Progress bar. Neutral track, accent fill, so a theme recolors it with one token.
// API follows shadcn/ui progress (MIT). Values use tabular numerals.
// The bar needs a name: label (shown above it), or aria-label or aria-labelledby, which go on the progressbar.
// Upstream license: MIT, Copyright (c) 2023 shadcn. Full text in THIRD_PARTY_NOTICES.md.

type ProgressName =
  | { label: string }
  | { label?: undefined; 'aria-label': string }
  | { label?: undefined; 'aria-labelledby': string }

export type ProgressProps = React.HTMLAttributes<HTMLDivElement> & { value: number } & ProgressName

function clamp(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.min(100, Math.max(0, n))
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ value, label, 'aria-label': ariaLabel, 'aria-labelledby': labelledBy, className, ...props }, ref) => {
    const pct = clamp(value)
    const labelId = React.useId()
    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {label ? (
          <div className="mb-1.5 flex items-center justify-between text-caption">
            <span id={labelId} className="text-text-muted">{label}</span>
            <span className="text-text-muted tabular-nums">{Math.round(pct)}%</span>
          </div>
        ) : null}
        <div
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label ? undefined : ariaLabel}
          aria-labelledby={label ? labelId : labelledBy}
          className="h-2 w-full overflow-hidden rounded-full border border-border-soft bg-bg-elev"
        >
          {/* A full-width fill slid left by transform, so the bar moves without relaying out (MOT-05) */}
          <div
            className="h-full w-full rounded-full bg-accent transition-transform duration-dropdown ease-out"
            style={{ transform: `translateX(-${100 - pct}%)` }}
          />
        </div>
      </div>
    )
  },
)
Progress.displayName = 'Progress'
