import * as React from 'react'
import { cn } from '../blocks/_cn'
import { resolveColor, type Rgb } from '../motion/_color'
import { useReducedMotion } from '../motion/_motion'

// Noise orb: one dense wire sphere of latitude and longitude lines whose surface is pushed in and out by slow 3D noise,
// so it bulges and ripples like a living blob while it turns. Background only: it brings no text and paints on a
// transparent canvas, so the parent's surface shows through and the headline sits on top in the DOM. The lines are thin
// and translucent, the far side fainter, and where many of them bunch up at the rim they add up brighter. The color
// reads --text, so it stays one neutral ink in both themes and does not turn into a brand color behind the headline.
// See patterns/webgl-scene (form 3, backdrop) and patterns/ambient-background.
// Written for this registry after "AnomalousMatterHero" by dhileepkumargm on 21st.dev, picked by the owner. The license
// could not be confirmed, so no code was taken; it was written from the preview. Changed on purpose: a 2D canvas with
// a seeded simplex noise of its own, so it needs no 3D library; the fixed white on black is gone, the ink is a token and
// follows a theme switch; the headline is not baked in but composed on top as real text; longitude lines thin out
// toward the poles, so the poles do not become a bright knot; fewer lines on small boxes; it sizes to its parent, not
// the window; it stops off screen and in a hidden tab; reduced motion draws one still frame.

export interface NoiseOrbProps {
  /** Any CSS color or token. Default var(--text), one neutral ink in both themes. */
  color?: string
  /** Latitude lines; there are twice as many longitude lines. Fewer on small boxes. 12 to 72, default 44. */
  density?: number
  /** How far the surface bulges in and out, as a share of the radius, 0 to 0.6. Default 0.22. */
  noise?: number
  /** Speed of the turn and the morph. 0 holds a still frame. Default 1. */
  speed?: number
  /** Orb diameter before the bulges, as a share of the shorter side, 0.2 to 1.4. Default 0.78. */
  scale?: number
  /** Any text or number. The same seed gives the same lumps and starting angle. Default "noise-orb". */
  seed?: string | number
  /** Strength of the nearest lines, 0 to 1. Default 0.6. */
  opacity?: number
  className?: string
  style?: React.CSSProperties
}

type Noise3 = (x: number, y: number, z: number) => number

interface Mesh { rings: number; cols: number; count: number; dirs: Float32Array; lines: Int32Array; starts: Int32Array }

// Depth bands: a line is stroked in runs, one alpha per run, so far segments are faint and crossings still add up.
const BANDS = 6
// Camera distance in radii, and how far the north pole leans toward the viewer (radians).
const CAMERA = 3.4
const TILT = 0.4
// Smallest gap between neighboring longitude lines, in radii, before every other one stops short of the pole.
const POLE_GAP = 0.034
const GRAD = [1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1]

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

