import * as React from 'react'
import { cn } from '../blocks/_cn'
import { safeHref } from '../blocks/_url'

// Slim footer: one row under a hairline, the copyright on the left and up to three links on the right,
// wrapping under it on phones. For apps, docs and small sites that do not need columns.
// Follows patterns/slim-legal-footer: in flow at the end of the content column, never fixed to the
// viewport, no social row, no newsletter, a left and right split instead of a centered line of dots.
// An optional `meta` slot holds a version string or a status link in subtle ink.
// Original code, MIT.

export interface SlimFooterProps extends React.HTMLAttributes<HTMLElement> {
  copyright: string
  /** Three links at most: terms, privacy, contact. */
  links?: { label: string; href: string }[]
  meta?: React.ReactNode
}

const LINK =
  'inline-flex min-h-11 items-center rounded-sm text-label text-text-muted outline-none transition-colors duration-press ease-out hover:text-text focus-visible:ring-2 focus-visible:ring-ring desk:min-h-0'

export function SlimFooter({ copyright, links = [], meta, className, ...props }: SlimFooterProps) {
  return (
    <footer
      className={cn('flex flex-col gap-1 border-t border-border-soft py-4 sm:min-h-14 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-0', className)}
      {...props}
    >
      <p className="flex flex-wrap items-center gap-x-4 text-label text-text-subtle">
        <span>{copyright}</span>
        {meta ? <span>{meta}</span> : null}
      </p>
      {links.length ? (
        <nav aria-label="Legal">
          <ul className="m-0 flex list-none flex-wrap gap-x-6 p-0">
            {links.slice(0, 3).map((l) => (
              <li key={l.href + l.label}>
                <a href={safeHref(l.href)} className={LINK}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </footer>
  )
}
