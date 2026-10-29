import * as React from 'react'
import { Icon } from '../icons'

// Coverflow carousel: cards on a 3D shelf, the active one in front and its neighbors turned away.
// Drag, arrow keys, Home and End, and the dock buttons all move one shared index; selecting the
// front card opens a preview dialog (an image, or a YouTube trailer that loads only on demand).
// Source: "Glassy Coverflow Carousel" by troyjlorents-gh on 21st.dev
// (https://21st.dev/@troyjlorents-gh/components/glassy-coverflow-carousel), whose coverflow
// geometry is adapted from educalvolpz/coverflow-carousel on 21st.dev.
// Changes: colors map to the registry tokens instead of --color-*, lucide icons are the registry
// icon set, the radial glow behind the stage and the brand header are gone (BG-01, COL-07), the
// position reads "3 of 5" instead of "03 / 05" (LAY-03), the turn angle is a prop, and the root is a section with a min height instead of a full viewport.
// Upstream license: MIT as stated on the 21st.dev listing (no LICENSE file published),
// Copyright (c) troyjlorents-gh. Full text in THIRD_PARTY_NOTICES.md.
//
// patterns/focus-card-carousel.md is the quiet default (flat track, about 8 degrees at most). Use the
// coverflow when the items are posters or covers and browsing them is the point, not to hold copy.

export interface CoverflowItem {
  id: string
  title: string
  subtitle: string
  image: string
  description?: string
  /** The live site or page this screenshot stands for. */
  href?: string
  linkLabel?: string
  /** An official YouTube watch URL. The player loads only when the preview opens. */
  trailerUrl?: string
}

export interface CoverflowCarouselProps {
  items: CoverflowItem[]
  initialIndex?: number
  /** website: wide screenshots with a browser bar. poster: 2:3 artwork. Default website. */
  layout?: 'website' | 'poster'
  /** Degrees a neighbor turns away per step. Default 30, capped at 42. */
  tilt?: number
  /** Autoplay delay in ms, minimum 2500. Default 6000. */
  interval?: number
  /** Timed advance. Default false. Pauses on hover, focus, drag, open preview, hidden tab, reduced motion. */
  autoPlay?: boolean
  label?: string
  className?: string
  style?: React.CSSProperties
  onSelect?: (item: CoverflowItem, index: number) => void
}

