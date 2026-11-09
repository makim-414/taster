import * as React from 'react'
import { cn } from '../blocks/_cn'
import { resolveColor } from './_color'
import { useReducedMotion } from './_motion'

// Light beams: soft slanted shafts of light rising slowly behind a hero, with a fine grain. Background only: it brings
// no text or buttons and paints on a transparent canvas, so the parent's surface shows through. The color reads --brand,
// so an absorbed theme changes it with no edit. See patterns/ambient-background.md.
// Written for this registry after the background of "PremiumHero" on 21st.dev, picked by the owner. The license could
// not be confirmed, so no code was taken beyond the idea. Changed on purpose: the fixed cyan and near-black fill are
// gone; each beam is one soft sprite instead of a per-frame ctx.filter blur, which Safari does not support; the grain
// is one small tile instead of a full-screen noise image rebuilt every frame; it sizes to its parent, not the window;
// it stops off screen; reduced motion draws one still frame.

export interface LightBeamsProps {
  /** Any CSS color or token. Default var(--brand). */
  color?: string
  /** Strength of the beams, 0 to 1.5. Default 0.8. */
  intensity?: number
  /** Beams in each of the three depth layers. Default 8. */
  density?: number
  /** Slant in degrees. Default -30. */
  angle?: number
  /** Speed multiplier. 0 holds a still frame. Default 1. */
  speed?: number
  /** A fine film grain over the beams. Default true. */
  grain?: boolean
  className?: string
  style?: React.CSSProperties
}

interface Beam { x: number; y: number; layer: number; angle: number; speed: number; opacity: number; pulse: number; pulseSpeed: number }

const LAYERS = 3

function beamSprite(rgb: string, layer: number) {
  const sprite = document.createElement('canvas')
  sprite.width = 16 + layer * 12
  sprite.height = 256
  const ctx = sprite.getContext('2d')
  if (!ctx) return sprite
  const along = ctx.createLinearGradient(0, 0, 0, sprite.height)
  for (const [at, a] of [[0, 0], [0.2, 0.5], [0.5, 1], [0.8, 0.5], [1, 0]]) along.addColorStop(at, `rgba(${rgb},${a})`)
  ctx.fillStyle = along
  ctx.fillRect(0, 0, sprite.width, sprite.height)
  // Soft sides stand in for a blur, and the farther layers are wider and softer.
  const across = ctx.createLinearGradient(0, 0, sprite.width, 0)
  across.addColorStop(0, 'rgba(0,0,0,0)')
  across.addColorStop(0.5, 'rgba(0,0,0,1)')
  across.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.globalCompositeOperation = 'destination-in'
  ctx.fillStyle = across
  ctx.fillRect(0, 0, sprite.width, sprite.height)
  return sprite
}

function grainTile() {
  const tile = document.createElement('canvas')
  tile.width = tile.height = 128
  const ctx = tile.getContext('2d')
  if (!ctx) return tile
  const image = ctx.createImageData(128, 128)
  for (let i = 0; i < image.data.length; i += 4) {
    const v = Math.random() * 255
    image.data[i] = image.data[i + 1] = image.data[i + 2] = v
    image.data[i + 3] = 12
  }
  ctx.putImageData(image, 0, 0)
  return tile
}

export function LightBeams({
  color = 'var(--brand)', intensity = 0.8, density = 8, angle = -30, speed = 1, grain = true, className, style,
}: LightBeamsProps) {
  const ref = React.useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()

  React.useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const still = reduced || speed === 0
    let sprites: HTMLCanvasElement[] = []
    let pattern: CanvasPattern | null = null
    let beams: Beam[] = []
    let w = 0
    let h = 0
    let frame = 0
    let visible = true

    const readColor = () => {
      const [r, g, b] = resolveColor(color, canvas)
      const rgb = `${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)}`
      sprites = Array.from({ length: LAYERS }, (_, i) => beamSprite(rgb, i + 1))
    }
    const seed = () => {
      beams = []
      for (let layer = 1; layer <= LAYERS; layer++) {
        for (let i = 0; i < density; i++) {
          beams.push({
            x: Math.random() * w * 1.3,
            y: Math.random() * h,
            layer,
            angle: angle + Math.random() * 10 - 5,
            speed: 0.1 + layer * 0.1 + Math.random() * 0.1,
            opacity: 0.08 + layer * 0.05 + Math.random() * 0.1,
            pulse: Math.random() * Math.PI * 2,
            pulseSpeed: 0.005 + Math.random() * 0.01,
          })
        }
      }
    }
    const paint = () => {
      ctx.clearRect(0, 0, w, h)
      const length = h * 2.5
      for (const beam of beams) {
        const sprite = sprites[beam.layer - 1]
        ctx.save()
        ctx.translate(beam.x, beam.y)
        ctx.rotate((beam.angle * Math.PI) / 180)
        ctx.globalAlpha = Math.min(1, Math.max(0, beam.opacity * (0.8 + Math.sin(beam.pulse) * 0.4) * intensity))
        ctx.drawImage(sprite, -sprite.width / 2, -length / 2, sprite.width, length)
        ctx.restore()
      }
      if (pattern) {
        ctx.globalAlpha = 1
        ctx.fillStyle = pattern
        ctx.fillRect(0, 0, w, h)
      }
    }
    const tick = () => {
      frame = 0
      if (!visible || document.hidden) return
      const reach = h * 1.5
      for (const beam of beams) {
        beam.y -= beam.speed * speed
        beam.pulse += beam.pulseSpeed * speed
        if (beam.y < -reach) {
          beam.y = h + reach
          beam.x = Math.random() * w * 1.3
        }
      }
      paint()
      frame = requestAnimationFrame(tick)
    }
    const run = () => {
      if (still) { paint(); return }
      if (!frame && visible && !document.hidden) frame = requestAnimationFrame(tick)
    }
    const resize = () => {
      const box = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = box.width
      h = box.height
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      pattern = grain ? ctx.createPattern(grainTile(), 'repeat') : null
      seed()
      paint()
    }

    readColor()
    resize()
    run()
    const sizes = new ResizeObserver(resize)
    sizes.observe(canvas)
    const seen = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; run() })
    seen.observe(canvas)
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
  }, [color, intensity, density, angle, speed, grain, reduced])

  return <canvas ref={ref} aria-hidden="true" className={cn('pointer-events-none absolute inset-0 h-full w-full', className)} style={style} />
}
