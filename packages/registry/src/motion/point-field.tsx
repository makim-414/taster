import * as React from 'react'
import { cn } from '../blocks/_cn'
import { useReducedMotion } from './_motion'

// Point field: a quiet backdrop of small points that drift slowly on a 2D canvas behind a section's
// content. One neutral ink read from the tokens (the canvas takes its color from --text-subtle through
// currentColor, so a theme or a brand change follows), one to one and a half pixel points at 25 to 45
// percent opacity, depth carried by size and lightness, never by hue.
// The first frame is drawn at once and the page reads finished without it: the canvas is aria-hidden,
// ignores the pointer, and sits on the section surface. The loop pauses off screen and in a hidden tab,
// the point count follows the area (fewer on phones), the pixel ratio is capped at 2, and under reduced
// motion one still frame is drawn and nothing moves.
// Follows patterns/ambient-background: no blurred color orbs (BG-01), no neon glow (COL-03), no cursor chase,
// slower than reading speed. "wave" lays the points along slow sine bands; "drift" scatters them.
// Original code, MIT.

export interface PointFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  mode?: 'drift' | 'wave'
  /** Points per 10,000 square pixels. Default 8 (about 300 on a 1100 by 280 band), capped at 2,000. */
  density?: number
  /** 0 to 1. Default 0.35. */
  speed?: number
  /** Content drawn above the field. */
  children?: React.ReactNode
}

interface Pt {
  x: number
  y: number
  z: number
  p: number
}

export function PointField({ mode = 'wave', density = 8, speed = 0.35, className, children, ...props }: PointFieldProps) {
  const wrap = React.useRef<HTMLDivElement>(null)
  const canvas = React.useRef<HTMLCanvasElement>(null)
  const reduce = useReducedMotion()

  React.useEffect(() => {
    const host = wrap.current
    const cv = canvas.current
    const ctx = cv?.getContext('2d')
    if (!host || !cv || !ctx) return
    let w = 0
    let h = 0
    let pts: Pt[] = []
    let raf = 0
    let t = 0
    let visible = true
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    function seed() {
      const r = host!.getBoundingClientRect()
      w = Math.max(1, Math.round(r.width))
      h = Math.max(1, Math.round(r.height))
      cv!.width = Math.round(w * dpr)
      cv!.height = Math.round(h * dpr)
      const n = Math.min(2000, Math.round(((w * h) / 10000) * density))
      pts = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, z: Math.random(), p: Math.random() * Math.PI * 2 }))
    }

    function draw() {
      const color = getComputedStyle(cv!).color
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx!.clearRect(0, 0, w, h)
      ctx!.fillStyle = color
      for (const q of pts) {
        let x = q.x
        let y = q.y
        if (mode === 'wave') {
          // Each point rides a slow sine band; nearer points (higher z) move a little more.
          y = q.y + Math.sin(q.x * 0.008 + t * 0.6 + q.p * 0.15) * (10 + q.z * 14)
          x = (q.x + t * (4 + q.z * 6)) % w
        } else {
          x = (q.x + Math.cos(q.p + t * 0.2) * 12 * q.z + t * 3 * (0.5 + q.z)) % w
          y = q.y + Math.sin(q.p + t * 0.25) * 10 * q.z
        }
        ctx!.globalAlpha = 0.25 + q.z * 0.2
        const s = 1 + q.z * 0.5
        ctx!.fillRect(x, y, s, s)
      }
      ctx!.globalAlpha = 1
    }

    function loop() {
      t += 0.016 * speed * 2
      draw()
      raf = requestAnimationFrame(loop)
    }
    function start() {
      cancelAnimationFrame(raf)
      if (!reduce && visible && !document.hidden) raf = requestAnimationFrame(loop)
    }

    seed()
    draw() // the still first frame
    start()

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { seed(); draw() }) : null
    ro?.observe(host)
    const io =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver((e) => {
            visible = e.some((x) => x.isIntersecting)
            start()
          })
        : null
    io?.observe(host)
    const onVis = () => start()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
      io?.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [mode, density, speed, reduce])

  return (
    <div ref={wrap} className={cn('relative isolate overflow-hidden', className)} {...props}>
      <canvas ref={canvas} aria-hidden className="pointer-events-none absolute inset-0 -z-10 h-full w-full text-text-subtle" />
      {children}
    </div>
  )
}
