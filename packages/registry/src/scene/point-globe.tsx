import * as React from 'react'
import { cn } from '../blocks/_cn'
import { useReducedMotion } from '../motion/_motion'

// Point globe: a sphere of evenly spaced points seen through a perspective camera, with a handful of real
// places marked on it. It can rise from the bottom edge of its box so only the upper half shows (the
// default), or sit whole. Drawn with the 2D canvas and a few lines of projection math, so there is no
// WebGL library to load and the first frame is the poster: it is drawn at once, synchronously.
// One neutral ink from the tokens (canvas currentColor, --text), depth carried by point size and opacity,
// markers as open rings in the same ink. The marker names and notes are also a real list in the DOM next
// to the canvas, so nothing important lives only inside the scene.
// Interaction: drag to turn it (touch keeps vertical page scroll, touch-action: pan-y), or focus it and use
// the arrow keys. It turns slowly by itself only while visible, stops for a while after the person moves
// it, pauses in a hidden tab, and under reduced motion draws one still frame and waits for input.
// Follows patterns/webgl-scene, form 1 (half globe): neutral color family, capped pixel ratio, no wheel
// capture, no fake data, and a fallback that is the same picture.
// Original code, MIT.

export interface GlobeMarker {
  id: string
  label: string
  lat: number
  lon: number
  /** One short line for the list, for example "Office, since 2021". */
  note?: string
}

export interface PointGlobeProps extends React.HTMLAttributes<HTMLDivElement> {
  markers?: GlobeMarker[]
  /** Accessible description of the scene, for example "Globe with our three offices marked". */
  label: string
  /** "half" rises from the bottom edge; "whole" shows the full sphere. */
  crop?: 'half' | 'whole'
  /** Number of points on the sphere. Scaled down on small boxes. Default 1400. */
  points?: number
  /** Show the marker list beside the scene. Default true. */
  list?: boolean
  listLabel?: string
  /** Height of the scene box in pixels (the cap for the half globe, which keeps a 2:1 box). Default 360. */
  height?: number
}

const RAD = Math.PI / 180

function fib(n: number) {
  const out: Array<[number, number, number]> = []
  const g = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const th = g * i
    out.push([Math.cos(th) * r, y, Math.sin(th) * r])
  }
  return out
}

function fromLatLon(lat: number, lon: number): [number, number, number] {
  const la = lat * RAD
  const lo = lon * RAD
  return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)]
}