function hashSeed(seed: string | number) {
  if (typeof seed === 'number') return Math.floor(Math.abs(seed)) >>> 0
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
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

// Simplex noise in three dimensions with a permutation shuffled from the seed. Smooth, about -1 to 1.
function simplex3(random: () => number): Noise3 {
  const p = new Uint8Array(256)
  for (let i = 0; i < 256; i++) p[i] = i
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const t = p[i]
    p[i] = p[j]
    p[j] = t
  }
  const perm = new Uint8Array(512)
  const grad = new Uint8Array(512)
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255]
    grad[i] = (perm[i] % 12) * 3
  }
  const F = 1 / 3
  const G = 1 / 6
  const corner = (g: number, x: number, y: number, z: number) => {
    let t = 0.6 - x * x - y * y - z * z
    if (t < 0) return 0
    t *= t
    return t * t * (GRAD[g] * x + GRAD[g + 1] * y + GRAD[g + 2] * z)
  }
  return (x, y, z) => {
    const s = (x + y + z) * F
    const i = Math.floor(x + s)
    const j = Math.floor(y + s)
    const k = Math.floor(z + s)
    const t = (i + j + k) * G
    const x0 = x - i + t
    const y0 = y - j + t
    const z0 = z - k + t
    // Which of the six tetrahedra of the skewed cube the point is in.
    let i1 = 0, j1 = 0, k1 = 0, i2 = 0, j2 = 0, k2 = 0
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; i2 = 1; j2 = 1 }
      else if (x0 >= z0) { i1 = 1; i2 = 1; k2 = 1 }
      else { k1 = 1; i2 = 1; k2 = 1 }
    } else if (y0 < z0) { k1 = 1; j2 = 1; k2 = 1 }
    else if (x0 < z0) { j1 = 1; j2 = 1; k2 = 1 }
    else { j1 = 1; i2 = 1; j2 = 1 }
    const ii = i & 255
    const jj = j & 255
    const kk = k & 255
    return 32 * (
      corner(grad[ii + perm[jj + perm[kk]]], x0, y0, z0) +
      corner(grad[ii + i1 + perm[jj + j1 + perm[kk + k1]]], x0 - i1 + G, y0 - j1 + G, z0 - k1 + G) +
      corner(grad[ii + i2 + perm[jj + j2 + perm[kk + k2]]], x0 - i2 + 2 * G, y0 - j2 + 2 * G, z0 - k2 + 2 * G) +
      corner(grad[ii + 1 + perm[jj + 1 + perm[kk + 1]]], x0 - 1 + 3 * G, y0 - 1 + 3 * G, z0 - 1 + 3 * G)
    )
  }
}

// A latitude and longitude grid on the unit sphere, and the vertex order of every line through it. Longitude lines
// come in levels (every 8th, 4th, 2nd, then all); a level stops at the latitude where its lines would crowd closer
// than POLE_GAP, so only a few reach the pole.
function buildMesh(rings: number): Mesh {
  const rows = rings + 1
  const cols = rings * 2
  const count = (rows + 1) * cols
  const dirs = new Float32Array(count * 3)
  for (let i = 0; i <= rows; i++) {
    const phi = (i / rows) * Math.PI
    for (let j = 0; j < cols; j++) {
      const theta = (j / cols) * Math.PI * 2
      const v = (i * cols + j) * 3
      dirs[v] = Math.sin(phi) * Math.cos(theta)
      dirs[v + 1] = Math.cos(phi)
      dirs[v + 2] = Math.sin(phi) * Math.sin(theta)
    }
  }
  const reach = (j: number) => {
    const step = j === 0 ? 8 : Math.min(8, j & -j)
    if (step >= 8) return 0
    const lines = cols / step
    for (let i = 1; i < rows / 2; i++) if ((2 * Math.PI * Math.sin((i / rows) * Math.PI)) / lines >= POLE_GAP) return i
    return Math.floor(rows / 2)
  }
  const order: number[] = []
  const starts: number[] = []
  for (let i = 1; i < rows; i++) {
    starts.push(order.length)
    for (let j = 0; j <= cols; j++) order.push(i * cols + (j % cols))
  }
  for (let j = 0; j < cols; j++) {
    const from = reach(j)
    starts.push(order.length)
    for (let i = from; i <= rows - from; i++) order.push(i * cols + j)
  }
  starts.push(order.length)
  return { rings, cols, count, dirs, lines: Int32Array.from(order), starts: Int32Array.from(starts) }
}

