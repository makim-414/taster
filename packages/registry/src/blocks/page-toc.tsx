'use client'

import * as React from 'react'
import { cn } from './_cn'

// PageToc. "On this page" links for a long document or settings page. Plain anchor links (they work without
// script and keep the browser's own scroll and focus), plus a scroll spy that marks the section in view with
// aria-current="location", full ink and medium weight. One hairline rail on the left, no colored bar.
// Headings need ids that match the items. `offset` is the height of any sticky header above the content.

export interface TocItem {
  id: string
  label: string
  /** 2 indents the item under the previous level 1 item. */
  level?: 1 | 2
}

export interface PageTocProps extends React.HTMLAttributes<HTMLElement> {
  items: TocItem[]
  title?: string
  /** Controlled active id. Leave undefined to let the scroll spy decide. */
  activeId?: string
  offset?: number
}

export function PageToc({ items, title = 'On this page', activeId, offset = 0, className, ...props }: PageTocProps) {
  const [spy, setSpy] = React.useState<string | undefined>(items[0]?.id)
  const current = activeId ?? spy
  const headingId = React.useId()

  React.useEffect(() => {
    if (activeId !== undefined || typeof IntersectionObserver === 'undefined') return
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => Boolean(e))
    if (!els.length) return
    const visible = new Map<string, boolean>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.id, e.isIntersecting)
        const first = items.find((i) => visible.get(i.id))
        if (first) setSpy(first.id)
      },
      { rootMargin: `-${offset}px 0px -55% 0px`, threshold: 0 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [items, activeId, offset])

  return (
    <nav aria-labelledby={headingId} className={cn('min-w-0 text-sm', className)} {...props}>
      <div id={headingId} className="mb-2 text-label font-medium text-text-subtle">
        {title}
      </div>
      <ul className="flex flex-col border-l border-border">
        {items.map((i) => {
          const on = i.id === current
          return (
            <li key={i.id}>
              <a
                href={`#${i.id}`}
                aria-current={on ? 'location' : undefined}
                onClick={() => {
                  if (activeId === undefined) setSpy(i.id)
                }}
                className={cn(
                  'flex min-h-11 items-center rounded-sm py-1 pr-2 outline-none desk:min-h-8',
                  'transition-colors duration-press focus-visible:ring-2 focus-visible:ring-ring',
                  i.level === 2 ? 'pl-8' : 'pl-4',
                  on ? 'font-medium text-text' : 'text-text-muted hover:text-text',
                )}
              >
                {i.label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
