import * as React from 'react'
import { cn } from '../blocks/_cn'

// Before and after: two images of the same frame stacked in one box; the "after" image is clipped at a
// divider the reader drags, so neither image is resized or shifted. The divider is a real range input
// laid over the image, so it works with a mouse, touch, the arrow keys (Shift for bigger steps), Home and
// End, and screen readers announce the split as a percentage.
// Follows patterns/before-after-compare: one aspect ratio set once, a 2px line and a flat 44px tall grip, small
// solid labels in the corners, no autoplay sweep, no glow on the handle.
// Original code, MIT.

export interface BeforeAfterProps extends React.HTMLAttributes<HTMLDivElement> {
  before: { src: string; alt: string }
  after: { src: string; alt: string }
  /** Width over height, for example 3 / 2. */
  ratio?: number
  labels?: { before: string; after: string }
  /** Start position in percent. Default 50. */
  initial?: number
  /** Accessible name of the divider. */
  sliderLabel?: string
  caption?: string
}

export function BeforeAfter({
  before,
  after,
  ratio = 3 / 2,
  labels = { before: 'Before', after: 'After' },
  initial = 50,
  sliderLabel = 'Divider position',
  caption,
  className,
  ...props
}: BeforeAfterProps) {
  const [split, setSplit] = React.useState(initial)
  return (
    <figure className={cn('m-0 min-w-0', className)} {...props}>
      <div className="relative w-full overflow-hidden rounded-xl bg-bg-sunken select-none" style={{ aspectRatio: String(ratio), ['--split' as string]: `${split}%` }}>
        <img src={before.src} alt={before.alt} draggable={false} className="absolute inset-0 h-full w-full object-cover" />
        <img
          src={after.src}
          alt={after.alt}
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ clipPath: 'inset(0 0 0 var(--split))' }}
        />
        <span aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-on-scrim" style={{ left: 'var(--split)' }} />
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 flex h-11 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-pill border-2 border-on-scrim text-on-scrim"
          style={{ left: 'var(--split)', background: 'var(--scrim)' }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 7-5 5 5 5" />
            <path d="m15 7 5 5-5 5" />
          </svg>
        </span>
        <span className="pointer-events-none absolute left-3 top-3 rounded-sm bg-bg px-2 py-1 text-caption text-text">{labels.before}</span>
        <span className="pointer-events-none absolute right-3 top-3 rounded-sm bg-bg px-2 py-1 text-caption text-text">{labels.after}</span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={split}
          aria-label={sliderLabel}
          aria-valuetext={`${labels.before} ${split}%, ${labels.after} ${100 - split}%`}
          onChange={(e) => setSplit(Number(e.target.value))}
          className="peer absolute inset-0 h-full w-full cursor-ew-resize appearance-none bg-transparent opacity-0 [touch-action:pan-y]"
        />
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-xl peer-focus-visible:ring-2 peer-focus-visible:ring-inset peer-focus-visible:ring-ring" />
      </div>
      {caption ? <figcaption className="mt-3 break-keep text-label text-text-subtle">{caption}</figcaption> : null}
    </figure>
  )
}
