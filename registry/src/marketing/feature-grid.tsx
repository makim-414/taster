import * as React from 'react'
import { cn } from '../blocks/_cn'

// Feature grid: short features as text, a title and a sentence each, divided by hairlines instead of
// framed in cards. The answer to "three icon cards in a row" when the features are all words.
// Follows patterns/content-matched-grid, shape 3 (plain grid) and shape 1 (list, with `layout="list"`):
// no icon tile, no card frame, at most three columns, tighter spacing inside an item than between items.
// An item can carry a link; the whole item is not made clickable, so the text stays selectable.
// Original code, MIT.

export interface FeatureGridItem {
  title: string
  body: string
  link?: { label: string; href: string }
  /** Language of this item when it differs from the page, for example "ko". */
  lang?: string
}

export interface FeatureGridProps extends React.HTMLAttributes<HTMLElement> {
  items: FeatureGridItem[]
  /** grid: up to three columns with a hairline above each item. list: title left, sentence right, hairline between rows. */
  layout?: 'grid' | 'list'
  /** Columns on wide screens for the grid layout. Default 3. */
  columns?: 2 | 3
  as?: 'h3' | 'h4'
}

const KEEP = 'break-keep [overflow-wrap:break-word]'
const LINK =
  'mt-3 inline-flex min-h-11 items-center rounded-sm text-body font-medium text-text underline underline-offset-4 outline-none hover:text-text-muted focus-visible:ring-2 focus-visible:ring-ring desk:min-h-0'

export function FeatureGrid({ items, layout = 'grid', columns = 3, as: Heading = 'h3', className, ...props }: FeatureGridProps) {
  if (layout === 'list') {
    return (
      <ul className={cn('m-0 list-none border-t border-border p-0', className)} {...(props as React.HTMLAttributes<HTMLUListElement>)}>
        {items.map((it) => (
          <li key={it.title} lang={it.lang} className="grid gap-2 border-b border-border py-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-8">
            <Heading className={cn('text-title font-semibold leading-[var(--lh-snug)] text-text', KEEP)}>{it.title}</Heading>
            <div>
              <p className={cn('max-w-[60ch] text-body leading-[var(--lh-normal)] text-text-muted', KEEP)}>{it.body}</p>
              {it.link ? (
                <a href={it.link.href} className={LINK}>
                  {it.link.label}
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    )
  }
  return (
    <ul
      className={cn('m-0 grid list-none gap-x-8 gap-y-12 p-0 sm:grid-cols-2', columns === 3 && 'lg:grid-cols-3', className)}
      {...(props as React.HTMLAttributes<HTMLUListElement>)}
    >
      {items.map((it) => (
        <li key={it.title} lang={it.lang} className="border-t border-border pt-5">
          <Heading className={cn('text-title font-semibold leading-[var(--lh-snug)] text-text', KEEP)}>{it.title}</Heading>
          <p className={cn('mt-2 text-body leading-[var(--lh-normal)] text-text-muted', KEEP)}>{it.body}</p>
          {it.link ? (
            <a href={it.link.href} className={LINK}>
              {it.link.label}
            </a>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
