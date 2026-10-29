import * as React from 'react'
import { cn } from './_cn'

// ItemList. Single line rows instead of a stack of boxed cards: optional leading media (an avatar or a thumbnail),
// a name, one line of description, trailing meta and one trailing action, hairline dividers between rows.
// When a row has href or onSelect, the whole row is the hit area through the name link, and the trailing action
// stays its own control on top, so there are never nested interactive elements.

export interface ItemListItem {
  id: string
  name: React.ReactNode
  description?: React.ReactNode
  meta?: React.ReactNode
  leading?: React.ReactNode
  action?: React.ReactNode
  href?: string
  onSelect?: () => void
  selected?: boolean
}

export interface ItemListProps extends React.HTMLAttributes<HTMLUListElement> {
  items: ItemListItem[]
}

export function ItemList({ items, className, ...props }: ItemListProps) {
  return (
    <ul className={cn('divide-y divide-border', className)} {...props}>
      {items.map((it) => {
        const interactive = Boolean(it.href || it.onSelect)
        const bodyCls = cn(
          'flex min-h-11 min-w-0 flex-1 flex-col justify-center text-left outline-none',
          interactive && 'after:absolute after:inset-0 after:rounded-md focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring',
        )
        const body = (
          <>
            <span className="text-sm font-medium text-text">{it.name}</span>
            {it.description && <span className="line-clamp-1 text-label text-text-muted">{it.description}</span>}
          </>
        )
        return (
          <li
            key={it.id}
            className={cn(
              'relative flex min-h-14 items-center gap-3 px-2 py-1.5 transition-colors duration-press',
              interactive && 'hover:bg-bg-elev',
              it.selected && 'bg-bg-elev',
            )}
          >
            {it.leading && <div className="shrink-0">{it.leading}</div>}
            {it.href ? (
              <a href={it.href} className={bodyCls} aria-current={it.selected ? 'true' : undefined}>
                {body}
              </a>
            ) : it.onSelect ? (
              <button type="button" onClick={it.onSelect} className={bodyCls} aria-current={it.selected ? 'true' : undefined}>
                {body}
              </button>
            ) : (
              <div className={bodyCls}>{body}</div>
            )}
            {it.meta && <div className="shrink-0 text-label tabular-nums text-text-subtle">{it.meta}</div>}
            {it.action && <div className="relative z-10 shrink-0">{it.action}</div>}
          </li>
        )
      })}
    </ul>
  )
}
