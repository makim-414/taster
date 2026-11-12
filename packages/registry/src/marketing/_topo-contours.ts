// Contour lines for marketing/topo-hero: a seeded smooth noise field (gradient noise in three octaves), traced at even
// heights with marching squares and joined into SVG path data. Pure math, no DOM and no dependency, so it runs the same
// on the server and in the browser and one seed always draws the same map. Copy this file with marketing/topo-hero.

export interface TopoContourOptions {
  /** Same seed, same map. Default 1. */
  seed?: number
  /** Width of the drawing in viewBox units. Default 1600. */
  width?: number
  /** Height of the drawing in viewBox units. Default 1000. */
  height?: number
  /** Grid cells across the width. More cells give finer lines and a longer path. Default 80. */
  cells?: number
  /** Number of contour heights. Default 12. */
  levels?: number
  /** Every nth height is an index contour, drawn a little stronger as on a survey map. Default 4. */
  every?: number
}

export interface TopoContours {
  /** viewBox of the drawing, "0 0 width height". */
  viewBox: string
  /** Path data of the ordinary contours. */
  minor: string
  /** Path data of the index contours. */
  index: string
}

// Small seeded generator (mulberry32). Math.random would draw a new map on every render and on the server.
function random(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const GRADS: Array<[number, number]> = Array.from({ length: 8 }, (_, i) => [Math.cos((i * Math.PI) / 4), Math.sin((i * Math.PI) / 4)])
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

// Two dimensional gradient noise on a seeded permutation, roughly -0.7 to 0.7 and smooth everywhere.
function gradientNoise(rand: () => number) {
  const p = Array.from({ length: 256 }, (_, i) => i)
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const swap = p[i]
    p[i] = p[j]
    p[j] = swap
  }
  const perm = new Uint8Array(512)
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]
  const dot = (h: number, x: number, y: number) => {
    const g = GRADS[h & 7]
    return g[0] * x + g[1] * y
  }
  return (x: number, y: number) => {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const xf = x - xi
    const yf = y - yi
    const X = xi & 255
    const Y = yi & 255
    const u = fade(xf)
    const v = fade(yf)
    const top = lerp(dot(perm[perm[X] + Y], xf, yf), dot(perm[perm[X + 1] + Y], xf - 1, yf), u)
    const bottom = lerp(dot(perm[perm[X] + Y + 1], xf, yf - 1), dot(perm[perm[X + 1] + Y + 1], xf - 1, yf - 1), u)
    return lerp(top, bottom, v)
  }
}

// One pass of corner cutting, so the straight cell to cell steps of marching squares read as drawn curves.
function smooth(points: number[], closed: boolean): number[] {
  const n = points.length / 2
  if (n < 3) return points
  const out: number[] = closed ? [] : [points[0], points[1]]
  const last = closed ? n : n - 1
  for (let i = 0; i < last; i++) {
    const j = (i + 1) % n
    const x0 = points[i * 2]
    const y0 = points[i * 2 + 1]
    const x1 = points[j * 2]
    const y1 = points[j * 2 + 1]
    out.push(x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25, x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75)
  }
  if (!closed) out.push(points[(n - 1) * 2], points[(n - 1) * 2 + 1])
  return out
}

// Whole units are enough at this scale (a 1600 wide drawing is rarely shown wider than 1600px) and keep the path short.
function toPath(points: number[], closed: boolean): string {
  let d = ''
  let px = NaN
  let py = NaN
  for (let i = 0; i < points.length; i += 2) {
    const x = Math.round(points[i])
    const y = Math.round(points[i + 1])
    if (x === px && y === py) continue
    d += `${d ? 'L' : 'M'}${x} ${y}`
    px = x
    py = y
  }
  return closed ? `${d}Z` : d
}

// Segment table for marching squares, as pairs of cell edges: 0 top, 1 right, 2 bottom, 3 left. Corner bits are
// top left 8, top right 4, bottom right 2, bottom left 1. The two saddles (5 and 10) are settled by the cell center.
const MIN_LOOP = 10
const CASES: Record<number, number[]> = {
  1: [3, 2], 2: [2, 1], 3: [3, 1], 4: [0, 1], 6: [0, 2], 7: [0, 3],
  8: [0, 3], 9: [0, 2], 11: [0, 1], 12: [3, 1], 13: [2, 1], 14: [3, 2],
}

