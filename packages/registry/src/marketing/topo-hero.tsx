import * as React from 'react'
import { cn } from '../blocks/_cn'
import { safeHref } from '../blocks/_url'
import { useReducedMotion, useStyleOnce } from '../motion/_motion'
import { topoContours } from './_topo-contours'

// Topo hero: a black and white landscape photograph on a plane tilted a few degrees inside a frame, with faint
// survey contour lines drawn over the scene. A short name and a few facts (coordinates) sit in the top corners, a large
// headline on the left, a caption at the bottom left and one light action with a clipped corner at the bottom right.
// On a wide screen with a mouse the plane leans a little toward the pointer, and the text rides slightly above the
// photograph so the two move apart. It belongs to patterns/photo-led-hero.md, beside marketing/photo-hero (flat full
// bleed) and blocks/banner-hero (centered over a photo); use this one when the picture is the subject and the page can
// afford a framed, object-like hero. Text sits on the --scrim and reads --on-scrim, like marketing/photo-hero, so it
// stays light in every theme while the frame follows the theme. The contours are an SVG drawn once from a seeded noise
// field (./_topo-contours), so they cost nothing per frame and follow --on-scrim.
// Written for this registry after "Halide Topo Hero" by shivendra9795kumar on 21st.dev, picked by the owner. The
// license could not be confirmed, so no code was taken; it was written from the preview. Changed on purpose: the
// labels and the headline keep the case of the text they are given, at default tracking (AC-01), the corner labels are
// set in the interface face with tabular figures for the coordinates instead of monospace (AC-09), the headline uses
// the type scale with no gradient, the action keeps its clipped corner through clip-path but stays at least 44px with
// a visible focus ring, the tilt runs only on a wide screen without a coarse pointer and holds its resting pose under
// reduced motion, and the plane eases toward the pointer in a frame loop that stops when it settles.

export interface TopoHeroProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** The photograph. Shown in black and white unless grayscale is false. */
  image: { src: string; alt: string; position?: string }
  /** The headline. A line break in the text ("Silver\nsulphide") breaks the line; otherwise it wraps on its own. */
  title: string
  /** A short name in the top left corner, for example the series or the place. */
  eyebrow?: string
  /** A few short facts in the top right corner, one per line, for example coordinates or an altitude. */
  meta?: string[]
  /** One or two short lines at the bottom left. */
  caption?: string | string[]
  /** The one action, bottom right. */
  action?: { label: string; href: string }
  /** Show the photograph in black and white. Default true. */
  grayscale?: boolean
  /** Draw the contour lines over the photograph. Default true. */
  contours?: boolean
  /** Seed of the contour map. Same seed, same lines. Default 7. */
  seed?: number
  /** Tilt the plane and let it follow the pointer (wide screens without a coarse pointer only). Default true. */
  tilt?: boolean
  /** Heading level of the title. The first band of a page uses h1. */
  as?: 'h1' | 'h2'
}

const KEEP = 'break-keep [overflow-wrap:break-word]'
// The resting pose leans the right side away and the top back. The pointer adds a few degrees either way.
const CSS = `
.ds-topo{--topo-x:0;--topo-y:0;--topo-rx:0deg;--topo-ry:0deg;--topo-lift:0px;perspective:1600px}
.ds-topo-plane{transform-style:preserve-3d;transform:rotateX(calc(var(--topo-rx) - var(--topo-y) * 2deg)) rotateY(calc(var(--topo-ry) + var(--topo-x) * 3deg))}
.ds-topo-text{transform:translateZ(var(--topo-lift))}
.ds-topo-title{margin:0;font-size:var(--t-h1);font-size:clamp(var(--t-h1),12cqi,calc(var(--t-display) * 2.5));line-height:var(--lh-tight)}
@media (min-width:1024px) and (not (pointer:coarse)){
.ds-topo[data-tilt]{--topo-rx:3deg;--topo-ry:7deg;--topo-lift:40px}
.ds-topo[data-tilt] .ds-topo-plane{will-change:transform}
}
`
// The scrim is three plain dark bands, each only as large as the text it sits under: the left side under the headline,
// the top under the corner labels (doubled there, because a bright sky sits behind them in most landscapes) and the
// bottom under the caption. No tint, as in photo-hero. Bands instead of full-size layers keep the painted area small.
const SCRIM_LEFT = 'linear-gradient(to right, var(--scrim), var(--scrim) 25%, transparent)'
const SCRIM_TOP = 'linear-gradient(to bottom, var(--scrim), transparent), linear-gradient(to bottom, var(--scrim), transparent 85%)'
const SCRIM_BOTTOM = 'linear-gradient(to top, var(--scrim), transparent)'
// One corner cut, the size of one space step, so it scales with the density of the system.
const CLIP = 'polygon(0 0, calc(100% - var(--sp-3)) 0, 100% var(--sp-3), 100% 100%, 0 100%)'
const ACTION =
  'relative inline-flex min-h-11 items-center justify-center gap-2 px-6 text-body font-medium text-on-scrim-ink outline-none ' +
  'transition-[opacity,transform] duration-press ease-out hover:opacity-90 active:scale-press ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-on-scrim'
const DESK = '(min-width: 1024px) and (not (pointer: coarse))'

// True on a wide screen without a coarse pointer, the same test as the preset's desk: screen.
function useDesk(): boolean {
  return React.useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {}
      const mq = window.matchMedia(DESK)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(DESK).matches : false),
    () => false,
  )
}

