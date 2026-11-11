import * as React from 'react'
import { cn } from '../blocks/_cn'
import { resolveColor } from './_color'
import { useReducedMotion } from './_motion'

// Band shader: wide diagonal bands of light sweeping across a dark field, drawn by one fragment shader on one WebGL
// canvas that fills its positioned parent. Each band has a bright core and a split edge: the core's red, green and blue
// are drawn a hair apart, so one edge runs warm and the other cold without a hue written anywhere. The bands keep a hard
// edge and dark gaps, so it reads as light through slats, not as an aurora. Background only: it brings no words; put a
// short headline on top. See patterns/ambient-background.md.
// Written for this registry after "Shader Animation" by designali-in (Ali Imam) on 21st.dev, picked by the owner. The
// license could not be confirmed, so no code was taken; it was written from the preview.
// Changed on purpose: raw WebGL1 with one fullscreen triangle instead of three.js; every color is a token (core
// var(--text) on var(--bg), so the light theme draws ink bands on paper) and the warm and cold edges come from splitting
// the core's channels, or from two tokens passed as `edges`; the middle dims behind the headline (`scrim`); it sizes to
// its parent, pauses off screen and in a hidden tab, survives a lost WebGL context, draws one still frame under reduced
// motion, and falls back to static CSS bands from the same tokens when WebGL is missing.

export interface BandShaderProps {
  /** Band core. Any CSS color or token. Default var(--text), so the bands turn to ink in the light theme. */
  color?: string
  /** The field between the bands. Default var(--bg). */
  background?: string
  /** Tint the leading and trailing edge with two colors (tokens), warm edge first. Default: none, the edges come from
   *  splitting the core color into its red, green and blue channels. */
  edges?: [string, string]
  /** Bands across the shorter side, 1 to 12. Default 3. */
  bands?: number
  /** Slant of the bands in degrees from horizontal. Default 30. */
  angle?: number
  /** Speed multiplier. 0 holds a still frame. Default 1, a slow sweep. */
  speed?: number
  /** Strength of the bands, 0 to 1.5. Default 1. */
  intensity?: number
  /** Width of the warm and cold edges, 0 (one clean color) to 1. Default 0.5. */
  split?: number
  /** How far the bands bend in places, 0 (straight) to 1. Default 0.5. */
  ripple?: number
  /** Dims the bands in the middle, where a headline sits, 0 (none) to 1 (empty middle). Default 0.75. */
  scrim?: number
  className?: string
  style?: React.CSSProperties
}

const VERT = `attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

const FRAG = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_res;
uniform vec3 u_time;   // band phase (wrapped at 61 bands), ripple wave, ripple swell (both wrapped at 2 pi)
uniform vec3 u_bg;
uniform vec3 u_core;
uniform vec3 u_warm;
uniform vec3 u_cold;
uniform vec4 u_shape;  // bands, angle in radians, split, ripple
uniform vec3 u_mix;    // intensity, tint (0 splits the core, 1 uses u_warm and u_cold), scrim

float hash(float n) {
  return fract(sin(mod(n, 61.0) * 12.9898) * 43758.5453);
}

// Brightness across the band nearest to phase x. Bands sit on whole numbers. A steep rise keeps the edge hard;
// the interior climbs to a bright core.
float band(float x, float aa) {
  float id = floor(x + 0.5);
  float d = abs(x - id);
  float hw = mix(0.13, 0.25, hash(id));
  float body = pow(max(1.0 - d / hw, 0.0001), 0.3);
  float edge = 1.0 - smoothstep(hw - aa, hw, d);
  return body * edge * mix(0.6, 1.0, hash(id + 17.0));
}

void main() {
  float m = min(u_res.x, u_res.y);
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / m;
  vec2 dir = vec2(cos(u_shape.y), sin(u_shape.y));
  float along = dot(p, dir);
  float across = dot(p, vec2(-dir.y, dir.x));

  // A wave runs along each band and only swells in places, so the bands bend like a ripple, not everywhere at once.
  float swell = smoothstep(-0.2, 1.0, sin(along * 1.3 - u_time.z + across * 0.9));
  across += u_shape.w * 0.08 * sin(along * 4.1 + u_time.y + across * 2.2) * swell;

  float x = across * u_shape.x + u_time.x;
  float aa = 1.25 * u_shape.x / m;
  float s = u_shape.z * 0.065;
  float lead = band(x + s, aa);
  float mid = band(x, aa);
  float trail = band(x - s, aa);

  // Red runs ahead and blue behind. Green is shared, mostly with the two edges, so the leading edge reads amber and
  // the trailing one azure while the three still add up to the core color in the middle.
  vec3 lift = u_core - u_bg;
  vec3 split = lift * vec3(lead, 0.42 * lead + 0.16 * mid + 0.42 * trail, trail);
  vec3 tinted = lift * mid + (u_warm - u_bg) * max(lead - mid, 0.0) + (u_cold - u_bg) * max(trail - mid, 0.0);
  // A little headroom so the middle of each band clips to the full core color.
  vec3 light = mix(split, tinted, u_mix.y) * u_mix.x * 1.15;

  // Readability scrim: an ellipse in the middle where the headline goes.
  float r = length(p * vec2(0.62, 1.15));
  light *= 1.0 - u_mix.z * (1.0 - smoothstep(0.1, 0.62, r));

  gl_FragColor = vec4(clamp(u_bg + light, 0.0, 1.0), 1.0);
}
`

