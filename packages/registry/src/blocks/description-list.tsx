import * as React from 'react'
import { cn } from './_cn'

// DescriptionList. The attributes of one record as term and value pairs (a real <dl>): plan, owner, region,
// created date. Hairline rows; on sm and up the term sits in a narrow left column, below that it stacks above the
// value. A missing value prints a quiet "Not set" instead of a blank, a zero or an empty trace like "null".

export interface DescriptionItem {
  term: React.ReactNode
  value?: React.ReactNode
  /** Trailing control for the row, for example an Edit button. */
  action?: React.ReactNode
}

export interface DescriptionListProps extends React.HTMLAttributes<HTMLDListElement> {
  items: DescriptionItem[]
  emptyLabel?: string
  /** Rows stack at every width when true. */
  stacked?: boolean
}

export function DescriptionList({ items, emptyLabel = 'Not set', stacked = false, className, ...props }: DescriptionListProps) {
  return (
    <dl className={cn('divide-y divide-border border-y border-border', className)} {...props}>
      {items.map((it, i) => {
        const empty = it.value === undefined || it.value === null || it.value === ''
        return (
          <div key={i} className={cn('grid gap-1 py-3', !stacked && 'sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-4')}>
            <dt className="text-sm text-text-muted">{it.term}</dt>
            <dd className="m-0 flex min-w-0 items-center justify-between gap-3">
              <span className={cn('min-w-0 break-words text-sm', empty ? 'text-text-subtle' : 'text-text')}>{empty ? emptyLabel : it.value}</span>
              {it.action != null && <span className="-my-2 shrink-0">{it.action}</span>}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
