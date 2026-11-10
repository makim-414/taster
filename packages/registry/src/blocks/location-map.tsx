'use client'

import * as React from 'react'
import { cn } from './_cn'

// LocationMap. A list of places linked to pins on a map, for "which one, and where": stores, clinics, venues,
// offices. Selecting a row or a pin selects both; hovering either highlights the other. The list is the keyboard
// path to every place, and pins are 44px buttons around a small dot.
//
// No tile service and no key: the default base is a quiet static street sketch drawn with tokens, which is enough
// to show relative position. Pass `base` to put a real static map image underneath (keep the same bounds), and
// `attribution` for its credit line. Place pins with x and y in percent of the frame, or convert latitude and
// longitude with projectToFrame(). Muted base, ink pins, the selected pin in the accent token. On wide screens a
// small card on the map names the selected place; on phones the map sits above the list and the row says it.

export interface MapPlace {
  id: string
  name: string
  detail?: string
  /** Short distance or area text, for example "1.2 km". */
  distance?: string
  /** Position in percent of the map frame, 0 to 100, from the left and from the top. */
  x: number
  y: number
}

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

/** Equirectangular projection into the frame. Fine at city scale; use the map provider's projection for more. */
export function projectToFrame(lat: number, lng: number, b: MapBounds): { x: number; y: number } {
  return {
    x: ((lng - b.west) / (b.east - b.west || 1)) * 100,
    y: ((b.north - lat) / (b.north - b.south || 1)) * 100,
  }
}

export interface LocationMapProps extends React.HTMLAttributes<HTMLDivElement> {
  places: MapPlace[]
  selectedId?: string | null
  onSelectedChange?: (id: string) => void
  /** Accessible name of the map region, for example "Map of stores". */
  label: string
  listLabel?: string
  base?: React.ReactNode
  attribution?: React.ReactNode
  emptyLabel?: React.ReactNode
}

function StreetSketch() {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className="absolute inset-0 h-full w-full">
      <rect width="400" height="300" fill="var(--bg-sunken)" />
      <path d="M0 210 C 90 190, 150 240, 240 215 S 360 170, 400 180 L400 230 C 350 222, 300 250, 240 262 S 90 238, 0 252 Z" fill="var(--bg-elev)" />
      <rect x="40" y="40" width="70" height="50" rx="4" fill="var(--bg-elev)" />
      <rect x="270" y="60" width="90" height="60" rx="4" fill="var(--bg-elev)" />
      <g fill="none" stroke="var(--bg)" strokeLinecap="round">
        <path d="M-10 130 L410 110" strokeWidth="10" />
        <path d="M150 -10 L190 310" strokeWidth="10" />
        <path d="M-10 30 L240 60 L410 20" strokeWidth="5" />
        <path d="M60 -10 L90 310" strokeWidth="5" />
        <path d="M300 -10 L280 310" strokeWidth="5" />
        <path d="M190 160 L410 150" strokeWidth="5" />
      </g>
      <g fill="none" stroke="var(--border)" strokeWidth="1">
        <path d="M-10 130 L410 110" />
        <path d="M150 -10 L190 310" />
      </g>
    </svg>
  )
}

export function LocationMap({
  places,
  selectedId,
  onSelectedChange,
  label,
  listLabel = 'Places',
  base,
  attribution,
  emptyLabel = 'No places in this area. Zoom out or clear a filter.',
  className,
  ...props
}: LocationMapProps) {
  const [own, setOwn] = React.useState<string | null>(null)
  const [hover, setHover] = React.useState<string | null>(null)
  const listRef = React.useRef<HTMLUListElement>(null)
  const rowRefs = React.useRef<Record<string, HTMLLIElement | null>>({})
  const selected = selectedId !== undefined ? selectedId : own
  const current = places.find((p) => p.id === selected)

  const select = (id: string, fromPin: boolean) => {
    if (selectedId === undefined) setOwn(id)
    onSelectedChange?.(id)
    if (!fromPin) return
    // Scroll the list box only, never the page.
    const box = listRef.current
    const row = rowRefs.current[id]
    if (!box || !row || box.scrollHeight <= box.clientHeight) return
    if (row.offsetTop < box.scrollTop) box.scrollTop = row.offsetTop
    else if (row.offsetTop + row.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = row.offsetTop + row.offsetHeight - box.clientHeight
  }

  return (
    <div className={cn('grid min-w-0 border-y border-border md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]', className)} {...props}>
      <div role="region" aria-label={label} className="relative aspect-[4/3] min-h-0 overflow-hidden bg-bg-sunken md:order-2 md:aspect-auto md:min-h-[360px]">
        {base ?? <StreetSketch />}
        {places.map((p) => {
          const on = p.id === selected
          const hot = p.id === hover
          return (
            <button
              key={p.id}
              type="button"
              aria-label={p.distance ? `${p.name}, ${p.distance}` : p.name}
              aria-pressed={on}
              onClick={() => select(p.id, true)}
              onMouseEnter={() => setHover(p.id)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(p.id)}
              onBlur={() => setHover(null)}
              className={cn(
                'absolute flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full outline-none',
                'focus-visible:ring-2 focus-visible:ring-ring',
                on ? 'z-20' : hot ? 'z-10' : 'z-0',
              )}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'block rounded-full ring-2 ring-bg transition-transform duration-press ease-out',
                  on ? 'size-4 bg-accent' : 'size-3 bg-text',
                  hot && !on && 'scale-125',
                )}
              />
            </button>
          )
        })}
        {current && (
          <div className="pointer-events-none absolute bottom-3 left-3 z-30 hidden max-w-xs rounded-md border border-border bg-bg-popover px-3 py-2 shadow-pop sm:block">
            <div className="text-sm font-medium text-text">{current.name}</div>
            {current.detail && <div className="text-label text-text-muted">{current.detail}</div>}
          </div>
        )}
        {attribution && <div className="absolute right-1 top-1 z-30 text-micro text-text-muted">{attribution}</div>}
      </div>
      <div className="min-w-0 md:order-1 md:border-r md:border-border">
        {places.length === 0 ? (
          <p className="p-4 text-sm text-text-muted">{emptyLabel}</p>
        ) : (
          <ul ref={listRef} aria-label={listLabel} className="relative max-h-[360px] divide-y divide-border overflow-y-auto">
            {places.map((p) => {
              const on = p.id === selected
              return (
                <li
                  key={p.id}
                  ref={(el) => {
                    rowRefs.current[p.id] = el
                  }}
                >
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => select(p.id, false)}
                    onMouseEnter={() => setHover(p.id)}
                    onMouseLeave={() => setHover(null)}
                    className={cn(
                      'flex min-h-11 w-full items-start justify-between gap-3 px-4 py-3 text-left outline-none',
                      'transition-colors duration-press focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                      on || p.id === hover ? 'bg-bg-elev' : 'hover:bg-bg-elev',
                    )}
                  >
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className={cn('text-sm text-text', on && 'font-medium')}>{p.name}</span>
                      {p.detail && <span className="text-label text-text-muted">{p.detail}</span>}
                    </span>
                    {p.distance && <span className="shrink-0 text-label tabular-nums text-text-subtle">{p.distance}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
