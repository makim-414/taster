// Turns any CSS color (a token such as var(--bg), oklch(), hex, rgb()) into an sRGB triple 0..1.
// WebGL components need numbers, while the registry only hands out CSS variables. No dependency.
// Copy this file with motion/glass-logo-reveal, motion/mesh-drift and blocks/liquid-nav.

export type Rgb = [number, number, number]

let probe: CanvasRenderingContext2D | null = null

// Resolves var(--x) against `el` (so a themed subtree gets its own values), then lets the browser
// parse the color by painting one pixel. Anything it cannot read comes back as `fallback`.
export function resolveColor(color: string, el?: Element | null, fallback: Rgb = [0, 0, 0]): Rgb {
  if (typeof document === 'undefined') return fallback
  let value = color.trim()
  for (let i = 0; i < 4; i++) {
    const m = /^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/.exec(value)
    if (!m) break
    const read = getComputedStyle(el ?? document.documentElement).getPropertyValue(m[1]).trim()
    value = read || (m[2] ?? '').trim()
  }
  if (!value) return fallback
  if (!probe) {
    const c = document.createElement('canvas')
    c.width = c.height = 1
    probe = c.getContext('2d', { willReadFrequently: true })
  }
  if (!probe) return fallback
  probe.fillStyle = '#000'
  probe.fillRect(0, 0, 1, 1)
  probe.fillStyle = value
  probe.fillRect(0, 0, 1, 1)
  const d = probe.getImageData(0, 0, 1, 1).data
  // Translucent tokens (--card is white at 3%) are read as painted over black.
  return [d[0] / 255, d[1] / 255, d[2] / 255]
}

export const luminance = ([r, g, b]: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b
