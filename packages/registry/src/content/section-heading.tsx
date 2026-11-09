import * as React from 'react'
import { cn } from '../blocks/_cn'
import { safeHref } from '../blocks/_url'

// Section heading: the lockup that opens a page section. "stack" sets an optional sentence-case eyebrow,
// the title and one supporting line, left aligned. "split" puts the title on the left and the supporting
// text on the right on wide screens, baselines meeting at the bottom, and stacks on phones.
// Follows patterns/plain-headline-and-eyebrow and patterns/split-section-header: eyebrow in normal case
// with normal tracking (AC-01), no pill around it, no gradient or italic word in the title (COL-04, TYP-03),
// tracking no tighter than -0.02em (TYP-05), Korean kept whole by word (KO-01).
// Original code, MIT.

export interface SectionHeadingProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  eyebrow?: string
  title: string
  /** One to three sentences. */
  children?: React.ReactNode
  layout?: 'stack' | 'split'
  as?: 'h1' | 'h2' | 'h3'
  /** Title size from the scale. Default h1 for split, h2 for stack. */
  size?: 'display' | 'h1' | 'h2'
  /** A text link after the supporting text. */
  link?: { label: string; href: string }
}

const KEEP = 'break-keep [overflow-wrap:break-word]'
const SIZE = {
  display: 'text-h1 lg:text-display leading-[var(--lh-tight)]',
  h1: 'text-h2 lg:text-h1 leading-[var(--lh-tight)]',
  h2: 'text-h2 leading-[var(--lh-snug)]',
} as const

export function SectionHeading({
  eyebrow,
  title,
  children,
  layout = 'stack',
  as: Heading = 'h2',
  size,
  link,
  className,
  ...props
}: SectionHeadingProps) {
  const s = size ?? (layout === 'split' ? 'h1' : 'h2')
  const support =
    children || link ? (
      <div className={cn('max-w-[45ch] text-body leading-[var(--lh-normal)] text-text-muted', KEEP)}>
        {children}
        {link ? (
          <>
            {' '}
            <a href={safeHref(link.href)} className="rounded-sm font-medium text-text underline underline-offset-4 outline-none hover:text-text-muted focus-visible:ring-2 focus-visible:ring-ring">
              {link.label}
            </a>
          </>
        ) : null}
      </div>
    ) : null
  const lockup = (
    <div className="min-w-0">
      {eyebrow ? <p className={cn('mb-2 text-label font-medium text-text-muted', KEEP)}>{eyebrow}</p> : null}
      <Heading className={cn('font-semibold tracking-[-0.01em] text-text text-balance', SIZE[s], KEEP)}>{title}</Heading>
    </div>
  )
  if (layout === 'split') {
    return (
      <div className={cn('grid gap-3 lg:grid-cols-2 lg:items-end lg:gap-12', className)} {...props}>
        {lockup}
        {support ? <div className="lg:justify-self-end">{support}</div> : null}
      </div>
    )
  }
  return (
    <div className={cn('max-w-[720px]', className)} {...props}>
      {lockup}
      {support ? <div className="mt-4">{support}</div> : null}
    </div>
  )
}
