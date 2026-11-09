import * as React from 'react'
import { cn } from '../blocks/_cn'
import { safeHref } from '../blocks/_url'

// Breadcrumb: the trail from the top of the site to the current page, above the page title. Links in
// muted ink, a thin slash between them drawn as a line so it is not read aloud, the current page in full
// ink with aria-current and no link. On phones a long trail keeps the first and the last two steps and
// folds the middle into one "..." button that unfolds it, instead of wrapping to three lines.
// Follows patterns/site-header (normal case, no icons per item) and the WAI-ARIA breadcrumb pattern.
// Original code, MIT.

export interface Crumb {
  label: string
  href?: string
}

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  /** From the top level to the current page. The last item is the current page. */
  items: Crumb[]
  label?: string
  /** Fold the middle on narrow screens when there are more than this many items. Default 4. */
  foldAfter?: number
  expandLabel?: string
}

const KEEP = 'break-keep [overflow-wrap:break-word]'
const LINK =
  'inline-flex min-h-11 items-center rounded-sm text-label text-text-muted underline-offset-4 outline-none hover:text-text hover:underline focus-visible:ring-2 focus-visible:ring-ring desk:min-h-0'

function Sep() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="mx-2 shrink-0 text-text-subtle">
      <path d="M15 4 9 20" />
    </svg>
  )
}

export function Breadcrumb({ items, label = 'Breadcrumb', foldAfter = 4, expandLabel = 'Show the full path', className, ...props }: BreadcrumbProps) {
  const [expanded, setExpanded] = React.useState(false)
  const fold = items.length > foldAfter && !expanded
  return (
    <nav aria-label={label} className={cn('min-w-0', className)} {...props}>
      <ol className="m-0 flex list-none flex-wrap items-center p-0">
        {items.map((c, i) => {
          const last = i === items.length - 1
          // Folded on narrow screens: keep the first item and the last two.
          const middle = i > 0 && i < items.length - 2
          const href = safeHref(c.href)
          return (
            <React.Fragment key={`${i}-${c.label}`}>
              {fold && i === 1 ? (
                <li className="flex items-center md:hidden">
                  <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    className="inline-flex h-11 min-w-11 items-center justify-center rounded-sm text-label text-text-muted outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span aria-hidden>...</span>
                    <span className="sr-only">{expandLabel}</span>
                  </button>
                  <Sep />
                </li>
              ) : null}
              <li className={cn('flex min-w-0 items-center', fold && middle && 'hidden md:flex')}>
                {last ? (
                  <span aria-current="page" className={cn('text-label font-medium text-text', KEEP)}>
                    {c.label}
                  </span>
                ) : href ? (
                  <a href={href} className={cn(LINK, KEEP)}>
                    {c.label}
                  </a>
                ) : (
                  <span className={cn('text-label text-text-muted', KEEP)}>{c.label}</span>
                )}
                {last ? null : <Sep />}
              </li>
            </React.Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
