import * as React from 'react'
import { cn } from '../blocks/_cn'
import { luminance, resolveColor, type Rgb } from '../motion/_color'
import { useReducedMotion } from '../motion/_motion'

// Ridge terrain: a low-poly mountain field seen from a little above, drifting slowly toward the viewer as if flying
// forward over it, with a ragged range of peaks on the skyline. Background only: it brings no text or buttons, and the
// sky is left transparent so the parent's surface shows through (that is also the fallback when WebGL is missing).
// The ground is a heightfield of ridged value noise on a staggered, jittered grid, so the facets read as triangles and
// not as a floor of tiles. The geometry and the flat shading of each facet are worked out in a few lines of projection
// math; raw WebGL only fills the triangles in one draw call with a depth test, so there is no 3D library.
// The ridges read --brand. Lit faces lean toward the lighter of --text and the fog, shaded faces toward the darker, and
// distance fades everything into a haze close to the fog, so it follows a theme switch and reads on the light theme.
// See patterns/ambient-background.md and patterns/webgl-scene.md (form 3, backdrop).
// Written for this registry after "Mountain Scene" by dhileepkumargm on 21st.dev, picked by the owner. The license could
// not be confirmed, so no code was taken; it was written from the preview. Changed on purpose: the fixed navy and blue
// are gone (tokens, so it takes the brand color and on paper the lit faces turn toward the paper, not toward ink); the
// skyline is a separate still range at the far end, so peaks never pop in while the near field drifts; the field is
// locked to the world grid, so facets keep their shape as they come closer instead of shimmering; it sizes to its
// parent, caps the grid and the pixel ratio on small boxes, paints at most 30 frames a second, stops off screen and in a
// hidden tab, and reduced motion draws one still frame.

export interface RidgeTerrainProps {
  /** Any CSS color or token for the ridges. Default var(--brand). */
  color?: string
  /** The color the far ridges fade into. Match it to the surface behind the canvas. Default var(--bg). */
  fog?: string
  /** Depth rows of the drifting field, 8 to 48. Columns follow the width; small boxes get fewer of both. Default 28. */
  detail?: number
  /** Where the skyline sits, from 0.1 (near the top) to 0.9. Default 0.36. */
  horizon?: number
  /** Ridge amplitude, 0 (flat) to 2. Default 1. */
  height?: number
  /** Forward drift multiplier. 0 holds a still frame. Default 1. */
  speed?: number
  /** A different landscape. Default 1. */
  seed?: number
  className?: string
  style?: React.CSSProperties
}

// The camera sits CAM_Y above the ground and looks level at the skyline. The focal length is set so the ground meets
// the bottom edge 1.2 camera heights ahead, which keeps the picture the same at every box size.
const CAM_Y = 1
const NEAR = 0.25 // nearest row, far below the bottom edge (the ground meets the edge at 1.2)
const LAND = 0.65 // ridges rise to full height between NEAR and here, so the nearest row is flat ground off screen
const FAR = 5.4 // where the drifting field ends and the still range begins
const FIELD_RELIEF = 0.42 // field amplitude in camera heights at height 1
const RANGE = [0, 1, 1.65, 2.25, 2.85] // range amplitude per row, front to back; the front row lies on the ground
const RANGE_STEP = 0.3 // range rows sit at FAR, FAR * 1.3, FAR * 1.6, ...
const DEPTH_MIN = 0.1
const DEPTH_MAX = FAR * (1 + RANGE_STEP * (RANGE.length - 1)) * 1.05
const DRIFT = 0.09 // world units a second at speed 1, about half a row
const FRAME_MS = 1000 / 30
const LIGHT = (() => {
  const v = [-0.72, 0.52, -0.42] // low from the upper left, a little toward the viewer
  const l = Math.hypot(v[0], v[1], v[2])
  return v.map((n) => n / l)
})()

const VERT = `attribute vec4 a_v;
uniform vec2 u_size;
varying float v_s;
void main() {
  v_s = a_v.w;
  gl_Position = vec4(a_v.x / u_size.x * 2.0 - 1.0, 1.0 - a_v.y / u_size.y * 2.0, a_v.z, 1.0);
}`