const CSS = `.cf-shell{position:relative;isolation:isolate;display:grid;grid-template-rows:minmax(0,1fr) auto;min-height:560px;width:100%;padding:24px 0 28px;overflow:clip;background:var(--bg);color:var(--text)}
.cf-shell *{box-sizing:border-box}
.cf-shell button{font:inherit;color:inherit;cursor:pointer}
.cf-shell button:disabled{opacity:.35;cursor:default}
.cf-shell button:focus-visible,.cf-shell a:focus-visible{outline:2px solid var(--ring);outline-offset:5px}
.cf-stage{position:relative;min-height:0;display:flex;align-items:center;justify-content:center;perspective:1100px;transform-style:preserve-3d;touch-action:pan-y;user-select:none;cursor:grab}
.cf-stage[data-dragging]{cursor:grabbing}
.cf-floor{position:absolute;bottom:0;left:50%;width:min(600px,80vw);height:35px;transform:translate(-50%);background:radial-gradient(ellipse,rgba(0,0,0,.4),transparent 70%);filter:blur(12px);pointer-events:none}
.cf-card{position:absolute;width:var(--cf-card-width);margin:0;padding:6px;display:block;border:1px solid var(--border);border-radius:var(--r-2xl);background:var(--popover);box-shadow:var(--sh-pop);backface-visibility:hidden;transition:transform .7s var(--ease-out),opacity .5s ease;will-change:transform;text-align:center}
.cf-stage[data-dragging] .cf-card{transition:none}
.cf-poster{display:block;position:relative;width:100%;aspect-ratio:16/10;overflow:hidden;border-radius:var(--r-card);background:var(--bg-sunken)}
.cf-poster>img{width:100%;height:100%;object-fit:contain;display:block;pointer-events:none}
.cf-shade{position:absolute;inset:0;background:#000;opacity:var(--cf-shade,0);transition:opacity .4s;pointer-events:none}
.cf-bar{height:28px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 4px 8px;font-size:var(--t-caption,12px);color:var(--text-subtle)}
.cf-dots{display:flex;gap:4px}.cf-dots i{width:4px;height:4px;border-radius:50%;background:var(--border-input,var(--border))}
.cf-info{min-height:72px;padding:12px 8px;display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left}
.cf-info>span{display:flex;flex-direction:column;gap:6px;min-width:0}
.cf-info strong{font-size:15px;line-height:1.3;font-weight:600}
.cf-info>span>span{font-size:var(--t-caption,12px);color:var(--text-muted)}
.cf-bottom{position:relative;z-index:12;display:flex;align-items:center;flex-direction:column;gap:16px;padding:12px 20px 0}
.cf-active{min-height:58px;text-align:center;max-width:100%}
.cf-active h2{margin:0 0 6px;font-size:24px;font-weight:600;line-height:1.2;text-wrap:balance}
.cf-active p{margin:0;font-size:13px;line-height:1.5;color:var(--text-muted)}
.cf-dock{display:flex;align-items:center;gap:12px;padding:4px 6px 4px 18px;border:1px solid var(--border);border-radius:var(--r-pill);background:var(--popover)}
.cf-pos{display:flex;align-items:center;gap:6px;padding-right:14px;border-right:1px solid var(--border);font-size:12px;font-variant-numeric:tabular-nums;color:var(--text-muted)}
.cf-pos>span:first-child{color:var(--text)}
.cf-transport{display:flex;align-items:center;gap:2px}
.cf-dock button{border:0;background:none;display:flex;align-items:center;justify-content:center;padding:0;width:44px;height:44px;border-radius:50%;transition:background .16s}
.cf-dock button:hover,.cf-dock .cf-play[aria-pressed=true]{background:var(--bg-elev)}
.cf-hint{display:flex;align-items:center;gap:6px;margin:0;color:var(--text-subtle);font-size:12px}
.cf-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.cf-dialog{padding:0;border:1px solid var(--border);border-radius:var(--r-2xl);width:min(860px,calc(100vw - 32px));max-height:calc(100svh - 32px);background:var(--popover);color:var(--text);box-shadow:var(--sh-pop);overflow:auto}
.cf-dialog::backdrop{background:rgba(0,0,0,.7)}
.cf-dialog a:focus-visible,.cf-dialog button:focus-visible{outline:2px solid var(--ring);outline-offset:4px}
.cf-panel{padding:12px}
.cf-dbar{display:flex;align-items:center;justify-content:space-between;padding:0 4px 12px;gap:20px;font-size:12px;color:var(--text-muted)}
.cf-dbar button{background:transparent;border:1px solid var(--border);border-radius:var(--r-md);display:flex;align-items:center;gap:6px;padding:0 12px;min-height:44px;color:var(--text)}
.cf-preview{aspect-ratio:16/9;border-radius:var(--r-card);background:var(--bg-sunken);overflow:hidden}
.cf-preview>iframe,.cf-preview>img{border:0;width:100%;height:100%;object-fit:contain;display:block}
.cf-caption{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:18px 4px 6px}
.cf-caption h2{font-weight:600;font-size:22px;margin:0 0 6px}
.cf-caption p{font-size:14px;line-height:1.6;margin:0;color:var(--text-muted);max-width:540px}
.cf-caption>span{white-space:nowrap;font-size:12px;color:var(--text-subtle);margin-top:4px}
.cf-external{display:inline-flex;gap:8px;align-items:center;color:var(--accent-fg);background:var(--accent);text-decoration:none;font-size:13px;font-weight:500;margin:12px 4px 6px;padding:0 16px;border-radius:var(--r-md);min-height:44px}
.cf-shell[data-layout=poster] .cf-poster{aspect-ratio:2/3}
.cf-shell[data-layout=poster] .cf-poster>img{object-fit:cover}
.cf-watch{position:absolute;bottom:14px;left:50%;transform:translate(-50%);display:flex;align-items:center;gap:8px;min-height:44px;white-space:nowrap;border-radius:var(--r-pill);padding:0 16px;background:var(--popover);border:1px solid var(--border);font-size:12px;font-weight:600;opacity:0;transition:opacity .2s}
.cf-card[data-active] .cf-watch{opacity:1}
@media(max-width:600px){.cf-shell{min-height:520px}.cf-stage{perspective:900px}.cf-card{padding:5px}.cf-info strong{font-size:13px}.cf-active h2{font-size:21px}.cf-caption{flex-direction:column;gap:10px}}
@media(prefers-reduced-motion:reduce){.cf-card,.cf-shade,.cf-watch{transition:none!important}}`

