---
id: line-icon-set
name: Line icon set
category: icon
uses: [set-the-visual-foundation]
surfaces: [landing, app, dashboard]
replaces: [AC-03, AC-11, CMP-03, ICO-01, ICO-02, ICO-03]
components: [icons/icon]
inspiration: []
status: stable
---

## When to use

Use it as the single icon vocabulary for a product or a page, after icon-placement has decided which slots get an icon at all. Pick one family of 24px line icons, one stroke weight, and use icons only where they add meaning: navigation items, actions, categories, file types. An icon next to a heading that already says the same thing is noise.

This pattern removes the emoji used as feature icons, the filled circles with a white check, the pale rounded square behind an icon, and the same three default glyphs (bolt, shield, sparkles) repeated down the page.

## Anatomy

- Grid: 24 by 24 `viewBox`, 2px safe margin inside, paths drawn on the pixel grid.
- Style: `fill: none`, `stroke: currentColor`, one `stroke-width` between 1.5 and 2 on the 24 grid for the whole set (the registry `Icon` uses `--icon-stroke`, 2), round caps and joins. A filled glyph appears only as the selected state of its outline twin.
- Color: inherits text color. Never a per-icon hue. The parent sets `color`.
- Sizes: 16px beside body text, 20px in buttons and nav, 24px for category entries. No other sizes.
- Placement: directly beside the label with `gap: var(--sp-2)`, centered on the first line of the label rather than on the whole text block. A category icon sits next to its name with no tile, circle or border around it.
- Accessibility: decorative icons get `aria-hidden="true"`; icon-only buttons get an `aria-label`.

## Do

- Choose one set (or draw one) and stay in it. Mixing libraries, or outline and filled icons, breaks the rhythm (ICO-02).
- Keep one stroke weight. Icons drawn at 1.5 next to icons drawn at 2.5 read as two sets (ICO-03).
- Name each icon by meaning ("invoice", "export") rather than by shape, and keep a short registry.
- Remove an icon when its label alone is clear. Navigation with ten icons and ten labels is usually fine; a card with an icon, heading and line of copy rarely needs the icon.
- Draw missing icons on the same grid and stroke instead of importing a second library.
- Check sizes at 16px. Fine details that vanish at 16px are not worth drawing.

## Don't

- Do not use emoji or pictographic symbols as UI icons (AC-03). They render differently on every platform.
- Do not put an icon inside a filled circle or a green check disc (AC-11).
- Do not put an icon on a pale tinted rounded square above every heading (CMP-03).
- Do not fill a grid with the same few stock icons with no link to the content (ICO-01).
- Do not recolor each icon in a different brand color.

## Swap recipe

Slop: emoji bullets and an icon in a tinted tile.

```jsx
{/* before: AC-03, CMP-03, AC-11 */}
<li>{/* lightning emoji */} Fast setup</li>
<div className="size-12 rounded-xl bg-violet-100 text-violet-600">{/* sparkles glyph */}</div>
<span className="size-6 rounded-full bg-green-500 text-white">{/* check glyph */}</span>
```

Fixed: one stroke family, inherited color, no tile.

```tsx
import { Icon } from './icons'

{/* after */}
<li className="flex items-center gap-2 text-body text-text">
  <Icon name="check" width={16} height={16} aria-hidden="true" className="text-text-muted" />
  Import from a CSV
</li>
```

```css
.icon { width: 20px; height: 20px; fill: none; stroke: currentColor;
        stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
```

## Tokens

`currentColor` for stroke, so `--text`, `--text-muted` or `--text-subtle` on the parent decides color. Spacing `--sp-2` between icon and label. No background token is used behind an icon. The shared `Icon` component in `registry/src/icons/index.tsx` is the place to add new paths.
