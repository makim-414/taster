// What a thinking orb variation is, as plain data: a recipe can be saved in a file, put in a share link and added to
// the gallery by a pull request. No dependency, so the component, the /orbs page and the validator share this file.
// Every value is checked here, because a recipe can arrive from a link.

export const ORB_STATES = ['working', 'searching', 'solving', 'listening', 'connecting', 'weaving', 'composing', 'breathing', 'shaping'] as const
export type OrbRecipeState = (typeof ORB_STATES)[number]

export interface OrbRecipe {
  /** Which animation. */
  state: OrbRecipeState
  /** Multiplier on the tuned speed, 0.1 to 3. */
  speed?: number
  /** Multiplier on the tuned dot count, 0.2 to 3. */
  dots?: number
  /** Multiplier on the tuned dot size, 0.4 to 2.5. */
  dotSize?: number
  /** ink follows the theme, brand reads --brand, or a #rgb or #rrggbb color. */
  tint?: string
  /** The engine's own knobs for this state, see ORB_KNOBS. */
  opts?: Record<string, number>
}

/** A recipe in the gallery: registry/recipes/orbs.json. */
export interface NamedOrbRecipe extends OrbRecipe {
  id: string
  name: string
  /** Who made it: a GitHub handle. */
  by: string
  /** One sentence: what this variation is for. */
  note: string
}

export interface OrbKnob {
  key: string
  label: string
  min: number
  max: number
  step: number
  /** The tuned value at 64 px, shown when the recipe does not set it. */
  value: number
}

/** The knobs worth turning for each state, with safe ranges. Values come from thinking-orbs 0.3.2 at size 64. */
export const ORB_KNOBS: Record<OrbRecipeState, OrbKnob[]> = {
  working: [
    { key: 'particles', label: 'Particles', min: 1, max: 8, step: 1, value: 3 },
    { key: 'ghostA', label: 'Path strength', min: 0, max: 1, step: 0.05, value: 0.5 },
  ],
  searching: [
    { key: 'scanMul', label: 'Scan strength', min: 1, max: 8, step: 0.1, value: 4.08 },
    { key: 'dimBase', label: 'Unscanned brightness', min: 0.1, max: 1, step: 0.05, value: 0.45 },
  ],
  solving: [{ key: 'moveCount', label: 'Moves', min: 4, max: 28, step: 1, value: 14 }],
  listening: [{ key: 'rings', label: 'Rings', min: 4, max: 16, step: 1, value: 9 }],
  connecting: [
    { key: 'thr', label: 'Link distance', min: 0.4, max: 1.1, step: 0.01, value: 0.72 },
    { key: 'signals', label: 'Signals', min: 0, max: 16, step: 1, value: 7 },
    { key: 'lineW', label: 'Line weight', min: 0.2, max: 1.6, step: 0.05, value: 0.8 },
  ],
  weaving: [{ key: 'turns', label: 'Turns', min: 1, max: 8, step: 1, value: 3 }],
  composing: [
    { key: 'bandMul', label: 'Band width', min: 1, max: 8, step: 0.1, value: 3.9 },
    { key: 'wobMul', label: 'Wobble', min: 0, max: 2, step: 0.05, value: 1 },
    { key: 'spin', label: 'Spin', min: 0, max: 2, step: 0.05, value: 0 },
  ],
  breathing: [
    { key: 'bandMul', label: 'Band width', min: 1, max: 8, step: 0.1, value: 3.63 },
    { key: 'wobMul', label: 'Wobble', min: 0, max: 2, step: 0.01, value: 0.37 },
  ],
  shaping: [
    { key: 'shape', label: 'Hold shape (-1 cycles, 0 circle, 1 triangle, 2 square)', min: -1, max: 2, step: 1, value: -1 },
    { key: 'spread', label: 'Spread', min: 0.8, max: 2, step: 0.05, value: 1.45 },
  ],
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

/** Anything to a safe recipe: unknown keys dropped, numbers clamped. Null when the state is not a real one. */
export function sanitizeRecipe(input: unknown): OrbRecipe | null {
  if (!input || typeof input !== 'object') return null
  const r = input as Record<string, unknown>
  const state = ORB_STATES.find((s) => s === r.state)
  if (!state) return null
  const out: OrbRecipe = { state }
  const speed = num(r.speed)
  const dots = num(r.dots)
  const dotSize = num(r.dotSize)
  if (speed !== undefined) out.speed = clamp(speed, 0.1, 3)
  if (dots !== undefined) out.dots = clamp(dots, 0.2, 3)
  if (dotSize !== undefined) out.dotSize = clamp(dotSize, 0.4, 2.5)
  if (typeof r.tint === 'string' && /^(ink|brand|#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6})$/.test(r.tint)) out.tint = r.tint
  if (r.opts && typeof r.opts === 'object') {
    const opts: Record<string, number> = {}
    for (const k of ORB_KNOBS[state]) {
      const v = num((r.opts as Record<string, unknown>)[k.key])
      // -1 on shape means the default cycle, which the engine gets by not receiving the key.
      if (v !== undefined && !(k.key === 'shape' && v < 0)) opts[k.key] = clamp(v, k.min, k.max)
    }
    if (Object.keys(opts).length) out.opts = opts
  }
  return out
}

/** A recipe as a short URL-safe string, for share links. */
export function encodeRecipe(recipe: OrbRecipe): string {
  const bytes = new TextEncoder().encode(JSON.stringify(recipe))
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** The reverse of encodeRecipe. Null for anything that does not decode to a valid recipe. */
export function decodeRecipe(text: string): OrbRecipe | null {
  try {
    if (text.length > 2000) return null
    const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
    return sanitizeRecipe(JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))))
  } catch {
    return null
  }
}

/** The JSX for a recipe, for copying. Leaves out what is at its default. */
export function recipeToCode(recipe: OrbRecipe, size = 64): string {
  const props = [`state="${recipe.state}"`, `size={${size}}`]
  if (recipe.speed !== undefined && recipe.speed !== 1) props.push(`speed={${recipe.speed}}`)
  if (recipe.dots !== undefined && recipe.dots !== 1) props.push(`dots={${recipe.dots}}`)
  if (recipe.dotSize !== undefined && recipe.dotSize !== 1) props.push(`dotSize={${recipe.dotSize}}`)
  if (recipe.tint && recipe.tint !== 'ink') props.push(recipe.tint === 'brand' ? 'tint="brand"' : `tint="${recipe.tint}"`)
  if (recipe.opts) props.push(`opts={${JSON.stringify(recipe.opts).replace(/"/g, '')}}`)
  return `<ThinkingOrb ${props.join(' ')} />`
}