const wrap = (value: number, length: number) => ((value % length) + length) % length

function domainOf(url?: string) {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, '') : 'Preview'
  } catch {
    return 'Preview'
  }
}

function trailerEmbed(url?: string) {
  if (!url) return undefined
  try {
    const parsed = new URL(url)
    const id =
      parsed.hostname === 'youtu.be'
        ? parsed.pathname.slice(1)
        : /(^|\.)youtube\.com$/.test(parsed.hostname)
          ? parsed.searchParams.get('v')
          : null
    return id && /^[\w-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1` : undefined
  } catch {
    return undefined
  }
}

export function CoverflowCarousel({
  items,
  initialIndex = 0,
  layout = 'website',
  tilt = 30,
  interval = 6000,
  autoPlay = false,
  label = 'Media collection',
  className = '',
  style,
  onSelect,
}: CoverflowCarouselProps) {
  const [index, setIndex] = React.useState(Number.isFinite(initialIndex) ? Math.trunc(initialIndex) : 0)
  const [playing, setPlaying] = React.useState(autoPlay)
  const [reduced, setReduced] = React.useState(false)
  const [drag, setDrag] = React.useState(0)
  const [dragging, setDragging] = React.useState(false)
  const [stageSize, setStageSize] = React.useState({ width: 1100, height: 460 })
  const [preview, setPreview] = React.useState<CoverflowItem | null>(null)
  const [pageVisible, setPageVisible] = React.useState(true)
  const [hovered, setHovered] = React.useState(false)
  const [cardFocused, setCardFocused] = React.useState(false)
  const stage = React.useRef<HTMLDivElement>(null)
  const dialog = React.useRef<HTMLDialogElement>(null)
  const gesture = React.useRef<{ x: number; y: number; time: number; horizontal: boolean } | null>(null)
  const suppressClickUntil = React.useRef(0)
  const focusSelection = React.useRef(false)
  const id = React.useId()
  const activeIndex = items.length ? wrap(index, items.length) : 0
  const active = items[activeIndex]
  const cardWidth =
    layout === 'poster'
      ? Math.min(270, stageSize.width * 0.58, Math.max(100, (stageSize.height - 28) / 1.5))
      : Math.min(420, stageSize.width * 0.72)
  const step = cardWidth * 0.78
  const turn = Math.max(0, Math.min(42, tilt))
  const running = playing && !reduced && !preview && !dragging && pageVisible && !hovered && !cardFocused && items.length > 1
  const duration = Number.isFinite(interval) ? Math.max(2500, interval) : 6000
  const before = Math.min(2, Math.floor((items.length - 1) / 2))
  const after = Math.min(2, Math.ceil((items.length - 1) / 2))
  // Offstage virtual slots recycle out of sight instead of crossing the deck at the wraparound.
  const slots = items.length > 1 ? Array.from({ length: before + after + 3 }, (_, p) => index + p - before - 1) : [index]

  React.useEffect(() => setPlaying(autoPlay), [autoPlay])
  React.useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  React.useEffect(() => {
    const el = stage.current
    if (!el) return
    const measure = () => setStageSize({ width: el.clientWidth, height: el.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [items.length > 0])
  React.useEffect(() => {
    const update = () => setPageVisible(!document.hidden)
    update()
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  React.useEffect(() => {
    if (!running) return
    const timer = setTimeout(() => setIndex((c) => c + 1), duration)
    return () => clearTimeout(timer)
  }, [running, index, duration])
  React.useEffect(() => {
    if (active) onSelect?.(active, activeIndex)
  }, [active, activeIndex, onSelect])
  React.useEffect(() => {
    if (focusSelection.current) {
      stage.current?.querySelector<HTMLButtonElement>('.cf-card[data-active]')?.focus({ preventScroll: true })
      focusSelection.current = false
    }
  }, [index])
  React.useEffect(() => {
    if (preview && dialog.current && !dialog.current.open) dialog.current.showModal()
    if (!preview && dialog.current?.open) dialog.current.close()
  }, [preview])

  const select = (next: number) => {
    setIndex(next)
    setDrag(0)
  }
  const open = (item: CoverflowItem) => {
    if (performance.now() > suppressClickUntil.current) setPreview(item)
  }
  const pointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return
    gesture.current = { x: e.clientX, y: e.clientY, time: performance.now(), horizontal: false }
  }
  const pointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = gesture.current
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (!start.horizontal && Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
      gesture.current = null
      return
    }
    if (!start.horizontal && Math.abs(dx) > 8) {
      start.horizontal = true
      e.currentTarget.setPointerCapture(e.pointerId)
      setDragging(true)
    }
    if (start.horizontal) setDrag(Math.max(-1.2, Math.min(1.2, dx / step)))
  }
  const pointerUp = (e: React.PointerEvent<HTMLDivElement>, cancel = false) => {
    const start = gesture.current
    gesture.current = null
    if (start?.horizontal) {
      const dx = e.clientX - start.x
      const velocity = Math.abs(dx) / Math.max(1, performance.now() - start.time)
      if (!cancel && (Math.abs(dx) > Math.min(55, cardWidth * 0.18) || (Math.abs(dx) > 14 && velocity > 0.35)))
        setIndex((c) => c + (dx < 0 ? 1 : -1))
      suppressClickUntil.current = performance.now() + 300
    }
    setDrag(0)
    setDragging(false)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }

  if (!active) return null
  const video = trailerEmbed(preview?.trailerUrl)
  return (
    <section
      data-layout={layout}
      className={`cf-shell ${className}`}
      aria-label={label}
      aria-roledescription="carousel"
      style={{ '--cf-card-width': `${cardWidth}px`, ...style } as React.CSSProperties}
      onKeyDown={(e) => {
        if (preview || e.altKey || e.ctrlKey || e.metaKey) return
        if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key))
          focusSelection.current = (e.target as HTMLElement).closest('.cf-card') !== null
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          select(index + 1)
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          select(index - 1)
        }
        if (e.key === 'Home') {
          e.preventDefault()
          select(index - activeIndex)
        }
        if (e.key === 'End') {
          e.preventDefault()
          select(index - activeIndex + items.length - 1)
        }
      }}
    >
      <style>{CSS}</style>
      <div
        className="cf-stage"
        ref={stage}
        data-dragging={dragging || undefined}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={(e) => pointerUp(e)}
        onPointerCancel={(e) => pointerUp(e, true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setCardFocused(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setCardFocused(false)
        }}
      >
        <div className="cf-floor" aria-hidden="true" />
        {slots.map((slot) => {
          const item = items[wrap(slot, items.length)]
          const d = slot - index
          const offset = d + drag
          const abs = Math.abs(offset)
          const hidden = d < -before || d > after
          const selected = slot === index
          return (
            <button
              key={slot}
              type="button"
              className="cf-card"
              data-active={selected || undefined}
              tabIndex={selected ? 0 : -1}
              aria-label={selected ? (item.trailerUrl ? `Watch ${item.title} trailer` : `Preview ${item.title}`) : `Select ${item.title}`}
              aria-current={selected ? 'true' : undefined}
              aria-hidden={hidden || undefined}
              onClick={() => {
                if (performance.now() < suppressClickUntil.current) return
                if (selected) open(item)
                else select(index + d)
              }}
              style={
                {
                  transform: `translate3d(${offset * step}px, 0, ${-Math.min(abs, 3) * 130}px) rotateY(${-Math.max(-turn * 1.4, Math.min(turn * 1.4, offset * turn))}deg) scale(${1 - Math.min(abs, 3) * 0.08})`,
                  opacity: hidden ? 0 : 1,
                  zIndex: 10 - Math.abs(d),
                  pointerEvents: hidden ? 'none' : undefined,
                  '--cf-shade': Math.min(abs, 2) * 0.19,
                } as React.CSSProperties
              }
            >
              {layout === 'website' && (
                <span className="cf-bar" aria-hidden="true">
                  <span className="cf-dots">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span>{domainOf(item.href)}</span>
                  <span />
                </span>
              )}
              <span className="cf-poster">
                <img
                  src={item.image}
                  alt={`${item.title} ${layout === 'poster' ? 'poster' : 'preview'}`}
                  draggable={false}
                  loading={Math.abs(d) < 2 ? 'eager' : 'lazy'}
                />
                <span className="cf-shade" aria-hidden="true" />
                {item.trailerUrl && (
                  <span className="cf-watch" aria-hidden="true">
                    <Icon name="play" size="sm" /> Watch trailer
                  </span>
                )}
              </span>
              {layout === 'website' && (
                <span className="cf-info">
                  <span>
                    <strong>{item.title}</strong>
                    <span>{item.subtitle}</span>
                  </span>
                  <Icon name="arrow-up-right" />
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="cf-bottom">
        <div className="cf-active">
          <h2>{active.title}</h2>
          <p>{active.subtitle}</p>
        </div>
        <div className="cf-dock" role="group" aria-label="Carousel controls">
          <span className="cf-pos" aria-hidden="true">
            <span>{activeIndex + 1}</span>
            <span>of {items.length}</span>
          </span>
          <div className="cf-transport">
            <button type="button" onClick={() => select(index - 1)} aria-label="Previous" disabled={items.length < 2}>
              <Icon name="chevron-left" />
            </button>
            <button
              type="button"
              className="cf-play"
              onClick={() => setPlaying((v) => !v)}
              aria-label={playing ? 'Pause carousel' : 'Play carousel'}
              aria-pressed={playing}
              disabled={reduced || items.length < 2}
            >
              <Icon name={playing ? 'pause' : 'play'} size="sm" />
            </button>
            <button type="button" onClick={() => select(index + 1)} aria-label="Next" disabled={items.length < 2}>
              <Icon name="chevron-right" />
            </button>
          </div>
        </div>
        <p className="cf-hint">
          <span>Drag, or</span>
          <Icon name="arrow-left" size={12} />
          <Icon name="arrow-right" size={12} />
          <span>to browse</span>
        </p>
      </div>
      <p className="cf-sr" aria-live="polite" aria-atomic="true">
        {!playing && `${active.title}. ${activeIndex + 1} of ${items.length}.`}
      </p>
      <dialog
        ref={dialog}
        className="cf-dialog"
        aria-labelledby={`${id}-title`}
        onCancel={() => setPreview(null)}
        onClose={() => setPreview(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setPreview(null)
        }}
      >
        {preview && (
          <div className="cf-panel">
            <div className="cf-dbar">
              <span>{video ? 'Official trailer' : domainOf(preview.href)}</span>
              <button type="button" onClick={() => setPreview(null)}>
                <Icon name="close" size="sm" /> Close
              </button>
            </div>
            <div className="cf-preview">
              {video ? (
                <iframe
                  src={video}
                  title={`${preview.title} official trailer`}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                <img src={preview.image} alt={`${preview.title} preview`} />
              )}
            </div>
            <div className="cf-caption">
              <div>
                <h2 id={`${id}-title`}>{preview.title}</h2>
                <p>{preview.description || preview.subtitle}</p>
              </div>
              <span>{preview.subtitle}</span>
            </div>
            {(preview.trailerUrl || preview.href) && (
              <a className="cf-external" href={preview.trailerUrl || preview.href} target="_blank" rel="noreferrer">
                {preview.trailerUrl ? 'Watch on YouTube' : preview.linkLabel || 'Visit site'} <Icon name="arrow-up-right" size="sm" />
              </a>
            )}
          </div>
        )}
      </dialog>
    </section>
  )
}
