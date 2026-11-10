import * as React from 'react'
import { cn } from '../blocks/_cn'

// Gallery with lightbox: a grid of images at one aspect ratio; each opens a full-screen view with the
// large image, its caption, the position ("3 of 8") and previous and next buttons. Arrow keys move,
// Escape closes, and focus returns to the thumbnail that opened it. Built on the native <dialog> element
// (focus held inside, the page behind inert) with no dependency. Swiping is left to the browser: the
// buttons are 44px and sit outside the image, so nothing captures the page scroll.
// Follows patterns/media-thumb-strip (one ratio, alt text on every image, no hover zoom) and
// patterns/focus-card-carousel (position readout, no autoplay). Text over the dark scrim uses --on-scrim.
// Original code, MIT.

export interface GalleryImage {
  src: string
  alt: string
  /** Larger file for the lightbox. Defaults to src. */
  full?: string
  caption?: string
  width?: number
  height?: number
}

export interface GalleryLightboxProps extends React.HTMLAttributes<HTMLDivElement> {
  images: GalleryImage[]
  /** Thumbnail ratio. Default "4/3". */
  ratio?: '1/1' | '4/3' | '3/2' | '4/5'
  columns?: 2 | 3 | 4
  labels?: { open?: string; close?: string; previous?: string; next?: string; of?: string }
}

const KEEP = 'break-keep [overflow-wrap:break-word]'
const RATIO = { '1/1': 'aspect-square', '4/3': 'aspect-[4/3]', '3/2': 'aspect-[3/2]', '4/5': 'aspect-[4/5]' } as const
const COLS = { 2: 'grid-cols-2', 3: 'grid-cols-2 lg:grid-cols-3', 4: 'grid-cols-2 lg:grid-cols-4' } as const
const NAV_BTN =
  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill border border-on-scrim-muted text-on-scrim outline-none transition-opacity duration-press ease-out ' +
  'hover:opacity-80 focus-visible:ring-2 focus-visible:ring-on-scrim disabled:opacity-30'

function Glyph({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  )
}

export function GalleryLightbox({ images, ratio = '4/3', columns = 3, labels = {}, className, ...props }: GalleryLightboxProps) {
  const L = { open: 'Open image', close: 'Close', previous: 'Previous image', next: 'Next image', of: 'of', ...labels }
  const dialog = React.useRef<HTMLDialogElement>(null)
  const opener = React.useRef<HTMLButtonElement | null>(null)
  const [index, setIndex] = React.useState(0)
  const titleId = React.useId()
  const img = images[index]

  function open(i: number, el: HTMLButtonElement) {
    opener.current = el
    setIndex(i)
    dialog.current?.showModal()
  }
  const go = React.useCallback((d: number) => setIndex((i) => Math.min(images.length - 1, Math.max(0, i + d))), [images.length])

  return (
    <div className={cn('min-w-0', className)} {...props}>
      <ul className={cn('m-0 grid list-none gap-2 p-0 sm:gap-3', COLS[columns])}>
        {images.map((im, i) => (
          <li key={im.src + i} className="min-w-0">
            <button
              type="button"
              onClick={(e) => open(i, e.currentTarget)}
              className={cn('block w-full overflow-hidden rounded-md bg-bg-sunken outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)]', RATIO[ratio])}
            >
              <img src={im.src} alt={im.alt} loading="lazy" className="h-full w-full object-cover" />
              <span className="sr-only">{L.open}</span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClose={() => opener.current?.focus()}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') go(1)
          if (e.key === 'ArrowLeft') go(-1)
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close()
        }}
        className="m-0 h-full max-h-none w-full max-w-none bg-scrim p-0 backdrop:bg-scrim open:flex open:flex-col"
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-4 sm:px-6">
          <p id={titleId} className="text-label tabular-nums text-on-scrim-muted" aria-live="polite">
            {index + 1} {L.of} {images.length}
          </p>
          <button type="button" onClick={() => dialog.current?.close()} className={NAV_BTN} aria-label={L.close}>
            <Glyph d="M6 6l12 12M18 6 6 18" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 items-center gap-2 px-2 sm:gap-4 sm:px-6">
          <button type="button" onClick={() => go(-1)} disabled={index === 0} className={NAV_BTN} aria-label={L.previous}>
            <Glyph d="m15 6-6 6 6 6" />
          </button>
          <figure className="m-0 flex h-full min-w-0 flex-1 flex-col items-center justify-center">
            {img ? (
              <>
                <img
                  key={img.src}
                  src={img.full ?? img.src}
                  alt={img.alt}
                  width={img.width}
                  height={img.height}
                  className="max-h-[calc(100%-var(--sp-16))] w-auto max-w-full rounded-md object-contain"
                />
                {img.caption ? <figcaption className={cn('mt-3 max-w-[60ch] text-center text-body text-on-scrim', KEEP)}>{img.caption}</figcaption> : null}
              </>
            ) : null}
          </figure>
          <button type="button" onClick={() => go(1)} disabled={index === images.length - 1} className={NAV_BTN} aria-label={L.next}>
            <Glyph d="m9 6 6 6-6 6" />
          </button>
        </div>
        <div className="h-8 shrink-0" />
      </dialog>
    </div>
  )
}
