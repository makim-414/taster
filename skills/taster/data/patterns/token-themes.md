---
id: token-themes
name: Token themes
category: layout-shell
uses: [set-the-visual-foundation, switch-views]
surfaces: [landing, app, dashboard]
replaces: [CMP-04, CMP-11, COL-02, COL-03, COL-05, COL-08]
components: [blocks/toggle, blocks/appearance-picker]
inspiration: []
status: stable
---

## When to use

Use it before the first component is styled. Colors, space, radius, type, shadow and motion live as CSS variables, and light and dark are two sets of values for the same names. Components read only the variables, so a new brand or a new mode is one stylesheet, not a rebuild.

It prevents four common failures: a single dark mode with no light option, a near-black page with a neon glow, a cream page with a terracotta accent used because it is the safe "warm" look, and a swapped accent hue (purple replaced by emerald) with the same structure.

## Anatomy

- Layer 1, raw values: a neutral ramp and the semantic hues, for example `oklch(0.12 0 0)`. Nobody references these from components.
- Layer 2, roles: `--bg`, `--bg-elev`, `--bg-sunken`, `--border`, `--text`, `--text-muted`, `--text-subtle`, `--accent`, `--success`, `--warning`, `--danger`.
- Layer 3, component tokens: only when a component needs its own knob, such as `--sidebar` or `--card-radius`.
- Brand slot: one variable, `--brand`, defaults to near white (dark) or ink (light). A theme sets this and, if data uses color, the `--chart-*` ramp. Nothing else.
- Modes: dark is the `:root` default with a `.theme-dark` class, light is `:root[data-theme="light"]` and a `.theme-light` class. Both define every role. `color-scheme` is set to match.
- Switch: a toggle that writes `data-theme` on `<html>` and stores the choice. First visit follows `prefers-color-scheme`. When the mode is a large part of the service, use `appearance-picker` on the settings page instead.

## Do

- Step dark surfaces by lightness (0.12, 0.18, 0.27 in OKLCH) and let borders be white at 8 to 15% alpha.
- Keep the dark neutral at chroma 0. A hue of 240 at chroma 0.005 already reads as a blue or teal cast across a whole page, and a 5% white card lifts the page more than it looks; 3% is enough.
- Check the smallest text token (`--text-subtle`) at 4.5:1 (rule COL-08) on the surface it sits on that is closest in lightness (`--muted`, `--secondary`), not only on `--bg`.
- Keep accents flat. Emphasis is a contrast step or a single brand fill, not a glow.
- Make light surfaces opaque. A 5% white card disappears on a white page.
- Tune semantic colors per mode; the same green is too bright on white.
- Test both modes on every screen, including charts and focus rings.

## Don't

- Do not ship dark only and ignore the system preference (CMP-11).
- Do not use a near-black page with a saturated accent that has a 16px-plus glow (COL-03).
- Do not default to a cream background with a terracotta accent and a serif because it feels "designed" (COL-02).
- Do not answer a ban on purple by moving to emerald with the same glow and gradients (COL-05). Change the structure, not the hue.
- Do not give every box the same large radius and the same shadow (CMP-04). Radius and shadow are tokens that scale.

## Swap recipe

Slop: hardcoded dark, glowing accent, no light mode.

```css
/* before: CMP-11, COL-03, CMP-04 */
body { background: #0b0b0b; color: #fff; }
.btn { background: #00ff88; box-shadow: 0 0 32px #00ff88; }
.box { border-radius: 24px; box-shadow: 0 8px 32px rgba(0,0,0,.5); }
```

Fixed: roles as tokens, both modes, flat accent.

```css
/* after */
:root {
  color-scheme: dark;
  --bg: oklch(0.12 0 0);  --bg-elev: oklch(1 0 0 / 3%);
  --text: oklch(0.985 0 0);     --border: oklch(1 0 0 / 8%);
  --brand: oklch(0.985 0 0);    --accent: var(--brand);  --accent-fg: oklch(0.205 0 0);
}
:root[data-theme="light"] {
  color-scheme: light;
  --bg: oklch(0.993 0.001 95);  --bg-elev: oklch(1 0 0);
  --text: oklch(0.22 0.006 280); --border: oklch(0.25 0.01 280 / 13%);
  --brand: oklch(0.24 0.006 280); --accent-fg: oklch(0.99 0 0);
}
.btn { background: var(--accent); color: var(--accent-fg); }
```

```tsx
import { Switch } from './blocks/toggle'

<Switch label="Light mode" checked={light}
  onChange={(e) => document.documentElement.dataset.theme = e.target.checked ? 'light' : 'dark'} />
```

## Tokens

This pattern owns the token files: `registry/src/tokens.css`, `registry/src/themes/light.css`, `registry/src/tailwind-preset.cjs`. Names: `--background`, `--foreground`, `--card`, `--bg`, `--bg-elev`, `--bg-sunken`, `--border`, `--text`, `--text-muted`, `--text-subtle`, `--brand`, `--accent`, `--accent-fg`, `--success`, `--warning`, `--danger`, `--chart-1` to `--chart-6`, `--r-sm` to `--r-4xl`, `--sp-1` to `--sp-16`, `--sh-card`, `--sh-pop`, `--ease-out`, `--dur-press`.
