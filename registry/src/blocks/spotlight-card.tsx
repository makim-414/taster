import * as React from 'react'
import { cn } from './_cn'
import { useStyleOnce } from '../motion/_motion'

// Spotlight card: a hairline card whose 1px edge catches a light that follows the pointer. The inside stays flat, so
// text keeps its contrast. One shared pointer listener feeds every card, so the light also reaches a neighbor's edge
// when the pointer is near it. This is the component for patterns/spotlight-border-card.md.
// Written for this registry after a 21st.dev "Spotlight Card" the owner picked (jahed, EaseMize UI). Its listing says
// "License: unknown", so no code was taken; only the idea of one light across neighboring cards was kept. Left out on
// purpose: the filled radial glow, the outer blur, hue that shifts with position and touch-action none, which blocked
// scrolling when a drag started on a card.

export interface SpotlightCardProps extends React.HTMLAttributes<HTMLElement> {
  /** Makes the whole card a link. */
  href?: string
  /** Light color, any CSS color or token. Default var(--text), a neutral sheen. */
  color?: string
  /** Light radius in px. Default 200. */
  radius?: number
  /** Light strength at its center, 0 to 1. Default 0.45. */
  strength?: number
}

const CSS = `
.ds-spot{position:relative;display:block;background:var(--bg-elev);border:1px solid var(--border);border-radius:var(--r-card);color:inherit;text-decoration:none}
.ds-spot::before{content:"";position:absolute;inset:-1px;padding:1px;border-radius:inherit;pointer-events:none;opacity:0;
  background:radial-gradient(var(--spot-r,200px) circle at var(--spot-x,50%) var(--spot-y,50%),color-mix(in oklch,var(--spot-c,var(--text)) calc(var(--spot-a,.45)*100%),transparent),transparent 70%);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0);
  transition:opacity var(--dur-dropdown,200ms) var(--ease-out,ease-out)}
.ds-spot[data-lit]::before{opacity:1}
a.ds-spot:focus-visible{outline:2px solid var(--ring);outline-offset:2px}
@media (hover:none),(prefers-reduced-motion:reduce){.ds-spot::before{display:none}}
`

// One listener for all cards. Positions are read once per frame, and only for cards the light can reach.
const cards = new Map<HTMLElement, number>()
let frame = 0
let px = 0
let py = 0
let listening = false

function paint() {
  frame = 0
  cards.forEach((radius, el) => {
    const r = el.getBoundingClientRect()
    const dx = Math.max(r.left - px, 0, px - r.right)
    const dy = Math.max(r.top - py, 0, py - r.bottom)
    if (Math.hypot(dx, dy) > radius) {
      el.removeAttribute('data-lit')
      return
    }
    el.style.setProperty('--spot-x', `${(px - r.left).toFixed(1)}px`)
    el.style.setProperty('--spot-y', `${(py - r.top).toFixed(1)}px`)
    el.setAttribute('data-lit', '')
  })
}
function onMove(e: PointerEvent) {
  if (e.pointerType === 'touch') return
  px = e.clientX
  py = e.clientY
  if (!frame) frame = requestAnimationFrame(paint)
}
function onLeave() {
  cards.forEach((_, el) => el.removeAttribute('data-lit'))
}
function register(el: HTMLElement, radius: number) {
  cards.set(el, radius)
  if (!listening) {
    listening = true
    document.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
  }
  return () => {
    cards.delete(el)
    if (cards.size) return
    listening = false
    document.removeEventListener('pointermove', onMove)
    document.documentElement.removeEventListener('pointerleave', onLeave)
    if (frame) cancelAnimationFrame(frame)
    frame = 0
  }
}

export function SpotlightCard({ href, color, radius = 200, strength = 0.45, className, style, children, ...props }: SpotlightCardProps) {
  useStyleOnce('ds-spotlight-card', CSS)
  const ref = React.useRef<HTMLElement | null>(null)
  React.useEffect(() => {
    if (ref.current) return register(ref.current, radius)
  }, [radius])
  const vars = {
    '--spot-r': `${radius}px`,
    '--spot-a': Math.max(0, Math.min(1, strength)),
    ...(color ? { '--spot-c': color } : null),
    ...style,
  } as React.CSSProperties
  const setRef = (el: HTMLElement | null) => {
    ref.current = el
  }
  return href ? (
    <a ref={setRef} href={href} className={cn('ds-spot', className)} style={vars} {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
      {children}
    </a>
  ) : (
    <div ref={setRef} className={cn('ds-spot', className)} style={vars} {...(props as React.HTMLAttributes<HTMLDivElement>)}>
      {children}
    </div>
  )
}
