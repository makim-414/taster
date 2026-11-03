import * as React from 'react'
import { cn } from '../blocks/_cn'
import { safeHref } from '../blocks/_url'

// Product hero: a left-weighted headline block beside a real product screen that is cropped by the
// right edge of the band, so the visual gets the larger share and reads as the actual thing, not a mockup.
// Follows patterns/asymmetric-product-hero and patterns/real-product-frame: one solid action, at most one
// text link, an optional proof line with a date, no pill, no stat strip, no window chrome.
// Pass a screenshot through `media`, or any node (a video with a poster, a result card). A label such
// as "Sample data" sits in the frame corner when the screen does not show real customer data.
// Original code, MIT.

export interface HeroAction {
  label: string
  href: string
}

export interface ProductHeroMedia {
  src: string
  alt: string
  width: number
  height: number
}

export interface ProductHeroProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** Short sentence-case line above the title. Optional; leave it out unless it adds a fact. */
  eyebrow?: string
  title: string
  lead: string
  primary: HeroAction
  secondary?: HeroAction
  /** One fact with its date, for example "412 reports run in the last 7 days. Updated 24 Oct." */
  proof?: React.ReactNode
  media: ProductHeroMedia | React.ReactNode
  /** Small label in the frame corner, for example "Sample data". */
  mediaLabel?: string
  /** One sentence under the frame on narrow screens and beside it on wide ones. */
  caption?: string
  /** Heading level of the title. The first band of a page uses h1. */
  as?: 'h1' | 'h2'
  /** Let the frame run past the right edge of the band on wide screens. Default true. */
  bleed?: boolean
}

const KEEP = 'break-keep [overflow-wrap:break-word]'
const SOLID =
  'inline-flex h-11 items-center justify-center rounded-md bg-accent px-6 text-title font-medium text-accent-fg outline-none ' +
  'transition-[opacity,transform] duration-press ease-out hover:opacity-90 active:scale-press focus-visible:ring-2 focus-visible:ring-ring'
const TEXT_LINK =
  'inline-flex min-h-11 items-center text-body font-medium text-text-muted underline-offset-4 outline-none ' +
  'hover:text-text hover:underline focus-visible:ring-2 focus-visible:ring-ring rounded-sm'

function isMedia(m: unknown): m is ProductHeroMedia {
  return !!m && typeof m === 'object' && 'src' in (m as object) && 'alt' in (m as object)
}

export function ProductHero({
  eyebrow,
  title,
  lead,
  primary,
  secondary,
  proof,
  media,
  mediaLabel,
  caption,
  as: Heading = 'h1',
  bleed = true,
  className,
  ...props
}: ProductHeroProps) {
  const titleId = React.useId()
  return (
    <section aria-labelledby={titleId} className={cn('overflow-hidden', className)} {...props}>
      <div className="grid items-center gap-12 py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:py-16">
        <div className="max-w-[460px]">
          {eyebrow ? <p className={cn('mb-3 text-label font-medium text-text-muted', KEEP)}>{eyebrow}</p> : null}
          <Heading
            id={titleId}
            className={cn('text-h1 font-semibold leading-[var(--lh-tight)] tracking-[-0.01em] text-text text-balance lg:text-display', KEEP)}
          >
            {title}
          </Heading>
          <p className={cn('mt-4 text-title font-reg leading-[var(--lh-normal)] text-text-muted text-pretty', KEEP)}>{lead}</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
            <a href={safeHref(primary.href)} className={SOLID}>
              {primary.label}
            </a>
            {secondary ? (
              <a href={safeHref(secondary.href)} className={TEXT_LINK}>
                {secondary.label}
              </a>
            ) : null}
          </div>
          {proof ? <p className={cn('mt-6 text-label tabular-nums text-text-subtle', KEEP)}>{proof}</p> : null}
        </div>
        <figure className={cn('m-0 min-w-0', bleed && 'lg:-mr-16')}>
          <div className="relative overflow-hidden rounded-xl border border-border bg-bg-sunken">
            {isMedia(media) ? (
              <img
                src={media.src}
                alt={media.alt}
                width={media.width}
                height={media.height}
                className="block h-auto w-full"
              />
            ) : (
              media
            )}
            {mediaLabel ? (
              <span className="absolute left-3 top-3 rounded-sm bg-bg px-2 py-1 text-caption text-text-muted">{mediaLabel}</span>
            ) : null}
          </div>
          {caption ? <figcaption className={cn('mt-3 text-label text-text-subtle', KEEP)}>{caption}</figcaption> : null}
        </figure>
      </div>
    </section>
  )
}
