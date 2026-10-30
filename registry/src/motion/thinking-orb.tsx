import * as React from 'react'
import { ThinkingOrb as Orb, type ThinkingOrbProps as OrbProps } from 'thinking-orbs'
import { luminance, resolveColor } from './_color'
import { sanitizeRecipe, type OrbRecipe } from './_orb-recipe'

export { ORB_KNOBS, ORB_STATES, decodeRecipe, encodeRecipe, recipeToCode, sanitizeRecipe } from './_orb-recipe'
export type { NamedOrbRecipe, OrbKnob, OrbRecipe, OrbRecipeState } from './_orb-recipe'
export { ORB_RECIPES } from './orb-recipes'

// Thinking orb: a dotted orb that shows what an agent is doing, for a chat avatar or inline status. The drawing is the
// thinking-orbs package by Jakub Antalik, used as a dependency (https://github.com/Jakubantalik/Libraries.dev). This
// wrapper adds what a registry needs: a `recipe` so a variation is plain data, `tint` that takes a token, and a theme read
// from the --bg token rather than the OS, so the ink stays right when the OS and the page disagree.
// Upstream license: MIT, Copyright (c) 2026 Jakub Antalik. Full text in THIRD_PARTY_NOTICES.md.
//
// Do not ship the same default orb as everyone else: pick or make a recipe (https://taster-six.vercel.app/orbs) and match
// the state to what the agent is doing. See patterns/agent-thinking-orb.md.

export interface ThinkingOrbProps extends Omit<OrbProps, 'color' | 'opts'> {
  /** A variation as data. Explicit props win over it. */
  recipe?: OrbRecipe
  /** ink follows the theme (default), brand reads --brand, or any CSS color or token. */
  tint?: string
  opts?: OrbProps['opts']
}

function toRgb(tint: string | undefined, el: Element | null): string | undefined {
  if (!tint || tint === 'ink') return undefined
  const [r, g, b] = resolveColor(tint === 'brand' ? 'var(--brand)' : tint, el)
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`
}

export function ThinkingOrb({ recipe, tint, state, speed, dots, dotSize, opts, theme, ...props }: ThinkingOrbProps) {
  const safe = recipe ? sanitizeRecipe(recipe) : null
  const hostRef = React.useRef<HTMLSpanElement>(null)
  const [color, setColor] = React.useState<string>()
  const [tokenTheme, setTokenTheme] = React.useState<'dark' | 'light' | 'auto'>('auto')
  const wanted = tint ?? safe?.tint

  // Tokens resolve only in the browser, and again when the theme changes.
  React.useEffect(() => {
    const read = () => {
      const el = hostRef.current
      setColor(toRgb(wanted, el))
      const hasBg = el && getComputedStyle(el).getPropertyValue('--bg').trim()
      setTokenTheme(hasBg ? (luminance(resolveColor('var(--bg)', el)) > 0.5 ? 'light' : 'dark') : 'auto')
    }
    read()
    const watch = new MutationObserver(read)
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] })
    return () => watch.disconnect()
  }, [wanted])

  return (
    <span ref={hostRef} style={{ display: 'inline-flex' }}>
      <Orb
        state={state ?? safe?.state}
        speed={speed ?? safe?.speed}
        dots={dots ?? safe?.dots}
        dotSize={dotSize ?? safe?.dotSize}
        opts={opts ?? safe?.opts}
        color={color}
        theme={theme ?? tokenTheme}
        {...props}
      />
    </span>
  )
}
