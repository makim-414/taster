'use client'

import * as React from 'react'
import { cn } from './_cn'
import { useReducedMotion } from '../motion/_motion'

// LocationExpand. One place shown as a status, such as where a delivery is, where you checked in or which office the
// team is in today: a caption above a compact card with a map glyph, an optional live status and the place name.
// Pressing the card (or Enter or Space on it) grows it in place into a quiet street sketch with a pin at the center and
// the coordinates under the name; pressing again, or Escape, closes it. For several places with a list, use
// blocks/location-map, whose sketch language (soft blocks, hairline streets, a pin in the brand token) this follows.
// No tile service, no key, no image and no network: the map is an inline SVG drawn from tokens, and `seed` changes its
// streets and blocks.
// Written for this registry after "Expand Map" by jatin-yadav05 on 21st.dev, picked by the owner. The license could
// not be confirmed, so no code was taken; it was written from the preview. Changed on purpose: no motion library, the
// growth is a CSS transition of grid columns and rows that is off under reduced motion; the map is drawn from tokens
// (lines --border, blocks --bg-sunken, pin --brand) so it follows the theme, instead of fixed dark colors; coordinates
// use tabular figures instead of a monospace face; the caption is sentence case with normal tracking; the card is a
// real 44px button with aria-expanded, aria-controls and a focus ring; the live dot holds still.

export interface LatLng {
  lat: number
  lng: number
}

