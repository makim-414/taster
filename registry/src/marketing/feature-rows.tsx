import * as React from 'react'
import { cn } from '../blocks/_cn'
import { safeHref } from '../blocks/_url'

// Feature rows: one row per feature, text on one side and a real screenshot of that feature on the
// other, alternating sides on wide screens and stacking text first on phones.
// Follows patterns/real-product-frame (one hairline frame, no window chrome, a caption that says what is
// shown) and patterns/content-matched-grid (text sized to its content, no icon tiles). Rows do not share one
// fixed height: each takes the height its screenshot needs, which keeps the rhythm uneven on purpose.
// Original code, MIT.

export interface FeatureRow {
  id: string
  /** Optional sentence-case label, for example the plan or the area of the product. */
  label?: string
  title: string
  body: string
  /** Two to four short points. Leave out when the body says it. */
  points?: string[]
  link?: { label: string; href: string }
  media: { src: string; alt: string; width: number; height: number } | React.ReactNode
  caption?: string
  /** Language of this row when it differs from the page, for example "ko". */
  lang?: string
}

export interface FeatureRowsProps extends React.HTMLAttributes<HTMLDivElement> {
  rows: FeatureRow[]
  /** Start with the screenshot on the left. */
  startReversed?: boolean
  /** Heading level of each row title. Default h3, under the section's h2. */
  as?: 'h2' | 'h3'
}

const KEEP = 'break-keep [overflow-wrap:break-word]'

function isImg(m: FeatureRow['media']): m is { src: string; alt: string; width: number; height: number } {
  return !!m && typeof m === 'object' && 'src' in (m as object)
}

export function FeatureRows({ rows, startReversed = false, as: Heading = 'h3', className, ...props }: FeatureRowsProps) {
  return (
    <div className={cn('grid gap-16 lg:gap-24', className)} {...props}>
      {rows.map((r, i) => {
        const flip = (i % 2 === 1) !== startReversed
        return (
          <article
            key={r.id}
            lang={r.lang}
            className={cn(
              'grid items-center gap-8 lg:gap-16',
              flip ? 'lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]' : 'lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]',
            )}
          >
            <div className={cn('max-w-[460px]', flip && 'lg:col-start-2 lg:row-start-1')}>
              {r.label ? <p className={cn('mb-2 text-label font-medium text-text-muted', KEEP)}>{r.label}</p> : null}
              <Heading className={cn('text-h2 font-semibold leading-[var(--lh-snug)] text-text text-balance', KEEP)}>{r.title}</Heading>
              <p className={cn('mt-3 text-body leading-[var(--lh-normal)] text-text-muted text-pretty', KEEP)}>{r.body}</p>
              {r.points?.length ? (
                <ul className="m-0 mt-5 grid list-none gap-2 p-0">
                  {r.points.map((p) => (
                    <li key={p} className={cn('flex gap-3 text-body text-text', KEEP)}>
                      <span aria-hidden className="mt-[0.7em] h-px w-3 shrink-0 bg-text-subtle" />
                      {p}
                    </li>
                  ))}
                </ul>
              ) : null}
              {r.link ? (
                <a
                  href={safeHref(r.link.href)}
                  className="mt-5 inline-flex min-h-11 items-center gap-1 rounded-sm text-body font-medium text-text underline underline-offset-4 outline-none hover:text-text-muted focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {r.link.label}
                </a>
              ) : null}
            </div>
            <figure className={cn('m-0 min-w-0', flip && 'lg:col-start-1 lg:row-start-1')}>
              <div className="overflow-hidden rounded-xl border border-border bg-bg-sunken">
                {isImg(r.media) ? (
                  <img src={r.media.src} alt={r.media.alt} width={r.media.width} height={r.media.height} loading="lazy" className="block h-auto w-full" />
                ) : (
                  r.media
                )}
              </div>
              {r.caption ? <figcaption className={cn('mt-3 text-label text-text-subtle', KEEP)}>{r.caption}</figcaption> : null}
            </figure>
          </article>
        )
      })}
    </div>
  )
}
