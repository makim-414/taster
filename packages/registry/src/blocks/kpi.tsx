import * as React from 'react'
import { cn } from './_cn'

// Stat / KPI tile: label, value, delta, caption.
// Only the delta uses color, and only by direction. An empty value renders a middle dot, never a fake zero.
// Say what the delta is against in `sub` ("vs previous 30 days"); a change between two percentages is in %p.

export type StatDeltaDir = 'up' | 'down' | 'flat'

export interface StatDelta {
  value: string
  dir: StatDeltaDir
  /** For metrics where up is not simply good (share, rank, cost): caret and sign stay, color goes. */
  neutral?: boolean
}

const DELTA_TONE: Record<StatDeltaDir, string> = {
  up: 'text-delta-up',
  down: 'text-delta-down',
  flat: 'text-text-muted',
}
const DELTA_WORD: Record<StatDeltaDir, string> = { up: 'up', down: 'down', flat: 'unchanged' }

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
        <path d="M5 14l7-7 7 7" />
      ) : dir === 'down' ? (
        <path d="M5 10l7 7 7-7" />
      ) : (
        <path d="M6 12h12" />
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
                delta.neutral ? 'text-text-muted' : DELTA_TONE[delta.dir],
              )}
            >
              <CaretIcon dir={delta.dir} />
              <span className="sr-only">{DELTA_WORD[delta.dir]} </span>
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