const TAU = Math.PI * 2
const wrap = (v: number, n: number) => ((v % n) + n) % n
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo))
// Clock rates per second at speed 1: the bands move 0.12 of a band, the ripple wave and swell turn slower.
const PHASE_RATE = 0.12
const WAVE_RATE = 0.6
const SWELL_RATE = 0.21
// The still frame (reduced motion, speed 0) is taken a few seconds in, where the ripple has a bend in view.
const START = 4

// The static bands shown when WebGL is missing: the same tokens, one band per period, warm and cold either side, under
// the same scrim in the middle.
function staticBands(color: string, background: string, edges: [string, string] | undefined, bands: number, angle: number, scrim: number) {
  const [warm, cold] = edges ?? ['var(--chart-3)', 'var(--chart-4)']
  const p = 100 / clamp(Math.round(bands * 1.6), 2, 16)
  const at = (f: number) => `${(p * f).toFixed(2)}%`
  const strength = Math.round(clamp(scrim, 0, 1) * 100)
  const veil = strength > 0 ? `radial-gradient(ellipse 60% 50% at 50% 50%, color-mix(in oklab, ${background} ${strength}%, transparent) 40%, transparent 100%), ` : ''
  return `${veil}repeating-linear-gradient(${-angle}deg, ${background} 0 ${at(0.6)}, ${warm} ${at(0.6)} ${at(0.66)}, ${color} ${at(0.66)} ${at(0.86)}, ${cold} ${at(0.86)} ${at(0.92)}, ${background} ${at(0.92)} ${at(1)})`
}

const pendingContextReleases = new WeakMap<HTMLCanvasElement, number>()