/** "37.7749° N, 122.4194° W". */
export function formatCoordinates({ lat, lng }: LatLng, digits = 4): string {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lng >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(digits)}° ${ns}, ${Math.abs(lng).toFixed(digits)}° ${ew}`
}

export interface LocationExpandProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The place name on the card. */
  place?: string
  /** Language of the place name when it differs from the page, for example "ko". */
  placeLang?: string
  /** Shown under the name when the card is open, formatted with N or S and E or W. */
  coordinates?: LatLng
  /** Decimals for the coordinates. Default 4. */
  digits?: number
  /** Shows the status dot and word. Default true. */
  live?: boolean
  /** The status word. Default "Live". */
  liveLabel?: string
  /** The caption above the card, sentence case. Pass an empty string to leave it out. */
  label?: string
  /** Accessible name of the map. Default "Map around <place>"; the coordinates are added to it. */
  mapLabel?: string
  expanded?: boolean
  defaultExpanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  /** Changes the drawn streets and blocks. Default 1. */
  seed?: number
}

// The sketch is drawn 1:1 in pixels and centered on the card, so opening reveals more of it instead of zooming it.
const MAP_W = 640
const MAP_H = 400
// Closed width, and what opening adds to it. The width grows through grid columns (like the rows), never max-width.
const CLOSED_W = '17rem'
const EXTRA_W = '11rem'
// The sketch thins out toward the bottom edge, where the name and coordinates sit. Opaque text color as mask alpha.
const FADE = 'linear-gradient(to top, color-mix(in oklch, var(--text) 30%, transparent), var(--text) 45%)'

interface Block {
  x: number
  y: number
  w: number
  h: number
}

interface Sketch {
  streets: string
  avenues: string
  blocks: Block[]
}

// Small deterministic generator, so a seed draws the same map on the server and in the browser.
function random(seed: number) {
  let a = Math.floor(seed * 9973) >>> 0 || 1
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function sketch(seed: number): Sketch {
  const rand = random(seed)
  const xs: number[] = []
  for (let x = rand() * 28 - 14; x < MAP_W + 28; x += 52 + rand() * 34) xs.push(Math.round(x) + 0.5)
  const ys: number[] = []
  for (let y = rand() * 24 - 12; y < MAP_H + 24; y += 42 + rand() * 28) ys.push(Math.round(y) + 0.5)
  const avX = 1 + Math.floor(rand() * (xs.length - 2))
  const avY = 1 + Math.floor(rand() * (ys.length - 2))
  const diagonal = rand() > 0.3 ? { y0: rand() * MAP_H * 0.5 - 60, y1: MAP_H * 0.5 + rand() * MAP_H * 0.6 } : null
  const onDiagonal = (b: Block) => {
    if (!diagonal) return false
    const at = (x: number) => diagonal.y0 + ((diagonal.y1 - diagonal.y0) * x) / MAP_W
    const lo = Math.min(at(b.x), at(b.x + b.w)) - 10
    const hi = Math.max(at(b.x), at(b.x + b.w)) + 10
    return hi > b.y && lo < b.y + b.h
  }

  const blocks: Block[] = []
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const pick = rand()
      const split = rand()
      const x0 = xs[i]
      const x1 = xs[i + 1]
      const y0 = ys[j]
      const y1 = ys[j + 1]
      // Keep the pin's own block clear so the pin reads.
      if (x0 < MAP_W / 2 && x1 > MAP_W / 2 && y0 < MAP_H / 2 && y1 > MAP_H / 2) continue
      if (pick > 0.36) continue
      const inX = i === avX - 1 || i === avX ? 10 : 7
      const inY = j === avY - 1 || j === avY ? 10 : 7
      const cell = { x: x0 + inX, y: y0 + inY, w: x1 - x0 - inX * 2, h: y1 - y0 - inY * 2 }
      if (cell.w < 12 || cell.h < 12) continue
      const parts =
        split < 0.35 && cell.w > 44
          ? [
              { ...cell, w: Math.round(cell.w * 0.55) - 3 },
              { ...cell, x: cell.x + Math.round(cell.w * 0.55) + 3, w: cell.w - Math.round(cell.w * 0.55) - 3 },
            ]
          : [cell]
      for (const b of parts) if (!onDiagonal(b)) blocks.push(b)
    }
  }

  const streets =
    xs.filter((_, i) => i !== avX).map((x) => `M${x} 0V${MAP_H}`).join('') +
    ys.filter((_, j) => j !== avY).map((y) => `M0 ${y}H${MAP_W}`).join('')
  const avenues =
    `M${xs[avX]} 0V${MAP_H}M0 ${ys[avY]}H${MAP_W}` + (diagonal ? `M0 ${diagonal.y0.toFixed(1)}L${MAP_W} ${diagonal.y1.toFixed(1)}` : '')
  return { streets, avenues, blocks }
}

function MapGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="var(--icon-stroke, 2)"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z" />
      <path d="M9 4v13.5M15 6.5V20" />
    </svg>
  )
}

export function LocationExpand({
  place = 'San Francisco, CA',
  placeLang,
  coordinates = { lat: 37.7749, lng: -122.4194 },
  digits = 4,
  live = true,
  liveLabel = 'Live',
  label = 'Current location',
  mapLabel,
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  seed = 1,
  className,
  style,
  ...props
}: LocationExpandProps) {
  const [inner, setInner] = React.useState(defaultExpanded)
  const open = expanded ?? inner
  const reduced = useReducedMotion()
  const uid = React.useId()
  const captionId = `${uid}-caption`
  const placeId = `${uid}-place`
  const liveId = `${uid}-live`
  const mapId = `${uid}-map`
  const map = React.useMemo(() => sketch(seed), [seed])
  const coords = formatCoordinates(coordinates, digits)

  const set = (next: boolean) => {
    if (expanded === undefined) setInner(next)
    onExpandedChange?.(next)
  }

  // Token durations already drop to 1ms under reduced motion; this also removes the transitions and the transforms.
  const move = (value: string) => (reduced ? 'none' : value)
  const rows = move('grid-template-rows var(--dur-modal) var(--ease-in-out)')

  return (
    <div
      className={cn('grid min-w-0 gap-y-2', className)}
      style={{
        gridTemplateColumns: `minmax(0, ${CLOSED_W}) minmax(0, ${open ? EXTRA_W : '0rem'}) minmax(0, 1fr)`,
        transition: move('grid-template-columns var(--dur-modal) var(--ease-in-out)'),
        ...style,
      }}
      {...props}
    >
      {label && (
        <span id={captionId} className="col-span-full text-label text-text-muted">
          {label}
        </span>
      )}
      <div className="group relative isolate col-span-2 min-w-0 overflow-hidden rounded-xl border border-border bg-bg-elev">
        <div
          id={mapId}
          role="img"
          aria-label={`${mapLabel ?? `Map around ${place}`}, ${coords}`}
          aria-hidden={!open}
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{ opacity: open ? 1 : 0, transition: move('opacity var(--dur-modal) var(--ease-out)'), maskImage: FADE, WebkitMaskImage: FADE }}
        >
          <svg
            width={MAP_W}
            height={MAP_H}
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 max-w-none"
            style={{
              transform: `translate(-50%, -50%) scale(${open || reduced ? 1 : 1.06})`,
              transition: move('transform var(--dur-modal) var(--ease-out)'),
            }}
          >
            <g fill="var(--bg-sunken)" fillOpacity="0.7">
              {map.blocks.map((b, i) => (
                <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="5" />
              ))}
            </g>
            <path d={map.streets} fill="none" stroke="var(--border)" strokeWidth="1" />
            <path d={map.avenues} fill="none" stroke="var(--border)" strokeWidth="6" strokeLinecap="round" />
            <g
              style={{
                transform: open || reduced ? 'translateY(0)' : 'translateY(-10px)',
                opacity: open ? 1 : 0,
                transition: move(
                  `transform var(--dur-modal) var(--ease-out) ${open ? '120ms' : '0ms'}, opacity var(--dur-modal) var(--ease-out) ${open ? '120ms' : '0ms'}`,
                ),
              }}
            >
              <ellipse cx={MAP_W / 2} cy={MAP_H / 2 + 1} rx="8" ry="3" fill="var(--text)" opacity="0.2" />
              <path
                d={`M${MAP_W / 2} ${MAP_H / 2}c-2-6-13-11.5-13-21.5a13 13 0 0 1 26 0c0 10-11 15.5-13 21.5z`}
                fill="var(--brand)"
              />
              <circle cx={MAP_W / 2} cy={MAP_H / 2 - 21.5} r="4.5" fill="var(--bg)" />
            </g>
          </svg>
        </div>

        <button
          type="button"
          aria-expanded={open}
          aria-controls={mapId}
          aria-labelledby={label ? `${captionId} ${placeId}` : placeId}
          aria-describedby={live ? liveId : undefined}
          onClick={() => set(!open)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && open) {
              e.preventDefault()
              set(false)
            }
          }}
          className={cn(
            'relative grid min-h-11 w-full rounded-[inherit] p-4 text-left text-text outline-none',
            'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          )}
        >
          <span className="flex items-center justify-between gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-bg text-text-muted">
              <MapGlyph />
            </span>
            {live && (
              <span id={liveId} className="flex items-center gap-2 text-label text-text-muted">
                <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-success" />
                {liveLabel}
              </span>
            )}
          </span>

          <span className="grid" style={{ gridTemplateRows: open ? '1fr' : '0fr', transition: rows }}>
            <span className="min-h-0 overflow-hidden">
              <span className="block h-40" />
            </span>
          </span>

          <span className="mt-8 flex min-w-0 flex-col items-start">
            <span className="inline-flex max-w-full flex-col">
              <span id={placeId} lang={placeLang} className="text-title font-med text-text">
                {place}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  'mt-1 block h-px w-full transition-colors duration-press ease-out',
                  open ? 'bg-text-subtle' : 'bg-border group-hover:bg-text-subtle',
                )}
              />
            </span>
            <span className="grid w-full" style={{ gridTemplateRows: open ? '1fr' : '0fr', transition: rows }}>
              <span className="min-h-0 overflow-hidden">
                <span
                  aria-hidden="true"
                  className="block pt-2 text-caption tabular-nums text-text-muted"
                  style={{ opacity: open ? 1 : 0, transition: move('opacity var(--dur-modal) var(--ease-out)') }}
                >
                  {coords}
                </span>
              </span>
            </span>
          </span>
        </button>
      </div>
    </div>
  )
}
