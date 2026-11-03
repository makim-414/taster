import * as React from 'react'
import { cn } from '../blocks/_cn'

// Pull quote: an attributed quotation set off inside a long read, one face, one weight, one ink, with the
// opening mark hung in the margin so the text edge stays straight, and hairlines above and below instead
// of a card or a side bar. The attribution names the person and, when the quote is public, links to it.
// Follows patterns/plain-pull-quote: no italic Korean, no colored side border (AC-10), no single word
// switched to another face (TYP-03), no gradient fill, never justified.
// Original code, MIT.

export interface PullQuoteProps extends React.HTMLAttributes<HTMLElement> {
  quote: string
  name: string
  /** Role and place, for example "Head of operations, a regional grocer". */
  detail?: string
  /** Public source of the quote. Becomes the blockquote cite and a link on the attribution. */
  source?: { href: string; label?: string }
  /** Hang the opening mark in the left margin on wide screens. Default true. */
  hang?: boolean
}

const KEEP = 'break-keep [overflow-wrap:break-word]'

export function PullQuote({ quote, name, detail, source, hang = true, className, ...props }: PullQuoteProps) {
  return (
    <figure className={cn('mx-0 my-12 max-w-[680px] border-y border-border py-8', className)} {...props}>
      <blockquote cite={source?.href} className="relative m-0">
        <span
          aria-hidden
          className={cn(
            'block text-[length:calc(var(--t-h1)*2)] leading-none text-text-subtle',
            hang ? 'mb-1 lg:absolute lg:-left-[0.6em] lg:top-0 lg:mb-0' : 'mb-1',
          )}
        >
          &ldquo;
        </span>
        <p className={cn('text-h2 font-medium leading-[var(--lh-snug)] text-text text-pretty [&:lang(ko)]:leading-[calc(var(--lh-normal)+0.1)]', KEEP)}>{quote}</p>
      </blockquote>
      <figcaption className={cn('mt-5 text-body', KEEP)}>
        {source ? (
          <a href={source.href} className="rounded-sm font-medium text-text underline underline-offset-4 outline-none hover:text-text-muted focus-visible:ring-2 focus-visible:ring-ring">
            {name}
          </a>
        ) : (
          <span className="font-medium text-text">{name}</span>
        )}
        {detail ? <span className="text-text-muted">, {detail}</span> : null}
      </figcaption>
    </figure>
  )
}
