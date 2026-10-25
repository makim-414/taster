import * as React from 'react'
import { cn } from './_cn'

// Stat / KPI tile: label, value, delta, caption.
// Only the delta uses semantic color. An empty value renders a middle dot, never a fake zero.

export type StatDeltaDir = 'up' | 'down'

export interface StatDelta {
  value: string
  dir: StatDeltaDir
}

export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: string | number
  delta?: StatDelta
  sub?: string
}

function CaretIcon({ dir }: { dir: StatDeltaDir }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {dir === 'up' ? (
        <>
          <path d="M5 14l7-7 7 7" />
        </>
      ) : (
        <>
          <path d="M5 10l7 7 7-7" />
        </>
      )}
    </svg>
  )
}

export const Stat = React.forwardRef<HTMLDivElement, StatProps>(
  ({ label, value, delta, sub, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('bg-bg-elev border border-border rounded-lg p-5', className)}
      {...props}
    >
      <div className="text-sm text-text-subtle">{label}</div>
      <div className="mt-2 text-h2 font-semibold tabular-nums tracking-[-0.02em]">{value}</div>
      {(delta || sub) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {delta && (
            <span
              className={cn(
                'inline-flex items-center gap-1 whitespace-nowrap tabular-nums',
                delta.dir === 'up' ? 'text-delta-up' : 'text-delta-down',
              )}
            >
              <CaretIcon dir={delta.dir} />
              {delta.value}
            </span>
          )}
          {sub && <span className="whitespace-nowrap text-text-muted">{sub}</span>}
        </div>
      )}
    </div>
  ),
)
Stat.displayName = 'Stat'
