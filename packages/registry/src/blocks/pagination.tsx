'use client'

import * as React from 'react'
import { cn } from './_cn'

// Pagination. Previous and Next with words, page numbers with gaps for long ranges, aria-current on the page in
// view. Below the sm breakpoint the numbers give way to "Page 3 of 12", so the row never wraps or scrolls.
// `paginationRange` is exported for custom layouts (for example a table footer).

export type PageToken = number | 'gap-start' | 'gap-end'

/** Pages to show: first, last, the current page and `siblings` on each side, with gaps between. */
export function paginationRange(page: number, pageCount: number, siblings = 1): PageToken[] {
  const total = siblings * 2 + 5
  if (pageCount <= total) return Array.from({ length: pageCount }, (_, i) => i + 1)
  const left = Math.max(page - siblings, 1)
  const right = Math.min(page + siblings, pageCount)
  const showLeftGap = left > 3
  const showRightGap = right < pageCount - 2
  if (!showLeftGap) {
    const count = siblings * 2 + 3
    return [...Array.from({ length: count }, (_, i) => i + 1), 'gap-end', pageCount]
  }
  if (!showRightGap) {
    const count = siblings * 2 + 3
    return [1, 'gap-start', ...Array.from({ length: count }, (_, i) => pageCount - count + i + 1)]
  }
  return [1, 'gap-start', ...Array.from({ length: right - left + 1 }, (_, i) => left + i), 'gap-end', pageCount]
}

export interface PaginationProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onChange'> {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  siblings?: number
  label?: string
  previousLabel?: string
  nextLabel?: string
  pageLabel?: (page: number, pageCount: number) => string
}

const BTN = cn(
  'inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-md px-2 text-sm tabular-nums outline-none desk:h-9 desk:min-w-9',
  'transition-colors duration-press focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40',
)

export function Pagination({
  page,
  pageCount,
  onPageChange,
  siblings = 1,
  label = 'Pagination',
  previousLabel = 'Previous',
  nextLabel = 'Next',
  pageLabel = (p, n) => `Page ${p} of ${n}`,
  className,
  ...props
}: PaginationProps) {
  if (pageCount <= 1) return null
  const go = (p: number) => onPageChange(Math.min(pageCount, Math.max(1, p)))
  return (
    <nav aria-label={label} className={cn('flex items-center justify-between gap-2 sm:justify-start', className)} {...props}>
      <button type="button" onClick={() => go(page - 1)} disabled={page <= 1} className={cn(BTN, 'text-text-muted hover:text-text')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        {previousLabel}
      </button>
      <span className="text-sm tabular-nums text-text-muted sm:hidden" aria-live="polite">
        {pageLabel(page, pageCount)}
      </span>
      <ul className="hidden items-center gap-1 sm:flex">
        {paginationRange(page, pageCount, siblings).map((t) =>
          typeof t === 'number' ? (
            <li key={t}>
              <button
                type="button"
                onClick={() => go(t)}
                aria-current={t === page ? 'page' : undefined}
                aria-label={pageLabel(t, pageCount)}
                className={cn(BTN, t === page ? 'border border-border bg-bg-elev font-medium text-text' : 'text-text-muted hover:text-text')}
              >
                {t}
              </button>
            </li>
          ) : (
            <li key={t} aria-hidden="true" className="px-1 text-sm text-text-subtle">
              ...
            </li>
          ),
        )}
      </ul>
      <button type="button" onClick={() => go(page + 1)} disabled={page >= pageCount} className={cn(BTN, 'text-text-muted hover:text-text')}>
        {nextLabel}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
    </nav>
  )
}
