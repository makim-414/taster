import * as React from 'react'
import { cn } from './_cn'

// ThemeScope. Applies a token set to one subtree instead of the whole page: the light set from themes/light.css
// (through its .theme-light class), the brand slot, and the radius scale. Every registry component inside follows,
// because components read only the alias layer. Use it for a light preview panel inside a dark app, a customer's
// brand preview, or a side by side comparison of two settings.
//
// CSS custom properties that are built from other properties (--accent from --brand, --r-* from --radius) are
// resolved where they are declared, so a scope has to declare them again. This component does that for you.
// It never invents a value: brand and radius come from the caller. Needs tokens.css, and themes/light.css for
// theme="light".

export interface ThemeScopeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** "light" applies themes/light.css to this subtree. "inherit" keeps the page's set. */
  theme?: 'inherit' | 'light'
  /** Any CSS color for the brand slot. --accent follows it. */
  brand?: string
  /** Text color on top of the brand fill. Pick one with 4.5:1 contrast against `brand`. */
  brandForeground?: string
  /** Base radius, for example "4px" or "0.75rem". The --r-* scale is rebuilt from it. */
  radius?: string
  /** Extra overrides for named tokens, for example { '--sp-4': '12px' }. */
  tokens?: Record<`--${string}`, string>
  /** Paint the scope with its own background and text color. */
  surface?: boolean
}

const RADIUS_SCALE: Record<string, string> = {
  '--r-sm': 'calc(var(--radius) * 0.6)',
  '--r-md': 'calc(var(--radius) * 0.8)',
  '--r-card': 'var(--radius)',
  '--r-xl': 'calc(var(--radius) * 1.4)',
  '--r-2xl': 'calc(var(--radius) * 1.8)',
  '--r-3xl': 'calc(var(--radius) * 2.2)',
  '--r-4xl': 'calc(var(--radius) * 2.6)',
}

export const ThemeScope = React.forwardRef<HTMLDivElement, ThemeScopeProps>(
  ({ theme = 'inherit', brand, brandForeground, radius, tokens, surface = true, className, style, ...props }, ref) => {
    const vars: Record<string, string> = {}
    if (brand) {
      vars['--brand'] = brand
      vars['--accent'] = 'var(--brand)'
    }
    if (brandForeground) vars['--accent-fg'] = brandForeground
    if (radius) {
      vars['--radius'] = radius
      Object.assign(vars, RADIUS_SCALE)
    }
    if (tokens) Object.assign(vars, tokens)
    return (
      <div
        ref={ref}
        data-theme-scope={theme}
        className={cn(theme === 'light' && 'theme-light', surface && 'bg-bg text-text', className)}
        style={{ ...(vars as React.CSSProperties), ...style }}
        {...props}
      />
    )
  },
)
ThemeScope.displayName = 'ThemeScope'
