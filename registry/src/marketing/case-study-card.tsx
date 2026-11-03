import * as React from 'react'
import { cn } from '../blocks/_cn'
import { safeHref } from '../blocks/_url'

// Case study card: a link to one customer story that leads with what changed, measured, and only then
// who it was. A cover image of the real work is optional. The whole card is one link with one focus ring.
// Follows patterns/outcome-quote-card (the result line first, tabular figures, a source period) and
// patterns/media-tile-card (one image ratio for every card in a row). No logo tile, no star row.
// Lay several out with CaseStudyGrid, which keeps cover ratios equal and lets text set the height.
// Original code, MIT.

export interface CaseStudy {
  href: string
  /** The measured change, for example "Checkout time down from 4 to 2 minutes". */
  result: string
  /** Where and when it was measured, for example "Median of 1,200 orders, Mar to May". */
  measured?: string
  /** Who, written out: organization and the kind of team. */
  who: string
  summary: string
  cover?: { src: string; alt: string }
  linkLabel?: string
  /** Language of this story, for example "ko", when it differs from the page. */
  lang?: string
}

export interface CaseStudyCardProps extends React.HTMLAttributes<HTMLElement> {
  study: CaseStudy
  as?: 'h3' | 'h4'
}

const KEEP = 'break-keep [overflow-wrap:break-word]'

export function CaseStudyCard({ study, as: Heading = 'h3', className, ...props }: CaseStudyCardProps) {
  return (
    <article lang={study.lang} className={cn('min-w-0', className)} {...props}>
      <a
        href={safeHref(study.href)}
        className="group flex h-full flex-col rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-[color:var(--bg)]"
      >
        {study.cover ? (
          <div className="mb-5 aspect-[16/10] overflow-hidden rounded-xl bg-bg-sunken">
            <img src={study.cover.src} alt={study.cover.alt} loading="lazy" className="h-full w-full object-cover" />
          </div>
        ) : null}
        <Heading className={cn('text-h2 font-semibold leading-[var(--lh-snug)] tabular-nums text-text text-balance', KEEP)}>{study.result}</Heading>
        {study.measured ? <p className={cn('mt-1 text-label text-text-subtle', KEEP)}>{study.measured}</p> : null}
        <p className={cn('mt-4 text-body font-medium text-text', KEEP)}>{study.who}</p>
        <p className={cn('mt-1 flex-1 text-body text-text-muted', KEEP)}>{study.summary}</p>
        <span className="mt-5 inline-flex items-center gap-2 text-body font-medium text-text underline-offset-4 group-hover:underline">
          {study.linkLabel ?? 'Read the story'}
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        </span>
      </a>
    </article>
  )
}

export interface CaseStudyGridProps extends React.HTMLAttributes<HTMLDivElement> {
  studies: CaseStudy[]
  as?: 'h3' | 'h4'
}

export function CaseStudyGrid({ studies, as, className, ...props }: CaseStudyGridProps) {
  return (
    <div className={cn('grid gap-x-8 gap-y-12 md:grid-cols-2', studies.length >= 3 && 'lg:grid-cols-3', className)} {...props}>
      {studies.map((s) => (
        <CaseStudyCard key={s.href} study={s} as={as} />
      ))}
    </div>
  )
}
