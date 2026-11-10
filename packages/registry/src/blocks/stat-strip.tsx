import * as React from 'react'
import { cn } from './_cn'

// StatStrip. Two to five key figures in one band, split by hairlines instead of boxed into separate tiles.
// Label, figure (tabular, title scale so a row of figures never turns into a wall of giant numbers), an optional
// change with a caret and a sign, and a comparison line. The caret alone carries the delta color; the words stay
// in neutral ink so they read at any contrast. A source line under the band says where the figures come from.
// Two columns on phones, one row from sm up.

export type StripDeltaDir = 'up' | 'down' | 'flat'

export interface StripStat {
  label: string
  value: string
  delta?: {
    value: string
    dir: StripDeltaDir
    /** For metrics where up is not simply good (cost, share): the caret stays neutral. */
    neutral?: boolean
  }
  sub?: string
}

export interface StatStripProps extends React.HTMLAttributes<HTMLDivElement> {
  stats: StripStat[]
  source?: React.ReactNode
}

const WORD: Record<StripDeltaDir, string> = { up: 'Up', down: 'Down', flat: 'Unchanged' }

function Caret({ dir, neutral }: { dir: StripDeltaDir; neutral?: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('shrink-0', neutral || dir === 'flat' ? 'text-text-subtle' : dir === 'up' ? 'text-delta-up' : 'text-delta-down')}
    >
      {dir === 'up' ? <path d="M5 15l7-7 7 7" /> : dir === 'down' ? <path d="M5 9l7 7 7-7" /> : <path d="M6 12h12" />}
    </svg>
  )
}

export function StatStrip({ stats, source, className, ...props }: StatStripProps) {
  return (
    <div className={cn('min-w-0', className)} {...props}>
      <dl
        className={cn(
          'grid grid-cols-2 border-y border-border',
          stats.length >= 5 ? 'sm:grid-cols-5' : stats.length === 4 ? 'sm:grid-cols-4' : stats.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
        )}
      >
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={cn(
              'flex min-w-0 flex-col gap-1 border-border px-4 py-4',
              i % 2 === 1 && 'border-l',
              i >= 2 && 'border-t sm:border-t-0',
              i > 0 && 'sm:border-l',
            )}
          >
            <dt className="text-label text-text-muted">{s.label}</dt>
            <dd className="m-0 flex flex-col gap-1">
              <span className="text-h2 font-semibold tabular-nums tracking-tight text-text">{s.value}</span>
              {(s.delta || s.sub) && (
                <span className="flex flex-wrap items-center gap-x-1.5 text-label text-text-muted">
                  {s.delta && (
                    <span className="inline-flex items-center gap-0.5 tabular-nums">
                      <Caret dir={s.delta.dir} neutral={s.delta.neutral} />
                      <span className="sr-only">{WORD[s.delta.dir]} </span>
                      {s.delta.value}
                    </span>
                  )}
                  {s.sub && <span>{s.sub}</span>}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      {source && <p className="pt-2 text-label text-text-subtle">{source}</p>}
    </div>
  )
}
