import * as React from 'react'
import { cn } from '../blocks/_cn'
import { resolveColor, type Rgb } from './_color'
import { useReducedMotion } from './_motion'

// Wireframe form: one thin 3D line figure turning slowly behind a hero or a sign-in screen. It takes its look from the
// brand three ways: the color reads --brand, so an absorbed theme changes it with no edit; seed turns a brand name into
// a figure of its own, the same one every time; mark extrudes the brand's own SVG path into the figure. This is the
// component for patterns/brand-wire-form.md.
// Written for this registry after "Wireframe Forms" by mengto on 21st.dev, picked by the owner. The license could not
// be confirmed, so no code was taken; it was written from the preview video. Left out on purpose: the isolated iframe,
// the fixed white color, and running while off screen.

export type WireframeShape = 'star' | 'cube' | 'cylinder' | 'icosphere' | 'generated'

type Vec = [number, number, number]
interface Geometry { points: Vec[]; edges: [number, number][] }

export interface WireframeFormProps {
  /** Built-in figure. generated builds one from seed. Default star. */
  form?: WireframeShape
  /** Any text, usually the brand name. Same text, same figure and starting angle. */
  seed?: string
  /** An SVG path d string, usually the brand mark. Extruded into the figure and takes over from form. */
  mark?: string
  /** Any CSS color or token. Default var(--brand). */
  color?: string
  /** Strength of the whole figure, 0 to 1. Default 0.6. */
  opacity?: number
  /** Line width in CSS pixels. Default 1. */
  strokeWidth?: number
  /** Small dots on the corners. Default true. */
  nodes?: boolean
  /** Rotation multiplier. 0 holds a still frame. Default 1. */
  speed?: number
  /** Figure size as a share of the shorter side, 0.2 to 1. Default 0.6. */
  scale?: number
  className?: string
  style?: React.CSSProperties
}

function hashSeed(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

function randomFrom(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function normalize([x, y, z]: Vec): Vec {
  const l = Math.hypot(x, y, z) || 1
  return [x / l, y / l, z / l]
}

function ring(n: number, y: number, r = 0.8): Vec[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    return [Math.cos(a) * r, y, Math.sin(a) * r] as Vec
  })
}

function icosphere(): Geometry {
  const t = (1 + Math.sqrt(5)) / 2
  const base: Vec[] = ([[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]] as Vec[]).map(normalize)
  const faces = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]]
  const points = [...base]
  const middle = new Map<string, number>()
  const mid = (a: number, b: number) => {
    const key = a < b ? `${a}_${b}` : `${b}_${a}`
    const found = middle.get(key)
    if (found !== undefined) return found
    const [p, q] = [points[a], points[b]]
    points.push(normalize([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2]))
    middle.set(key, points.length - 1)
    return points.length - 1
  }
  const edges = new Set<string>()
  const add = (a: number, b: number) => edges.add(a < b ? `${a}_${b}` : `${b}_${a}`)
  for (const [a, b, c] of faces) {
    const [ab, bc, ca] = [mid(a, b), mid(b, c), mid(c, a)]
    for (const [p, q, r] of [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]]) { add(p, q); add(q, r); add(r, p) }
  }
  return { points, edges: [...edges].map((e) => e.split('_').map(Number) as [number, number]) }
}

function generated(seed: string): Geometry {
  const random = randomFrom(hashSeed(seed))
  const n = 7 + Math.floor(random() * 8)
  const points = Array.from({ length: n }, (_, i): Vec => {
    // A Fibonacci sphere with a little jitter: evenly spread, never the same twice.
    const y = 1 - ((i + 0.5) / n) * 2
    const a = i * 2.39996 + random() * 0.9
    const r = Math.sqrt(1 - y * y)
    const d = 0.7 + random() * 0.3
    return [Math.cos(a) * r * d, y * d, Math.sin(a) * r * d]
  })
  const edges = new Set<string>()
  points.forEach((p, i) => {
    const near = points
      .map((q, j) => ({ j, d: Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) }))
      .filter((o) => o.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 3)
    for (const { j } of near) edges.add(i < j ? `${i}_${j}` : `${j}_${i}`)
  })
  return { points, edges: [...edges].map((e) => e.split('_').map(Number) as [number, number]) }
}

/** The points and edges of a built-in figure. */
export function wireframeGeometry(form: WireframeShape, seed = ''): Geometry {
  if (form === 'generated') return generated(seed)
  if (form === 'icosphere') return icosphere()
  if (form === 'cube') {
    const k = 0.62
    const points: Vec[] = [[-k, -k, -k], [k, -k, -k], [k, k, -k], [-k, k, -k], [-k, -k, k], [k, -k, k], [k, k, k], [-k, k, k]]
    return { points, edges: [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]] }
  }
  if (form === 'cylinder') {
    const n = 18
    const points = [...ring(n, 0.75), ...ring(n, -0.75)]
    const edges: [number, number][] = []
    for (let i = 0; i < n; i++) {
      edges.push([i, (i + 1) % n], [n + i, n + ((i + 1) % n)])
      if (i % 3 === 0) edges.push([i, n + i])
    }
    return { points, edges }
  }
  // Two tetrahedra through each other.
  const a: Vec[] = ([[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]] as Vec[]).map(normalize)
  const points = [...a, ...a.map(([x, y, z]) => [-x, -y, -z] as Vec)]
  const edges: [number, number][] = []
  for (const offset of [0, 4]) for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) edges.push([offset + i, offset + j])
  return { points, edges }
}

