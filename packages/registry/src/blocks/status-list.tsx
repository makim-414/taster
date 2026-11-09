import * as React from 'react'
import { cn } from './_cn'

// StatusList. Several things and the state of each, such as services, checks or integrations. The state is a word
// first; a small flat dot in the page's --success or --danger color backs it up only for a real pass or failure,
// and anything else gets a neutral dot. No colored side bars, no tinted rows, no pulsing.

export type StatusTone = 'ok' | 'failed' | 'neutral'

export interface StatusListItem {
  id: string
  label: React.ReactNode
  /** The state in words, for example "Operational" or "Failed at 09:12". */
  status: string
  tone?: StatusTone
  detail?: React.ReactNode
}

export interface StatusListProps extends React.HTMLAttributes<HTMLDivElement> {
  items: StatusListItem[]
  /** One line above the list, for example "3 of 4 checks passed". */
  summary?: React.ReactNode
}

const DOT: Record<StatusTone, string> = {
  ok: 'bg-success',
  failed: 'bg-danger',
  neutral: 'bg-text-subtle',
}

export function StatusList({ items, summary, className, ...props }: StatusListProps) {
  return (
    <div className={cn('min-w-0', className)} {...props}>
      {summary && <div className="pb-2 text-sm text-text-muted">{summary}</div>}
      <ul className="divide-y divide-border border-y border-border">
        {items.map((it) => (
          <li key={it.id} className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm text-text">{it.label}</div>
              {it.detail && <div className="text-label text-text-muted">{it.detail}</div>}
            </div>
            <div className="flex shrink-0 items-center gap-2 text-sm text-text">
              <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', DOT[it.tone ?? 'neutral'])} />
              <span>{it.status}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