// One ramp from the darker to the lighter end, passing through the ridge color at u_at. v_s is the same on all three
// corners of a triangle, so every facet is one flat color.
const FRAG = `precision mediump float;
uniform vec3 u_dark;
uniform vec3 u_body;
uniform vec3 u_light;
uniform float u_at;
varying float v_s;
void main() {
  vec3 c = v_s <= u_at ? mix(u_dark, u_body, v_s / u_at) : mix(u_body, u_light, (v_s - u_at) / (1.0 - u_at));
  gl_FragColor = vec4(c, 1.0);
}`

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

function hash(x: number, y: number, seed: number) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967295
}

function noise(x: number, y: number, seed: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const fx = x - xi
  const fy = y - yi
  const u = fx * fx * (3 - 2 * fx)
  const v = fy * fy * (3 - 2 * fy)
  const a = hash(xi, yi, seed)
  const b = hash(xi + 1, yi, seed)
  const c = hash(xi, yi + 1, seed)
  const d = hash(xi + 1, yi + 1, seed)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

// Ridged fractal noise: sharp crests, soft valleys, scaled by a broad swell so some areas stay low. About 0 to 1.
function ridges(x: number, y: number, seed: number) {
  let sum = 0
  let amp = 0.55
  let norm = 0
  let fx = x
  let fy = y
  for (let o = 0; o < 4; o++) {
    const n = 1 - Math.abs(noise(fx, fy, seed + o * 31) * 2 - 1)
    sum += n * n * amp
    norm += amp
    amp *= 0.5
    fx = fx * 2.07 + 13.1
    fy = fy * 2.07 + 7.7
  }
  const swell = noise(x * 0.35 + 5.3, y * 0.35 + 1.9, seed + 97)
  return Math.pow(sum / norm, 1.1) * (0.4 + swell)
}

interface Palette { dark: Rgb; body: Rgb; light: Rgb; at: number; shadow: number; lit: number; haze: number }

// The ramp runs from the darker to the lighter of --text and the fog and passes through the ridge color where its
// lightness falls. Shading picks a step on it: on a dark sky the haze sits a little above the sky and lit faces climb
// toward --text; on paper the haze is a light gray and lit faces turn toward the paper, so it never becomes a block of ink.
function palette(color: string, fog: string, el: Element): Palette {
  const sky = resolveColor(fog, el)
  const ink = resolveColor('var(--text)', el, [1, 1, 1])
  const body = resolveColor(color, el, [1, 1, 1])
  const lightSky = luminance(sky) > 0.5
  const dark = lightSky ? ink : sky
  const light = lightSky ? sky : ink
  const lo = luminance(dark)
  const hi = luminance(light)
  const at = clamp(hi - lo > 0.01 ? (luminance(body) - lo) / (hi - lo) : 0.5, 0.15, 0.85)
  return lightSky
    ? { dark, body, light, at, shadow: 0.56, lit: 0.98, haze: 0.86 }
    : { dark, body, light, at, shadow: 0.1, lit: 0.54, haze: 0.25 }
}

// One grid of vertices: world position (x, height, depth ahead of the camera) and screen position in CSS pixels.
interface Grid { x: Float32Array; y: Float32Array; d: Float32Array; sx: Float32Array; sy: Float32Array }
const grid = (n: number): Grid => ({
  x: new Float32Array(n), y: new Float32Array(n), d: new Float32Array(n), sx: new Float32Array(n), sy: new Float32Array(n),
})

// Depth for the depth test. 1/d is what stays linear across a projected triangle.
const depthOf = (d: number) => clamp((2 * (1 - DEPTH_MIN / d)) / (1 - DEPTH_MIN / DEPTH_MAX) - 1, -1, 1)

// Writes the triangles of a grid into `out` as (x, y, depth, shade) per corner and returns the vertex count. Rows are
// staggered by half a cell, so each strip alternates its diagonal. `fog` gives the haze for a depth and height, `odd`
// the stagger of a row. Cells wholly off screen are skipped.
function build(
  out: Float32Array, g: Grid, cols: number, rows: number, w: number, h: number, pal: Palette,
  fog: (d: number, y: number) => number, odd: (row: number) => boolean,
) {
  const stride = cols + 1
  let n = 0
  const shade = (p: number, q: number, r: number) => {
    const ux = g.x[q] - g.x[p], uy = g.y[q] - g.y[p], uz = g.d[q] - g.d[p]
    const vx = g.x[r] - g.x[p], vy = g.y[r] - g.y[p], vz = g.d[r] - g.d[p]
    let nx = uy * vz - uz * vy
    let ny = uz * vx - ux * vz
    let nz = ux * vy - uy * vx
    if (ny < 0) { nx = -nx; ny = -ny; nz = -nz }
    const len = Math.hypot(nx, ny, nz) || 1
    const lambert = Math.max(0, (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / len)
    const s = pal.shadow + (pal.lit - pal.shadow) * lambert
    return s + (pal.haze - s) * fog((g.d[p] + g.d[q] + g.d[r]) / 3, (g.y[p] + g.y[q] + g.y[r]) / 3)
  }
  const put = (x: number, y: number, d: number, s: number) => {
    out[n * 4] = x
    out[n * 4 + 1] = y
    out[n * 4 + 2] = depthOf(d)
    out[n * 4 + 3] = s
    n++
  }
  const tri = (p: number, q: number, r: number) => {
    const s = shade(p, q, r)
    put(g.sx[p], g.sy[p], g.d[p], s)
    put(g.sx[q], g.sy[q], g.d[q], s)
    put(g.sx[r], g.sy[r], g.d[r], s)
  }
  for (let row = 0; row < rows; row++) {
    const shifted = odd(row)
    for (let i = 0; i < cols; i++) {
      const a = row * stride + i
      const b = a + stride
      const left = Math.min(g.sx[a], g.sx[b])
      const right = Math.max(g.sx[a + 1], g.sx[b + 1])
      if (right < -4 || left > w + 4) continue
      if (Math.min(g.sy[a], g.sy[a + 1], g.sy[b], g.sy[b + 1]) > h + 4) continue
      if (shifted) {
        tri(a, a + 1, b + 1)
        tri(a, b + 1, b)
      } else {
        tri(a, a + 1, b)
        tri(a + 1, b + 1, b)
      }
    }
  }
  return n
}

// React StrictMode and prop changes run the effect again on the same canvas, so the context is released a tick late
// and the release is called off when the canvas is picked up again.
const pendingRelease = new WeakMap<HTMLCanvasElement, number>()

export function RidgeTerrain({
  color = 'var(--brand)', fog = 'var(--bg)', detail = 28, horizon = 0.36, height = 1, speed = 1, seed = 1, className, style,
}: RidgeTerrainProps) {
  const ref = React.useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()
  // The flight distance survives prop changes, so a new speed or color does not jump the landscape back.
  const travelled = React.useRef(0)
  const [restored, setRestored] = React.useState(0)

  React.useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const waiting = pendingRelease.get(canvas)
    if (waiting !== undefined) window.clearTimeout(waiting)
    pendingRelease.delete(canvas)
    const found = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true, depth: true })
    if (!found || found.isContextLost()) return
    const gl: WebGLRenderingContext = found

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)
      if (!s) return null
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }
    const program = gl.createProgram()
    const vs = compile(gl.VERTEX_SHADER, VERT)
    const fs = compile(gl.FRAGMENT_SHADER, FRAG)
    if (!program || !vs || !fs) return
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return
    gl.useProgram(program)
    const attr = gl.getAttribLocation(program, 'a_v')
    gl.enableVertexAttribArray(attr)
    const uni = {
      size: gl.getUniformLocation(program, 'u_size'),
      dark: gl.getUniformLocation(program, 'u_dark'),
      body: gl.getUniformLocation(program, 'u_body'),
      light: gl.getUniformLocation(program, 'u_light'),
      at: gl.getUniformLocation(program, 'u_at'),
    }
    const fieldBuf = gl.createBuffer()
    const rangeBuf = gl.createBuffer()
    gl.enable(gl.DEPTH_TEST)
    gl.depthFunc(gl.LEQUAL)

    const still = reduced || speed === 0
    const relief = clamp(height, 0, 2)
    const seedInt = Math.round(seed * 7919) | 0
    let pal = palette(color, fog, canvas)
    let w = 0
    let h = 0
    let hy = 0
    let f = 1
    let rows = 0
    let cols = 0
    let dz = 1
    let dx = 1
    let field = grid(1)
    let fieldOut = new Float32Array(4)
    let rangeCount = 0
    const rowsCache = new Map<number, Float32Array>()
    let frame = 0
    let last = 0
    let painted = 0
    let visible = true
    let lost = false

    // One world row of the field: jittered x and z offsets and the height, 0 to 1, for each column. Kept while on screen.
    const fieldRow = (j: number) => {
      let row = rowsCache.get(j)
      if (!row) {
        row = new Float32Array((cols + 1) * 3)
        for (let i = 0; i <= cols; i++) {
          const x = (i - cols / 2 + (j & 1) * 0.5 + (hash(i, j, seedInt + 7) - 0.5) * 0.4) * dx
          const z = (j + (hash(i, j, seedInt + 11) - 0.5) * 0.4) * dz
          row[i * 3] = x
          row[i * 3 + 1] = z
          row[i * 3 + 2] = ridges(x / 1.15, z / 1.15, seedInt)
        }
        rowsCache.set(j, row)
      }
      return row
    }

    const project = (g: Grid, k: number, x: number, y: number, d: number) => {
      g.x[k] = x
      g.y[k] = y
      g.d[k] = d
      g.sx[k] = w / 2 + (x * f) / d
      g.sy[k] = hy + ((CAM_Y - y) * f) / d
    }

    // The still range behind the field: five rows of taller ridges, built once per size, seed or theme.
    const buildRange = () => {
      const rr = RANGE.length - 1
      const depth = (r: number) => FAR * (1 + RANGE_STEP * r)
      const step = dx * 2
      const half = ((w / 2) * depth(rr)) / f + step * 2
      const n = Math.min(96, Math.ceil((2 * half) / step))
      const g = grid((n + 1) * (rr + 1))
      for (let r = 0; r <= rr; r++) {
        for (let i = 0; i <= n; i++) {
          const x = (i - n / 2 + (r & 1) * 0.5 + (hash(i, r, seedInt + 29) - 0.5) * 0.4) * step
          const d = depth(r) * (r ? 1 + (hash(i, r, seedInt + 31) - 0.5) * 0.08 : 1)
          project(g, r * (n + 1) + i, x, relief * RANGE[r] * ridges(x / 2.6, r * 0.85 + 3.3, seedInt + 101), d)
        }
      }
      const out = new Float32Array(n * rr * 6 * 4)
      // Haze is thick in the valleys and thin on the crests, so the foot of the range meets the far field and the peaks
      // stand out against the sky.
      rangeCount = build(out, g, n, rr, w, h, pal, (_, y) => 0.86 - 0.42 * smooth(0.05, 1.8, y), (r) => (r & 1) === 1)
      gl.bindBuffer(gl.ARRAY_BUFFER, rangeBuf)
      gl.bufferData(gl.ARRAY_BUFFER, out.subarray(0, rangeCount * 4), gl.STATIC_DRAW)
    }

    const paint = () => {
      if (lost) return
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clearColor(0, 0, 0, 0)
      gl.clearDepth(1)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      if (w < 2 || h < 2) return
      gl.uniform2f(uni.size, w, h)
      gl.uniform3fv(uni.dark, pal.dark)
      gl.uniform3fv(uni.body, pal.body)
      gl.uniform3fv(uni.light, pal.light)
      gl.uniform1f(uni.at, pal.at)

      const z = travelled.current
      const j0 = Math.ceil((z + NEAR) / dz)
      for (const key of rowsCache.keys()) if (key < j0) rowsCache.delete(key)
      const stride = cols + 1
      for (let r = 0; r <= rows; r++) {
        const j = j0 + r
        const src = fieldRow(j)
        for (let i = 0; i <= cols; i++) {
          const d = src[i * 3 + 1] - z
          // The farthest rows rise from the plain as they arrive, so nothing pops in at the back, and the rows that
          // already passed under the bottom edge settle, so no ridge reaches up from below the frame.
          const rise = (1 - smooth(0.84, 1.02, (d - NEAR) / (FAR - NEAR))) * smooth(NEAR, LAND, d)
          project(field, r * stride + i, src[i * 3], src[i * 3 + 2] * FIELD_RELIEF * relief * rise, d)
        }
      }
      const count = build(fieldOut, field, cols, rows, w, h, pal, (d) => 0.86 * smooth(0.16, 1, (d - NEAR) / (FAR - NEAR)),
        (r) => ((j0 + r) & 1) === 1)

      gl.bindBuffer(gl.ARRAY_BUFFER, rangeBuf)
      gl.vertexAttribPointer(attr, 4, gl.FLOAT, false, 0, 0)
      gl.drawArrays(gl.TRIANGLES, 0, rangeCount)
      gl.bindBuffer(gl.ARRAY_BUFFER, fieldBuf)
      gl.bufferData(gl.ARRAY_BUFFER, fieldOut.subarray(0, count * 4), gl.DYNAMIC_DRAW)
      gl.vertexAttribPointer(attr, 4, gl.FLOAT, false, 0, 0)
      gl.drawArrays(gl.TRIANGLES, 0, count)
    }

    const tick = (now: number) => {
      frame = 0
      if (!visible || document.hidden || lost) { last = 0; return }
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0
      last = now
      travelled.current += dt * speed * DRIFT
      if (now - painted >= FRAME_MS - 2) {
        painted = now
        paint()
      }
      frame = requestAnimationFrame(tick)
    }
    const run = () => {
      if (still) { paint(); return }
      if (!frame && visible && !document.hidden) frame = requestAnimationFrame(tick)
    }
    const resize = () => {
      const box = canvas.getBoundingClientRect()
      const small = box.width < 640
      const dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2)
      w = box.width
      h = box.height
      canvas.width = Math.max(1, Math.round(w * dpr))
      canvas.height = Math.max(1, Math.round(h * dpr))
      hy = h * clamp(horizon, 0.1, 0.9)
      f = 1.2 * Math.max(1, h - hy)
      rows = Math.max(8, Math.round(clamp(detail, 8, 48) * (small ? 0.8 : 1)))
      dz = (FAR - NEAR) / rows
      const half = ((w / 2) * FAR) / f + 0.6
      dx = Math.max(dz * 1.2, (2 * half) / (small ? 36 : 72))
      cols = Math.max(2, Math.ceil((2 * half) / dx))
      field = grid((rows + 1) * (cols + 1))
      fieldOut = new Float32Array(rows * cols * 6 * 4)
      rowsCache.clear()
      buildRange()
      paint()
    }
    const retheme = () => {
      pal = palette(color, fog, canvas)
      buildRange()
      paint()
    }
    const onLost = (e: Event) => {
      e.preventDefault()
      lost = true
    }
    const onRestored = () => setRestored((n) => n + 1)

    resize()
    run()
    const sizes = new ResizeObserver(resize)
    sizes.observe(canvas)
    const seen = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; run() })
    seen.observe(canvas)
    const themes = new MutationObserver(retheme)
    themes.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] })
    document.addEventListener('visibilitychange', run)
    canvas.addEventListener('webglcontextlost', onLost)
    canvas.addEventListener('webglcontextrestored', onRestored)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      sizes.disconnect()
      seen.disconnect()
      themes.disconnect()
      document.removeEventListener('visibilitychange', run)
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
      gl.deleteBuffer(fieldBuf)
      gl.deleteBuffer(rangeBuf)
      gl.deleteProgram(program)
      const timer = window.setTimeout(() => {
        if (pendingRelease.get(canvas) !== timer) return
        pendingRelease.delete(canvas)
        gl.getExtension('WEBGL_lose_context')?.loseContext()
      }, 0)
      pendingRelease.set(canvas, timer)
    }
  }, [color, fog, detail, horizon, height, speed, seed, reduced, restored])

  return <canvas ref={ref} aria-hidden="true" className={cn('pointer-events-none absolute inset-0 h-full w-full', className)} style={style} />
}