export function NoiseOrb({
  color = 'var(--text)', density = 44, noise = 0.22, speed = 1, scale = 0.78, seed = 'noise-orb', opacity = 0.6, className, style,
}: NoiseOrbProps) {
  const ref = React.useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()

  React.useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const random = randomFrom(hashSeed(seed))
    const field = simplex3(random)
    const still = reduced || speed === 0
    const amount = clamp(noise, 0, 0.6)
    const size = clamp(scale, 0.2, 1.4)
    const strength = clamp(opacity, 0, 1)
    // Alpha per depth band, faint at the back and full at the front.
    const alphas = Array.from({ length: BANDS }, (_, b) => strength * (0.1 + 0.9 * Math.pow((b + 0.5) / BANDS, 1.6)))
    let time = random() * 40
    let mesh: Mesh | null = null
    let xs = new Float32Array(0)
    let ys = new Float32Array(0)
    let zs = new Float32Array(0)
    let rgb: Rgb = [1, 1, 1]
    let w = 0
    let h = 0
    let dpr = 1
    let frame = 0
    let last = 0
    let visible = true

    const readColor = () => { rgb = resolveColor(color, canvas, [1, 1, 1]) }
    const place = (radius: number) => {
      const m = mesh
      if (!m) return
      const yaw = time * 0.12
      const drift = time * 0.2
      const [cy, sy, ct, st] = [Math.cos(yaw), Math.sin(yaw), Math.cos(TILT), Math.sin(TILT)]
      const [ox, oy] = [w / 2, h / 2]
      const reachOut = 1 + amount
      const d = m.dirs
      for (let v = 0, o = 0; v < m.count; v++, o += 3) {
        const dx = d[o]
        const dy = d[o + 1]
        const dz = d[o + 2]
        // Two octaves: broad bulges, then a finer ripple on top. The field drifts, so the lumps change shape.
        const n = field(dx * 1.2 + drift, dy * 1.2 - drift * 0.6, dz * 1.2 + drift * 0.3) * 0.78 +
          field(dx * 2.6 - drift * 0.8, dy * 2.6 + drift, dz * 2.6 + 17) * 0.22
        const r = 1 + amount * n
        const x = dx * r
        const y = dy * r
        const z = dz * r
        const x1 = x * cy + z * sy
        const z1 = z * cy - x * sy
        const y2 = y * ct - z1 * st
        const z2 = y * st + z1 * ct
        const k = CAMERA / (CAMERA - z2)
        xs[v] = ox + x1 * radius * k
        ys[v] = oy - y2 * radius * k
        zs[v] = clamp((z2 / reachOut + 1) / 2, 0, 0.999)
      }
    }
    const paint = () => {
      ctx.clearRect(0, 0, w, h)
      const radius = Math.min(w, h) * 0.5 * size
      if (radius < 4) return
      // Fewer lines on a small orb, so the mesh keeps about the same spacing in pixels and the frame stays cheap.
      const rings = Math.round(clamp(clamp(density, 12, 72) * Math.min(1, radius / 220), 12, 72))
      if (!mesh || mesh.rings !== rings) {
        mesh = buildMesh(rings)
        xs = new Float32Array(mesh.count)
        ys = new Float32Array(mesh.count)
        zs = new Float32Array(mesh.count)
      }
      place(radius)
      const { lines, starts } = mesh
      ctx.strokeStyle = `rgb(${Math.round(rgb[0] * 255)},${Math.round(rgb[1] * 255)},${Math.round(rgb[2] * 255)})`
      // At most one device pixel wide: the browser then draws hairlines, several times cheaper than a stroke outline.
      ctx.lineWidth = Math.min(0.75, 1 / dpr)
      for (let l = 0; l + 1 < starts.length; l++) {
        const end = starts[l + 1]
        let a = lines[starts[l]]
        let band = -1
        ctx.beginPath()
        ctx.moveTo(xs[a], ys[a])
        for (let s = starts[l] + 1; s < end; s++) {
          const b = lines[s]
          const next = ((zs[a] + zs[b]) * 0.5 * BANDS) | 0
          if (band !== -1 && next !== band) {
            ctx.globalAlpha = alphas[band]
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(xs[a], ys[a])
          }
          band = next
          ctx.lineTo(xs[b], ys[b])
          a = b
        }
        if (band !== -1) {
          ctx.globalAlpha = alphas[band]
          ctx.stroke()
        }
      }
      ctx.globalAlpha = 1
    }
    const tick = (now: number) => {
      frame = 0
      if (!visible || document.hidden) return
      time += (Math.min(now - (last || now), 64) / 1000) * speed
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
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = box.width
      h = box.height
      canvas.width = Math.max(1, Math.round(w * dpr))
      canvas.height = Math.max(1, Math.round(h * dpr))
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
    // A theme switch changes the tokens without a render here.
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
  }, [color, density, noise, speed, scale, seed, opacity, reduced])

  return <canvas ref={ref} aria-hidden="true" className={cn('pointer-events-none absolute inset-0 h-full w-full', className)} style={style} />
}
