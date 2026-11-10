import * as React from 'react'
import { cn } from '../blocks/_cn'
import { safeHref } from '../blocks/_url'

// Site footer: the wordmark and one sentence about what the company does, three or four link columns with
// sentence-case headings, a business block (registered name, registration number where the law asks for
// it, address, one contact address) and a bottom row with the copyright year and the legal links.
// Follows patterns/multi-column-footer: no newsletter field by default (CMP-10), no social icons as the
// only contact, one gray for every heading, a 1px rule before the bottom row. Columns become two per row
// on phones, never a stack of collapsed accordions that hide the legal links.
// Original code, MIT.

export interface FooterColumn {
  title: string
  links: { label: string; href: string }[]
}

export interface SiteFooterProps extends React.HTMLAttributes<HTMLElement> {
  /** The supplied wordmark or logo, linked home by the caller if wanted. */
  brand: React.ReactNode
  /** At most 90 characters. */
  tagline?: string
  columns: FooterColumn[]
  /** Lines of the business block, for example registered name, registration number, address, email. */
  business?: React.ReactNode[]
  copyright: string
  legal?: { label: string; href: string }[]
  /** A language switch or a status link, placed at the end of the bottom row. */
  extra?: React.ReactNode
}

const KEEP = 'break-keep [overflow-wrap:break-word]'
const LINK =
  'inline-flex min-h-11 items-center rounded-sm text-body text-text-muted outline-none transition-colors duration-press ease-out hover:text-text focus-visible:ring-2 focus-visible:ring-ring desk:min-h-0 desk:py-1'

export function SiteFooter({ brand, tagline, columns, business, copyright, legal = [], extra, className, ...props }: SiteFooterProps) {
  return (
    <footer className={cn('border-t border-border pt-12', className)} {...props}>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,5fr)] lg:gap-16">
        <div className="max-w-[320px]">
          <div className="text-title font-semibold text-text">{brand}</div>
          {tagline ? <p className={cn('mt-3 text-body text-text-muted', KEEP)}>{tagline}</p> : null}
          {business?.length ? (
            <address className={cn('mt-6 grid gap-1 text-label not-italic text-text-subtle', KEEP)}>
              {business.map((line, i) => (
                <span key={i}>{line}</span>
              ))}
            </address>
          ) : null}
        </div>
        <nav aria-label="Footer" className={cn('grid grid-cols-2 gap-x-6 gap-y-8', columns.length >= 4 ? 'md:grid-cols-4' : 'md:grid-cols-3')}>
          {columns.map((c) => (
            <div key={c.title} className="min-w-0">
              <h2 className={cn('text-body font-medium text-text', KEEP)}>{c.title}</h2>
              <ul className="m-0 mt-3 grid list-none gap-0 p-0 desk:gap-1">
                {c.links.map((l) => (
                  <li key={l.href + l.label}>
                    <a href={safeHref(l.href)} className={cn(LINK, KEEP)}>
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="mt-12 flex flex-col gap-2 border-t border-border py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="text-label text-text-subtle">{copyright}</p>
        <div className="flex flex-wrap items-center gap-x-6">
          {legal.map((l) => (
            <a key={l.href + l.label} href={safeHref(l.href)} className={cn(LINK, 'text-label')}>
              {l.label}
            </a>
          ))}
          {extra}
        </div>
      </div>
    </footer>
  )
}
