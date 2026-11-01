import * as React from 'react'
import { cn } from './_cn'
import { useReducedMotion, useStyleOnce } from '../motion/_motion'

// Curved stream hero: a headline over one endless row of images that flatten in the middle and bend toward the viewer
// at both edges, then fade out. This is the component for patterns/curved-image-stream-hero.md.
// Written for this registry after "Tilted Grid Hero" by ruixen.ui on 21st.dev, picked by the owner. The license could
// not be confirmed, so no code was taken; it was written from the preview video. Added on purpose: pausing on hover, on
// keyboard focus and with a visible button (automatic motion longer than five seconds needs one), a still row under
// reduced motion, and stopping off screen.

export interface StreamImage {
  src: string
  /** Read once by screen readers. Empty when the picture is decoration. */
  alt: string
}

export interface CurvedStreamHeroProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title: React.ReactNode
  description?: React.ReactNode
  /** Buttons or links under the headline. */
  actions?: React.ReactNode
  /** The pictures. Your own work, not stock. The row repeats them to fill the width. */
  images: StreamImage[]
  /** Card width as a share of the hero width, 0.12 to 0.45. Default 0.22, and 0.42 on a phone. */
  cardWidth?: number
  /** Pixels per second. Default 28. */
  speed?: number
  /** How far the edges bend, in degrees. Default 50. */
  bend?: number
  pauseLabel?: string
  playLabel?: string
}

const CSS = `
.ds-cstream{display:flex;flex-direction:column;align-items:center;gap:var(--sp-8);padding-block:var(--sp-16);text-align:center;overflow:hidden}
.ds-cstream-copy{display:flex;flex-direction:column;align-items:center;gap:var(--sp-4);max-width:40rem;padding-inline:var(--sp-4)}
.ds-cstream-title{margin:0;font-size:clamp(var(--t-h1),5vw,calc(var(--t-display)*1.5));line-height:var(--lh-tight);font-weight:var(--w-semi);color:var(--text);text-wrap:balance}
.ds-cstream-text{margin:0;font-size:var(--t-title);line-height:var(--lh-normal);color:var(--text-muted);text-wrap:pretty}
.ds-cstream-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:var(--sp-3)}
.ds-cstream-row{position:relative;width:100%;overflow:hidden;
  -webkit-mask-image:linear-gradient(to right,transparent,currentColor 10%,currentColor 90%,transparent);mask-image:linear-gradient(to right,transparent,currentColor 10%,currentColor 90%,transparent)}
.ds-cstream-card{position:absolute;top:50%;left:0;margin:0;overflow:hidden;border-radius:var(--r-card);background:var(--bg-sunken);will-change:transform}
.ds-cstream-card img{display:block;width:100%;height:100%;object-fit:cover;-webkit-user-drag:none;user-select:none}
.ds-cstream-pause{align-self:center;min-height:44px;padding-inline:var(--sp-3);border:0;background:none;color:var(--text-muted);font:inherit;font-size:var(--t-sm);cursor:pointer}
.ds-cstream-pause:hover{color:var(--text)}
.ds-cstream-pause:focus-visible{outline:2px solid var(--ring);outline-offset:2px}
@media (hover:hover) and (pointer:fine){.ds-cstream-pause{min-height:0;padding-block:var(--sp-1)}}
`

export function CurvedStreamHero({
  title, description, actions, images, cardWidth, speed = 28, bend = 50, pauseLabel = 'Pause', playLabel = 'Play', className, ...rest
}: CurvedStreamHeroProps) {
  useStyleOnce('ds-cstream', CSS)
  const row = React.useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const [stopped, setStopped] = React.useState(false)
  const held = React.useRef(false)
  const [copies, setCopies] = React.useState(() => Math.max(images.length, 8))

  React.useEffect(() => {
    const el = row.current
    if (!el || !images.length) return
    let frame = 0
    let last = 0
    let offset = 0
    let visible = true
    let width = 0
    let card = 0
    let gap = 0
    const items = () => Array.from(el.children) as HTMLElement[]

    const paint = () => {
      const list = items()
      const pitch = card + gap
      const span = pitch * list.length
      // The cards sit on the inside of a cylinder: flat in the middle, edges turned and closer. Spacing along the curve
      // is even, so the gaps stay the same all the way out. The bend sets the radius.
      const radius = width / 2 / ((bend * Math.PI) / 180)
      list.forEach((item, i) => {
        // Wrap around the middle, so the row never ends and no card jumps in view.
        const along = ((((i * pitch - offset) % span) + span) % span) - span / 2
        const angle = along / radius
        const out = Math.abs(angle) > 1.25
        item.style.visibility = out ? 'hidden' : ''
        if (out) return
        const x = radius * Math.sin(angle)
        const z = radius * (1 - Math.cos(angle))
        item.style.transform = `translate3d(${width / 2 + x - card / 2}px,-50%,${z}px) rotateY(${-angle}rad)`
      })
    }
    const measure = () => {
      width = el.clientWidth
      const phone = width < 640
      const share = Math.max(0.12, Math.min(0.45, cardWidth ?? (phone ? 0.42 : 0.22)))
      card = width * share
      gap = card * 0.05
      const height = card * 0.68
      el.style.perspective = `${width * 1.1}px`
      // The edges come forward and grow, so the row keeps room for them.
      el.style.height = `${height * 1.9}px`
      const need = Math.ceil((width * 2) / (card + gap)) + 2
      const total = images.length * Math.ceil(need / images.length)
      setCopies((now) => (now === total ? now : total))
      for (const item of items()) {
        item.style.width = `${card}px`
        item.style.height = `${height}px`
      }
      paint()
    }
    const tick = (now: number) => {
      frame = 0
      if (!visible || document.hidden || stopped || held.current) { last = 0; return }
      offset += (Math.min(now - (last || now), 64) / 1000) * speed
      last = now
      paint()
      frame = requestAnimationFrame(tick)
    }
    const run = () => { if (!frame && !reduced && !stopped && !held.current && visible && !document.hidden) frame = requestAnimationFrame(tick) }
    const hold = () => { held.current = true }
    const release = () => { held.current = false; run() }

    measure()
    run()
    const sizes = new ResizeObserver(measure)
    sizes.observe(el)
    const seen = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; run() })
    seen.observe(el)
    el.addEventListener('pointerenter', hold)
    el.addEventListener('pointerleave', release)
    document.addEventListener('visibilitychange', run)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      sizes.disconnect()
      seen.disconnect()
      el.removeEventListener('pointerenter', hold)
      el.removeEventListener('pointerleave', release)
      document.removeEventListener('visibilitychange', run)
    }
  }, [images.length, cardWidth, speed, bend, reduced, stopped, copies])

  return (
    <section className={cn('ds-cstream', className)} {...rest}>
      <div className="ds-cstream-copy">
        <h1 className="ds-cstream-title">{title}</h1>
        {description && <p className="ds-cstream-text">{description}</p>}
        {actions && <div className="ds-cstream-actions">{actions}</div>}
      </div>
      <div ref={row} className="ds-cstream-row">
        {images.length > 0 && Array.from({ length: copies }, (_, i) => {
          const image = images[i % images.length]
          const first = i < images.length
          return (
            <figure key={i} className="ds-cstream-card" aria-hidden={first ? undefined : true}>
              <img src={image.src} alt={first ? image.alt : ''} draggable={false} />
            </figure>
          )
        })}
      </div>
      {!reduced && (
        <button type="button" className="ds-cstream-pause" aria-pressed={stopped} onClick={() => setStopped((s) => !s)}>
          {stopped ? playLabel : pauseLabel}
        </button>
      )}
    </section>
  )
}