export function BandShader({
  color = 'var(--text)',
  background = 'var(--bg)',
  edges,
  bands = 3,
  angle = 30,
  speed = 1,
  intensity = 1,
  split = 0.5,
  ripple = 0.5,
  scrim = 0.75,
  className,
  style,
}: BandShaderProps) {
  const ref = React.useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()
  const [fallback, setFallback] = React.useState(false)
  const live = React.useRef({ color, background, edges, bands, angle, speed, intensity, split, ripple, scrim, reduced })
  live.current = { color, background, edges, bands, angle, speed, intensity, split, ripple, scrim, reduced }
  const pushRef = React.useRef<() => void>(() => {})
  const edgesKey = edges ? edges.join('|') : ''

  React.useEffect(() => {
    const found = ref.current
    if (!found) return
    const canvas: HTMLCanvasElement = found
    const pendingRelease = pendingContextReleases.get(canvas)
    if (pendingRelease !== undefined) window.clearTimeout(pendingRelease)
    pendingContextReleases.delete(canvas)
    const ctx = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false })
    if (!ctx) {
      setFallback(true)
      return
    }
    const gl: WebGLRenderingContext = ctx

    type Uniforms = Record<'res' | 'time' | 'bg' | 'core' | 'warm' | 'cold' | 'shape' | 'mix', WebGLUniformLocation | null>
    let program: WebGLProgram | null = null
    let buf: WebGLBuffer | null = null
    let uni: Uniforms | null = null

    // Compiles the program and uploads the triangle. Runs at mount and again after a lost context comes back.
    const build = () => {
      const compile = (type: number, src: string) => {
        const s = gl.createShader(type)
        if (!s) return null
        gl.shaderSource(s, src)
        gl.compileShader(s)
        return s
      }
      const vs = compile(gl.VERTEX_SHADER, VERT)
      const fs = compile(gl.FRAGMENT_SHADER, FRAG)
      const prog = gl.createProgram()
      if (!vs || !fs || !prog) return false
      gl.attachShader(prog, vs)
      gl.attachShader(prog, fs)
      gl.linkProgram(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        gl.deleteProgram(prog)
        return false
      }
      gl.useProgram(prog)
      const b = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, b)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
      const loc = gl.getAttribLocation(prog, 'a_position')
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
      program = prog
      buf = b
      uni = {
        res: gl.getUniformLocation(prog, 'u_res'),
        time: gl.getUniformLocation(prog, 'u_time'),
        bg: gl.getUniformLocation(prog, 'u_bg'),
        core: gl.getUniformLocation(prog, 'u_core'),
        warm: gl.getUniformLocation(prog, 'u_warm'),
        cold: gl.getUniformLocation(prog, 'u_cold'),
        shape: gl.getUniformLocation(prog, 'u_shape'),
        mix: gl.getUniformLocation(prog, 'u_mix'),
      }
      return true
    }

    let raf = 0
    let lastNow: number | null = null
    let clock = 0
    let visible = document.visibilityState === 'visible'
    let inView = true
    let lost = false
    let disposed = false

    function requestRender() {
      if (!disposed && !lost && visible && inView && raf === 0) raf = requestAnimationFrame(render)
    }
    const stop = () => {
      if (raf !== 0) cancelAnimationFrame(raf)
      raf = 0
      lastNow = null
    }

    // Colors and shape. Called again when a prop or the theme changes.
    const push = () => {
      if (!uni || lost) return
      const P = live.current
      const bg = resolveColor(P.background, canvas)
      const core = resolveColor(P.color, canvas, [1, 1, 1])
      const warm = P.edges ? resolveColor(P.edges[0], canvas, core) : core
      const cold = P.edges ? resolveColor(P.edges[1], canvas, core) : core
      gl.uniform3f(uni.bg, bg[0], bg[1], bg[2])
      gl.uniform3f(uni.core, core[0], core[1], core[2])
      gl.uniform3f(uni.warm, warm[0], warm[1], warm[2])
      gl.uniform3f(uni.cold, cold[0], cold[1], cold[2])
      gl.uniform4f(uni.shape, clamp(P.bands, 1, 12), (clamp(P.angle, -90, 90) * Math.PI) / 180, clamp(P.split, 0, 1), clamp(P.ripple, 0, 1))
      gl.uniform3f(uni.mix, clamp(P.intensity, 0, 1.5), P.edges ? 1 : 0, clamp(P.scrim, 0, 1))
      requestRender()
    }

    const resize = () => {
      const box = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rawW = Math.max(1, Math.round(box.width * dpr))
      const rawH = Math.max(1, Math.round(box.height * dpr))
      // Keep a full-bleed hero under about two million shaded pixels.
      const k = Math.min(1, Math.sqrt(2_000_000 / (rawW * rawH)))
      const w = Math.max(1, Math.round(rawW * k))
      const h = Math.max(1, Math.round(rawH * k))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      gl.viewport(0, 0, w, h)
    }

    function render(now: number) {
      raf = 0
      if (disposed || lost || !visible || !inView || !uni) return
      const P = live.current
      const still = P.reduced || P.speed === 0
      const dt = lastNow === null ? 0 : Math.min((now - lastNow) / 1000, 0.1)
      lastNow = now
      if (!still) clock += dt * clamp(P.speed, -4, 4)
      resize()
      const t = START + clock
      gl.uniform2f(uni.res, canvas.width, canvas.height)
      gl.uniform3f(uni.time, wrap(t * PHASE_RATE, 61), wrap(t * WAVE_RATE, TAU), wrap(t * SWELL_RATE, TAU))
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      if (still) lastNow = null
      else requestRender()
    }

    if (!build()) {
      setFallback(true)
      return
    }

    const onLost = (event: Event) => {
      event.preventDefault()
      lost = true
      stop()
      program = null
      buf = null
      uni = null
    }
    const onRestored = () => {
      lost = false
      if (!build()) {
        setFallback(true)
        return
      }
      push()
    }
    canvas.addEventListener('webglcontextlost', onLost)
    canvas.addEventListener('webglcontextrestored', onRestored)

    const sizes = new ResizeObserver(() => requestRender())
    sizes.observe(canvas)
    const seen = new IntersectionObserver(([entry]) => {
      inView = entry?.isIntersecting ?? true
      if (inView) requestRender()
      else stop()
    })
    seen.observe(canvas)
    const onVisibility = () => {
      visible = document.visibilityState === 'visible'
      if (visible) requestRender()
      else stop()
    }
    document.addEventListener('visibilitychange', onVisibility)
    const themes = new MutationObserver(() => push())
    themes.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] })

    pushRef.current = push
    push()
    return () => {
      disposed = true
      pushRef.current = () => {}
      stop()
      sizes.disconnect()
      seen.disconnect()
      themes.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
      if (!lost) {
        if (buf) gl.deleteBuffer(buf)
        if (program) gl.deleteProgram(program)
      }
      // Released a tick later, so a remount of the same canvas (React StrictMode) can take the context back.
      const releaseTimer = window.setTimeout(() => {
        if (pendingContextReleases.get(canvas) !== releaseTimer) return
        pendingContextReleases.delete(canvas)
        gl.getExtension('WEBGL_lose_context')?.loseContext()
        canvas.width = 1
        canvas.height = 1
      }, 0)
      pendingContextReleases.set(canvas, releaseTimer)
    }
  }, [])

  // Prop and reduced motion changes re-upload the uniforms without rebuilding the program.
  React.useEffect(() => {
    pushRef.current()
  }, [color, background, edgesKey, bands, angle, speed, intensity, split, ripple, scrim, reduced])

  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      style={{ background: fallback ? staticBands(color, background, edges, bands, angle, scrim) : background, ...style }}
    >
      <canvas ref={ref} style={{ display: fallback ? 'none' : 'block', width: '100%', height: '100%' }} />
    </div>
  )
}