export function TopoHero({
  image,
  title,
  eyebrow,
  meta,
  caption,
  action,
  grayscale = true,
  contours = true,
  seed = 7,
  tilt = true,
  as: Heading = 'h1',
  className,
  ...props
}: TopoHeroProps) {
  useStyleOnce('ds-topo', CSS)
  const titleId = React.useId()
  const frameRef = React.useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const desk = useDesk()
  const map = React.useMemo(() => (contours ? topoContours({ seed }) : null), [contours, seed])
  const lines = caption === undefined ? [] : Array.isArray(caption) ? caption : [caption]
  const href = action ? safeHref(action.href) : undefined

  // Pointer follow: the pointer sets a target, a frame loop eases toward it and stops once it settles, so nothing runs
  // while the pointer is still, off screen or in a hidden tab. Touch input is ignored; reduced motion keeps the pose.
  React.useEffect(() => {
    const frame = frameRef.current
    if (!frame || !tilt || reduced || !desk) return
    let raf = 0
    let tx = 0
    let ty = 0
    let x = 0
    let y = 0
    let visible = true
    const write = () => {
      frame.style.setProperty('--topo-x', x.toFixed(4))
      frame.style.setProperty('--topo-y', y.toFixed(4))
    }
    const step = () => {
      raf = 0
      x += (tx - x) * 0.08
      y += (ty - y) * 0.08
      const settled = Math.abs(tx - x) < 0.002 && Math.abs(ty - y) < 0.002
      if (settled) {
        x = tx
        y = ty
      }
      write()
      if (!settled && visible && !document.hidden) raf = requestAnimationFrame(step)
    }
    const run = () => {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(step)
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      const box = frame.getBoundingClientRect()
      if (!box.width || !box.height) return
      tx = Math.max(-1, Math.min(1, ((e.clientX - box.left) / box.width) * 2 - 1))
      ty = Math.max(-1, Math.min(1, ((e.clientY - box.top) / box.height) * 2 - 1))
      run()
    }
    const onLeave = () => {
      tx = 0
      ty = 0
      run()
    }
    const onVisibility = () => {
      if (document.hidden && raf) {
        cancelAnimationFrame(raf)
        raf = 0
      } else run()
    }
    const seen =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting
            if (!visible && raf) {
              cancelAnimationFrame(raf)
              raf = 0
            } else run()
          })
    seen?.observe(frame)
    frame.addEventListener('pointermove', onMove)
    frame.addEventListener('pointerleave', onLeave)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      seen?.disconnect()
      frame.removeEventListener('pointermove', onMove)
      frame.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('visibilitychange', onVisibility)
      frame.style.removeProperty('--topo-x')
      frame.style.removeProperty('--topo-y')
    }
  }, [tilt, reduced, desk])

  return (
    <section
      ref={frameRef}
      aria-labelledby={titleId}
      data-tilt={tilt ? '' : undefined}
      className={cn('ds-topo relative isolate overflow-hidden rounded-2xl border border-border bg-bg-elev p-3 sm:p-4 desk:p-12', className)}
      {...props}
    >
      <div className="ds-topo-plane relative grid min-h-[30rem] sm:min-h-[34rem] lg:aspect-[16/10]">
        <div className="absolute inset-0 overflow-hidden rounded-card bg-bg-sunken">
          <img
            src={image.src}
            alt={image.alt}
            decoding="async"
            className={cn('absolute inset-0 h-full w-full object-cover', grayscale && 'grayscale')}
            style={{ objectPosition: image.position ?? 'center' }}
          />
          {/* Under the scrim, so the lines fade where the text sits and stay clearest over the open middle of the scene. */}
          {map ? (
            <svg
              aria-hidden="true"
              viewBox={map.viewBox}
              preserveAspectRatio="xMidYMid slice"
              focusable="false"
              className="absolute inset-0 h-full w-full fill-none stroke-on-scrim"
            >
              <path d={map.minor} strokeOpacity={0.18} strokeWidth={1} vectorEffect="non-scaling-stroke" />
              <path d={map.index} strokeOpacity={0.36} strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
            </svg>
          ) : null}
          <div aria-hidden="true" className="absolute inset-y-0 left-0 w-3/4" style={{ background: SCRIM_LEFT }} />
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[35%]" style={{ background: SCRIM_TOP }} />
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[45%]" style={{ background: SCRIM_BOTTOM }} />
        </div>
        <div className="ds-topo-text relative grid grid-rows-[auto_1fr_auto] gap-6 p-5 [container-type:inline-size] sm:p-8 lg:p-12">
          <div className="flex items-start justify-between gap-6">
            {eyebrow ? <p className={cn('m-0 text-body font-semibold text-on-scrim', KEEP)}>{eyebrow}</p> : <span />}
            {meta && meta.length ? (
              <ul className="m-0 list-none p-0 text-right text-caption tabular-nums text-on-scrim-muted">
                {meta.map((fact, i) => (
                  <li key={i}>{fact}</li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="self-center">
            <Heading
              id={titleId}
              className={cn('ds-topo-title max-w-[14ch] whitespace-pre-line font-display font-semibold tracking-[-0.02em] text-on-scrim text-balance', KEEP)}
            >
              {title}
            </Heading>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-6">
            {lines.length ? (
              <div className="max-w-[44ch] text-label text-on-scrim-muted">
                {lines.map((line, i) => (
                  <p key={i} className={cn('m-0', KEEP)}>
                    {line}
                  </p>
                ))}
              </div>
            ) : (
              <span />
            )}
            {action ? (
              <a href={href} className={ACTION}>
                <span aria-hidden="true" className="absolute inset-0 bg-on-scrim" style={{ clipPath: CLIP }} />
                <span className="relative">{action.label}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="relative" style={{ width: 'var(--icon-sm, 16px)', height: 'var(--icon-sm, 16px)' }}>
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
