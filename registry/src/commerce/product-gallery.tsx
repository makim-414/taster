import * as React from 'react'
import { cn } from '../blocks/_cn'

// Product gallery: the image set of a product page. One main image at four by five and a strip of
// thumbnails, beside it on wide screens and under it on phones. A thumbnail is a button that shows its
// image; the current one carries aria-current and a full-ink outline, and the arrow keys move between
// thumbnails (roving focus), so the strip is one tab stop. Previous and next buttons sit on the main image
// for one-handed use, and the position is read out as "2 of 5".
// Follows patterns/product-detail-page (main image at 4:5 with a column or row of thumbnails) and
// patterns/media-thumb-strip. No zoom lens that follows the cursor, no autoplay.
// Original code, MIT.

export interface ProductImage {
  src: string
  alt: string
  /** Smaller file for the thumbnail. Defaults to src. */
  thumb?: string
}

export interface ProductGalleryProps extends React.HTMLAttributes<HTMLDivElement> {
  images: ProductImage[]
  labels?: { previous?: string; next?: string; of?: string; strip?: string }
}

const STEP =
  'absolute top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-pill bg-bg text-text outline-none transition-opacity duration-press ease-out ' +
  'hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring disabled:hidden'

export function ProductGallery({ images, labels = {}, className, ...props }: ProductGalleryProps) {
  const L = { previous: 'Previous image', next: 'Next image', of: 'of', strip: 'Product images', ...labels }
  const [i, setI] = React.useState(0)
  const thumbs = React.useRef<Array<HTMLButtonElement | null>>([])
  const n = images.length
  const cur = images[i]

  function go(to: number, focus = false) {
    const k = (to + n) % n
    setI(k)
    if (focus) thumbs.current[k]?.focus()
  }

  return (
    <div className={cn('grid gap-3 lg:grid-cols-[72px_minmax(0,1fr)] lg:gap-4', className)} {...props}>
      <div className="relative order-1 overflow-hidden rounded-md bg-bg-sunken lg:order-2">
        <div className="aspect-[4/5]">
          {cur ? <img key={cur.src} src={cur.src} alt={cur.alt} className="h-full w-full object-cover" /> : null}
        </div>
        {n > 1 ? (
          <>
            <button type="button" onClick={() => go(i - 1)} disabled={i === 0} className={cn(STEP, 'left-3')} aria-label={L.previous}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m15 6-6 6 6 6" />
              </svg>
            </button>
            <button type="button" onClick={() => go(i + 1)} disabled={i === n - 1} className={cn(STEP, 'right-3')} aria-label={L.next}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m9 6 6 6-6 6" />
              </svg>
            </button>
            <p className="absolute bottom-3 right-3 rounded-sm bg-bg px-2 py-1 text-caption tabular-nums text-text" aria-live="polite">
              {i + 1} {L.of} {n}
            </p>
          </>
        ) : null}
      </div>
      {n > 1 ? (
        <ul
          aria-label={L.strip}
          className="order-2 m-0 flex list-none gap-2 p-0 lg:order-1 lg:flex-col"
          onKeyDown={(e) => {
            const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
            if (k) {
              e.preventDefault()
              go(i + k, true)
            }
            if (e.key === 'Home') go(0, true)
            if (e.key === 'End') go(n - 1, true)
          }}
        >
          {images.map((im, k) => (
            <li key={im.src + k} className="w-16 shrink-0 lg:w-full">
              <button
                ref={(el) => {
                  thumbs.current[k] = el
                }}
                type="button"
                tabIndex={k === i ? 0 : -1}
                aria-current={k === i ? 'true' : undefined}
                aria-label={`${im.alt}, ${k + 1} ${L.of} ${n}`}
                onClick={() => go(k)}
                className={cn(
                  'block aspect-[4/5] w-full overflow-hidden rounded-sm bg-bg-sunken outline-none transition-opacity duration-press ease-out focus-visible:ring-2 focus-visible:ring-ring',
                  k === i ? 'ring-1 ring-text ring-offset-2 ring-offset-[color:var(--bg)]' : 'opacity-70 hover:opacity-100',
                )}
              >
                <img src={im.thumb ?? im.src} alt="" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