// Samples the path, fits it into -1..1 and gives it two faces joined every few samples. A jump between subpaths leaves
// a gap, so a mark with several parts does not grow stray lines.
function markGeometry(d: string): Geometry | null {
  if (typeof document === 'undefined') return null
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', d)
  let total = 0
  try { total = path.getTotalLength() } catch { return null }
  if (!total) return null
  const n = 72
  const step = total / n
  const flat = Array.from({ length: n }, (_, i) => path.getPointAtLength(i * step))
  const xs = flat.map((p) => p.x)
  const ys = flat.map((p) => p.y)
  const [cx, cy] = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]
  const fit = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2 || 1
  const depth = 0.22
  const points: Vec[] = []
  for (const z of [depth, -depth]) for (const p of flat) points.push([((p.x - cx) / fit) * 0.8, ((p.y - cy) / fit) * 0.8, z])
  const edges: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    if (Math.hypot(flat[j].x - flat[i].x, flat[j].y - flat[i].y) < step * 3) edges.push([i, j], [n + i, n + j])
    if (i % 9 === 0) edges.push([i, n + i])
  }
  return { points, edges }
}

export function WireframeForm({
  form = 'star', seed = '', mark, color = 'var(--brand)', opacity = 0.6, strokeWidth = 1, nodes = true, speed = 1, scale = 0.6, className, style,
}: WireframeFormProps) {
  const ref = React.useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()

  React.useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const figure = (mark && markGeometry(mark)) || wireframeGeometry(form, seed)
    const start = randomFrom(hashSeed(seed || form))
    let ay = start() * Math.PI * 2
    const ax = -0.35 + start() * 0.7
    const still = reduced || speed === 0
    let rgb: Rgb = [0, 0, 0]
    let w = 0
    let h = 0
    let frame = 0
    let last = 0
    let visible = true

    const readColor = () => { rgb = resolveColor(color, canvas) }
    const paint = () => {
      ctx.clearRect(0, 0, w, h)
      const size = Math.min(w, h) * Math.min(1, Math.max(0.2, scale)) * 0.5
      const [cosY, sinY, cosX, sinX] = [Math.cos(ay), Math.sin(ay), Math.cos(ax + Math.sin(ay * 0.5) * 0.2), Math.sin(ax + Math.sin(ay * 0.5) * 0.2)]
      const placed = figure.points.map(([x, y, z]) => {
        const x1 = x * cosY + z * sinY
        const z1 = z * cosY - x * sinY
        const y1 = y * cosX - z1 * sinX
        const z2 = y * sinX + z1 * cosX
        const near = 3 / (3 + z2)
        return { x: w / 2 + x1 * size * near, y: h / 2 + y1 * size * near, z: z2 }
      })
      const ink = (a: number) => `rgba(${Math.round(rgb[0] * 255)},${Math.round(rgb[1] * 255)},${Math.round(rgb[2] * 255)},${a})`
      ctx.lineWidth = strokeWidth
      for (const [i, j] of figure.edges) {
        const [p, q] = [placed[i], placed[j]]
        // Far lines are fainter, so the figure reads as depth with one color.
        ctx.strokeStyle = ink(opacity * (0.75 - ((p.z + q.z) / 2) * 0.35))
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(q.x, q.y)
        ctx.stroke()
      }
      if (nodes && figure.points.length <= 48) {
        ctx.fillStyle = ink(opacity)
        for (const p of placed) {
          ctx.beginPath()
          ctx.arc(p.x, p.y, strokeWidth * 1.3, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
    const tick = (now: number) => {
      frame = 0
      if (!visible || document.hidden) return
      ay += (Math.min(now - (last || now), 64) / 1000) * 0.28 * speed
      last = now
      paint()
      frame = requestAnimationFrame(tick)
    }
    const run = () => {
      if (still) { paint(); return }
      if (!frame && visible && !document.hidden) { last = 0; frame = requestAnimationFrame(tick) }
    }
    const resize = () => {
      const box = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = box.width
      h = box.height
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      paint()
    }

    readColor()
    resize()
    run()
    const sizes = new ResizeObserver(resize)
    sizes.observe(canvas)
    const seen = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; run() })
    seen.observe(canvas)
    // A theme switch or a new brand changes the tokens without a render here.
    const themes = new MutationObserver(() => { readColor(); paint() })
    themes.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] })
    document.addEventListener('visibilitychange', run)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      sizes.disconnect()
      seen.disconnect()
      themes.disconnect()
      document.removeEventListener('visibilitychange', run)
    }
  }, [form, seed, mark, color, opacity, strokeWidth, nodes, speed, scale, reduced])

  return <canvas ref={ref} aria-hidden="true" className={cn('pointer-events-none absolute inset-0 h-full w-full', className)} style={style} />
}
