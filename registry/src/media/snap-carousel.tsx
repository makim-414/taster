import * as React from 'react'
import { cn } from '../blocks/_cn'
import { safeHref } from '../blocks/_url'
import { useReducedMotion } from '../motion/_motion'

// Snap carousel: a row of media cards that scrolls sideways with native scroll snapping, so touch,
// trackpads and Shift+wheel work as the platform expects, plus previous and next buttons and a "2 of 6"
// readout for everyone else. The next card always peeks in, which says there is more without dots.
// It never moves on its own. Buttons scroll by one card, smoothly unless reduced motion is set, and turn
// off at either end. The track is a labelled region the keyboard can focus and scroll with the arrow keys.
// Follows patterns/focus-card-carousel and patterns/media-thumb-strip: real images at one ratio, a title
// and one sentence under each, 44px buttons outside the images, no autoplay (WCAG 2.2.2), no 3D tilt.
// The track scrolls on purpose, so it carries data-taster-allow="scroll" for the RSP-05 check.
// Original code, MIT.

export interface CarouselItem {
  id: string
  image: { src: string; alt: string }
  title: string
  body?: string
  href?: string
  /** Language of the title and text when it differs from the page. */
  lang?: string
}

export interface SnapCarouselProps extends React.HTMLAttributes<HTMLElement> {
  items: CarouselItem[]
  /** Accessible name of the carousel, for example "Recent projects". */
  label: string
  ratio?: '4/5' | '1/1' | '4/3' | '16/9'
  labels?: { previous?: string; next?: string; of?: string }
}

const KEEP = 'break-keep [overflow-wrap:break-word]'
const RATIO = { '4/5': 'aspect-[4/5]', '1/1': 'aspect-square', '4/3': 'aspect-[4/3]', '16/9': 'aspect-video' } as const
const BTN =
  'inline-flex h-11 w-11 items-center justify-center rounded-pill border border-border text-text outline-none transition-colors duration-press ease-out ' +
  'hover:border-text-subtle focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40'

export function SnapCarousel({ items, label, ratio = '4/5', labels = {}, className, ...props }: SnapCarouselProps) {
  const L = { previous: 'Previous', next: 'Next', of: 'of', ...labels }
  const track = React.useRef<HTMLUListElement>(null)
  const [pos, setPos] = React.useState({ first: 0, atStart: true, atEnd: false })
  const reduce = useReducedMotion()
  const titleId = React.useId()

  const measure = React.useCallback(() => {
    const el = track.current
    if (!el) return
    const kids = Array.from(el.children) as HTMLElement[]
    const left = el.scrollLeft
    let first = 0
    kids.forEach((k, i) => {
      if (k.offsetLeft - el.offsetLeft <= left + 4) first = i
    })
    setPos({ first, atStart: left <= 2, atEnd: left + el.clientWidth >= el.scrollWidth - 2 })
  }, [])

  React.useEffect(() => {
    measure()
    const el = track.current
    if (!el) return
    el.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      el.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [measure])

  function step(d: number) {
    const el = track.current
    if (!el) return
    const kids = Array.from(el.children) as HTMLElement[]
    const target = kids[Math.min(kids.length - 1, Math.max(0, pos.first + d))]
    if (target) el.scrollTo({ left: target.offsetLeft - el.offsetLeft, behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <section aria-roledescription="carousel" aria-labelledby={titleId} className={cn('min-w-0', className)} {...props}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 id={titleId} className={cn('text-title font-semibold text-text', KEEP)}>
          {label}
        </h3>
        <div className="flex items-center gap-2">
          <p className="mr-2 text-label tabular-nums text-text-subtle" aria-live="polite">
            {Math.min(items.length, pos.first + 1)} {L.of} {items.length}
          </p>
          <button type="button" className={BTN} onClick={() => step(-1)} disabled={pos.atStart} aria-label={L.previous}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 6-6 6 6 6" />
            </svg>
          </button>
          <button type="button" className={BTN} onClick={() => step(1)} disabled={pos.atEnd} aria-label={L.next}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
      <ul
        ref={track}
        tabIndex={0}
        aria-label={label}
        data-taster-allow="scroll"
        className="m-0 flex list-none snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain rounded-sm p-0 pb-2 outline-none [scrollbar-width:thin] focus-visible:ring-2 focus-visible:ring-ring"
      >
        {items.map((it, i) => {
          const href = safeHref(it.href)
          const body = (
            <>
              <div className={cn('overflow-hidden rounded-md bg-bg-sunken', RATIO[ratio])}>
                <img src={it.image.src} alt={it.image.alt} loading="lazy" draggable={false} className="h-full w-full object-cover" />
              </div>
              <p className={cn('mt-3 text-body font-medium text-text', KEEP)}>{it.title}</p>
              {it.body ? <p className={cn('mt-1 text-label text-text-muted', KEEP)}>{it.body}</p> : null}
            </>
          )
          return (
            <li
              key={it.id}
              lang={it.lang}
              aria-roledescription="slide"
              aria-label={`${i + 1} ${L.of} ${items.length}`}
              className="w-[78%] shrink-0 snap-start sm:w-[44%] lg:w-[30%]"
            >
              {href ? (
                <a href={href} className="block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {body}
                </a>
              ) : (
                body
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