export function PointGlobe({
  markers = [],
  label,
  crop = 'half',
  points = 1400,
  list = true,
  listLabel = 'Marked places',
  height = 360,
  className,
  ...props
}: PointGlobeProps) {
  const box = React.useRef<HTMLDivElement>(null)
  const canvas = React.useRef<HTMLCanvasElement>(null)
  const reduce = useReducedMotion()
  // Rotation lives in a ref so drawing never waits for React.
  const rot = React.useRef({ yaw: -0.4, pitch: crop === 'half' ? 0.35 : 0.2 })
  const idleUntil = React.useRef(0)
  const redraw = React.useRef<() => void>(() => {})

  React.useEffect(() => {
    const host = box.current
    const cv = canvas.current
    const ctx = cv?.getContext('2d')
    if (!host || !cv || !ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    let w = 0
    let h = 0
    let dots = fib(points)
    const marks = markers.map((m) => fromLatLon(m.lat, m.lon))
    let raf = 0
    let visible = true

    function size() {
      const r = host!.getBoundingClientRect()
      w = Math.max(1, Math.round(r.width))
      h = Math.max(1, Math.round(r.height))
      cv!.width = Math.round(w * dpr)
      cv!.height = Math.round(h * dpr)
      // Fewer points on a small box.
      const n = Math.max(300, Math.min(points, Math.round((w * h) / 140)))
      if (n !== dots.length) dots = fib(n)
    }

    function draw() {
      const ink = getComputedStyle(cv!).color
      const { yaw, pitch } = rot.current
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch)
      const R = crop === 'half' ? Math.min(w * 0.42, h * 0.95) : Math.min(w, h) * 0.42
      const ox = w / 2
      const oy = crop === 'half' ? h + R * 0.25 : h / 2
      const cam = 3.2 // camera distance in sphere radii
      const project = (p: [number, number, number]) => {
        // yaw around Y, then pitch around X
        const x1 = p[0] * cy + p[2] * sy
        const z1 = -p[0] * sy + p[2] * cy
        const y2 = p[1] * cp - z1 * sp
        const z2 = p[1] * sp + z1 * cp
        const k = cam / (cam - z2)
        return { x: ox + x1 * R * k, y: oy - y2 * R * k, z: z2, k }
      }
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx!.clearRect(0, 0, w, h)
      ctx!.fillStyle = ink
      for (const d of dots) {
        const q = project(d)
        if (q.y < -2 || q.y > h + 2) continue
        const front = (q.z + 1) / 2 // 0 back, 1 front
        ctx!.globalAlpha = 0.1 + front * front * 0.6
        const s = 0.8 + front * 1.2 * q.k
        ctx!.fillRect(q.x - s / 2, q.y - s / 2, s, s)
      }
      ctx!.strokeStyle = ink
      ctx!.lineWidth = 1.5
      for (const m of marks) {
        const q = project(m)
        if (q.z < 0.05 || q.y > h) continue
        ctx!.globalAlpha = 0.5 + q.z * 0.5
        ctx!.beginPath()
        ctx!.arc(q.x, q.y, 4 + q.z * 2, 0, Math.PI * 2)
        ctx!.stroke()
        ctx!.beginPath()
        ctx!.arc(q.x, q.y, 1.5, 0, Math.PI * 2)
        ctx!.fill()
      }
      ctx!.globalAlpha = 1
    }

    function tick() {
      if (performance.now() > idleUntil.current) rot.current.yaw += 0.0016
      draw()
      raf = requestAnimationFrame(tick)
    }
    function start() {
      cancelAnimationFrame(raf)
      if (!reduce && visible && !document.hidden) raf = requestAnimationFrame(tick)
    }
    redraw.current = draw

    size()
    draw() // poster frame, synchronous
    start()

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { size(); draw() }) : null
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
  }, [markers, points, crop, reduce])

  // Drag and keys: move the rotation, hold off the slow turn for a few seconds, draw now.
  const drag = React.useRef<{ x: number; y: number } | null>(null)
  function nudge(dYaw: number, dPitch: number) {
    const r = rot.current
    r.yaw += dYaw
    r.pitch = Math.max(-0.2, Math.min(1.1, r.pitch + dPitch))
    idleUntil.current = performance.now() + 4000
    redraw.current()
  }

  return (
    <div className={cn('grid gap-6', list && markers.length ? 'md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:items-end' : '', className)} {...props}>
      <div
        ref={box}
        role="group"
        aria-roledescription="globe"
        aria-label={`${label}. Drag or use the arrow keys to turn it.`}
        tabIndex={0}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY }
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (!drag.current) return
          const dx = e.clientX - drag.current.x
          const dy = e.clientY - drag.current.y
          drag.current = { x: e.clientX, y: e.clientY }
          nudge(dx * 0.008, dy * 0.004)
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={(e) => {
          const k = { ArrowLeft: [-0.12, 0], ArrowRight: [0.12, 0], ArrowUp: [0, -0.08], ArrowDown: [0, 0.08] }[e.key] as [number, number] | undefined
          if (k) {
            e.preventDefault()
            nudge(k[0], k[1])
          }
        }}
        className="relative min-w-0 cursor-grab overflow-hidden rounded-xl bg-bg-sunken outline-none [touch-action:pan-y] focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
        // The half globe keeps a 2:1 box so it fills the width on phones too; height is the cap.
        style={crop === 'half' ? { aspectRatio: '2 / 1', maxHeight: height, width: '100%' } : { height }}
      >
        <canvas ref={canvas} aria-hidden className="absolute inset-0 h-full w-full text-text" />
      </div>
      {list && markers.length ? (
        <div className="min-w-0">
          <p className="text-label font-medium text-text-muted">{listLabel}</p>
          <ul className="m-0 mt-2 grid list-none gap-2 p-0">
            {markers.map((m) => (
              <li key={m.id} className="break-keep text-body">
                <span className="font-medium text-text">{m.label}</span>
                {m.note ? <span className="text-text-muted">, {m.note}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
