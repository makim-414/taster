import * as React from 'react'
import { cn } from '../blocks/_cn'
import { useReducedMotion, useStyleOnce } from './_motion'

// Marquee: a row that scrolls sideways without end, for logo strips and quiet tickers.
// Source: the Magic UI "Marquee" pattern (https://magicui.design/docs/components/marquee, MIT).
// Changes: no dependency; two copies of the track loop seamlessly; pauses on hover, on keyboard focus
// and with a visible pause button (automatic motion longer than five seconds needs one); under reduced
// motion it stops and wraps into a static row; the copy is aria-hidden and inert, so items are read and
// tabbed once. See patterns/marquee-band: six or more items of the same kind, on hairlines, not in a card.
// Upstream license: MIT, Copyright (c) Magic UI. Full text in THIRD_PARTY_NOTICES.md.

const CSS =
  // Edges fade through a mask, so it works on any background and adds no color.
  '.dsg-marquee{-webkit-mask-image:linear-gradient(to right,transparent,currentColor var(--sp-8),currentColor calc(100% - var(--sp-8)),transparent);mask-image:linear-gradient(to right,transparent,currentColor var(--sp-8),currentColor calc(100% - var(--sp-8)),transparent)}' +
  '@keyframes dsg-marquee{from{transform:translateX(0)}to{transform:translateX(calc(-100% - var(--mq-gap)))}}' +
  '.dsg-marquee:not(.dsg-marquee-nohover):hover .dsg-marquee-track,.dsg-marquee:focus-within .dsg-marquee-track,.dsg-marquee[data-paused="true"] .dsg-marquee-track{animation-play-state:paused}'

export interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Seconds for one full loop. */
  durationSec?: number
  /** Space between items, any CSS length. Defaults to the 24px spacing token. */
  gap?: string
  reverse?: boolean
  pauseOnHover?: boolean
  /** Show the pause and play button. On by default. */
  controls?: boolean
  /** Labels for the button. */
  pauseLabel?: string
  playLabel?: string
}

export function Marquee({
  children,
  durationSec = 24,
  gap = '24px',
  reverse = false,
  pauseOnHover = true,
  controls = true,
  pauseLabel = 'Pause',
  playLabel = 'Play',
  className,
  ...props
}: MarqueeProps) {
  useStyleOnce('dsg-marquee-css', CSS)
  const reduced = useReducedMotion()
  const [paused, setPaused] = React.useState(false)

  if (reduced) {
    return (
      <div className={cn('flex w-full flex-wrap items-center', className)} style={{ gap }} {...props}>
        {children}
      </div>
    )
  }

  const track: React.CSSProperties = {
    ['--mq-gap' as string]: gap,
    gap,
    paddingRight: gap,
    animation: `dsg-marquee ${durationSec}s linear infinite`,
    animationDirection: reverse ? 'reverse' : 'normal',
  }
  return (
    <div className={cn('flex w-full items-center gap-3', className)} {...props}>
      <div className={cn('dsg-marquee relative flex min-w-0 flex-1 overflow-hidden', !pauseOnHover && 'dsg-marquee-nohover')} data-paused={paused}>
        {[0, 1].map((k) => (
          <div
            key={k}
            className="dsg-marquee-track flex shrink-0 items-center"
            style={track}
            aria-hidden={k === 1 || undefined}
            {...(k === 1 ? { inert: '' } : {})}
          >
            {children}
          </div>
        ))}
      </div>
      {controls ? (
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          className="shrink-0 rounded-md px-2 py-1 text-sm text-text-muted outline-none transition-colors duration-press hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
        >
          {paused ? playLabel : pauseLabel}
        </button>
      ) : null}
    </div>
  )
}