/** Contour path data for a seeded terrain. Same options, same result. */
export function topoContours({ seed = 1, width = 1600, height = 1000, cells = 80, levels = 12, every = 4 }: TopoContourOptions = {}): TopoContours {
  const rand = random(seed * 2654435761)
  const noise = gradientNoise(rand)
  const ox = rand() * 64
  const oy = rand() * 64
  const cols = Math.max(8, Math.round(cells))
  const rows = Math.max(4, Math.round((cols * height) / width))
  const sx = width / cols
  const sy = height / rows
  // The width spans about two hills; three octaves add the smaller folds without breaking them into specks.
  const scale = 2.2 / width
  const field = new Float32Array((cols + 1) * (rows + 1))
  let lo = Infinity
  let hi = -Infinity
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const x = i * sx * scale + ox
      const y = j * sy * scale + oy
      let value = 0
      let amp = 1
      let freq = 1
      for (let o = 0; o < 3; o++) {
        value += noise(x * freq, y * freq) * amp
        amp *= 0.45
        freq *= 2
      }
      field[j * (cols + 1) + i] = value
      if (value < lo) lo = value
      if (value > hi) hi = value
    }
  }
  const at = (i: number, j: number) => (field[j * (cols + 1) + i] - lo) / (hi - lo || 1)

  // A crossing point is named by the grid edge it sits on, so neighbouring cells meet on the same point.
  const H = (cols + 1) * (rows + 1)
  const hEdge = (i: number, j: number) => j * (cols + 1) + i
  const vEdge = (i: number, j: number) => H + j * (cols + 1) + i

  let minor = ''
  let index = ''
  const count = Math.max(1, Math.round(levels))
  for (let k = 1; k <= count; k++) {
    const t = k / (count + 1)
    const pos = new Map<number, [number, number]>()
    const links = new Map<number, number[]>()
    const link = (a: number, b: number) => {
      const la = links.get(a)
      if (la) la.push(b)
      else links.set(a, [b])
      const lb = links.get(b)
      if (lb) lb.push(a)
      else links.set(b, [a])
    }
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const a = at(i, j)
        const b = at(i + 1, j)
        const c = at(i + 1, j + 1)
        const d = at(i, j + 1)
        const code = (a > t ? 8 : 0) | (b > t ? 4 : 0) | (c > t ? 2 : 0) | (d > t ? 1 : 0)
        if (code === 0 || code === 15) continue
        const x0 = i * sx
        const y0 = j * sy
        const point = (edge: number): number => {
          if (edge === 0) {
            const id = hEdge(i, j)
            if (!pos.has(id)) pos.set(id, [x0 + sx * ((t - a) / (b - a)), y0])
            return id
          }
          if (edge === 1) {
            const id = vEdge(i + 1, j)
            if (!pos.has(id)) pos.set(id, [x0 + sx, y0 + sy * ((t - b) / (c - b))])
            return id
          }
          if (edge === 2) {
            const id = hEdge(i, j + 1)
            if (!pos.has(id)) pos.set(id, [x0 + sx * ((t - d) / (c - d)), y0 + sy])
            return id
          }
          const id = vEdge(i, j)
          if (!pos.has(id)) pos.set(id, [x0, y0 + sy * ((t - a) / (d - a))])
          return id
        }
        if (code === 5 || code === 10) {
          const centerHigh = (a + b + c + d) / 4 > t
          // 5: top right and bottom left are high. 10: top left and bottom right are high.
          const joined = code === 5 ? centerHigh : !centerHigh
          if (joined) {
            link(point(0), point(3))
            link(point(2), point(1))
          } else {
            link(point(0), point(1))
            link(point(3), point(2))
          }
          continue
        }
        const pair = CASES[code]
        link(point(pair[0]), point(pair[1]))
      }
    }

    // Join the segments into lines: open lines start at a point with one neighbour (the map edge), the rest are loops.
    const seen = new Set<number>()
    const walk = (start: number) => {
      const chain = [start]
      seen.add(start)
      let prev = -1
      let cur = start
      for (;;) {
        const next = (links.get(cur) ?? []).find((n) => n !== prev && !seen.has(n))
        if (next === undefined) break
        chain.push(next)
        seen.add(next)
        prev = cur
        cur = next
      }
      const closed = chain.length > 2 && (links.get(cur) ?? []).includes(start)
      // A loop around a few cells is a speck, not a hill; leave it out.
      if (closed && chain.length < MIN_LOOP) return ''
      const flat: number[] = []
      for (const id of chain) {
        const p = pos.get(id)
        if (p) flat.push(p[0], p[1])
      }
      return toPath(smooth(flat, closed), closed)
    }
    let d = ''
    for (const [id, n] of links) if (n.length === 1 && !seen.has(id)) d += walk(id)
    for (const id of links.keys()) if (!seen.has(id)) d += walk(id)
    if (every > 0 && k % every === 0) index += d
    else minor += d
  }
  return { viewBox: `0 0 ${width} ${height}`, minor, index }
}
