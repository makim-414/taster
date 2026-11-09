import * as React from 'react'
import { cn } from '../blocks/_cn'
import { safeHref } from '../blocks/_url'

// Customer quote: one person's words, set large, with their name, role and organization, an optional
// real headshot and an optional measured result above the quote. One quote given room, instead of a row
// of six thin cards that nobody reads.
// Follows patterns/outcome-quote-card and patterns/plain-pull-quote: no star row, no initials disc, no
// side bar, no giant decorative mark, no card shadow. If there is no photo the line stays text only.
// Use only words a real person said and agreed to publish (CMP-08).
// Original code, MIT.

export interface CustomerQuoteProps extends React.HTMLAttributes<HTMLElement> {
  quote: string
  name: string
  role: string
  /** Organization name, written out. Leave empty when the person asked not to name it. */
  org?: string
  /** A real headshot supplied by the person. */
  photo?: { src: string; alt?: string }
  /** The measured result the quote is about, for example "Reopened tickets down 41% in 8 weeks". */
  result?: string
  link?: { label: string; href: string }
  /** large: the quote at heading size for a single feature quote. medium: body size for a row of two or three. */
  size?: 'large' | 'medium'
}

const KEEP = 'break-keep [overflow-wrap:break-word]'

export function CustomerQuote({ quote, name, role, org, photo, result, link, size = 'large', className, ...props }: CustomerQuoteProps) {
  return (
    <figure className={cn('m-0 max-w-[760px]', className)} {...props}>
      {result ? <p className={cn('mb-4 text-title font-semibold tabular-nums text-text', KEEP)}>{result}</p> : null}
      <blockquote className="m-0">
        <p
          className={cn(
            'text-text text-pretty',
            size === 'large' ? 'text-h2 font-medium leading-[var(--lh-snug)] [&:lang(ko)]:leading-[calc(var(--lh-normal)+0.1)]' : 'text-title font-reg leading-[var(--lh-normal)]',
            KEEP,
          )}
        >
          <span aria-hidden className="text-text-subtle">&ldquo;</span>
          {quote}
          <span aria-hidden className="text-text-subtle">&rdquo;</span>
        </p>
      </blockquote>
      <figcaption className="mt-6 flex items-center gap-3">
        {photo ? (
          <img src={photo.src} alt={photo.alt ?? ''} width={40} height={40} className="h-10 w-10 shrink-0 rounded-md object-cover" />
        ) : null}
        <span className={cn('text-body', KEEP)}>
          <span className="font-medium text-text">{name}</span>
          <span className="text-text-muted">
            , {role}
            {org ? `, ${org}` : ''}
          </span>
        </span>
      </figcaption>
      {link ? (
        <a
          href={safeHref(link.href)}
          className="mt-4 inline-flex min-h-11 items-center rounded-sm text-body font-medium text-text underline underline-offset-4 outline-none hover:text-text-muted focus-visible:ring-2 focus-visible:ring-ring desk:min-h-0"
        >
          {link.label}
        </a>
      ) : null}
    </figure>
  )
}
