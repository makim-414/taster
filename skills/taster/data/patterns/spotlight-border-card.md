---
id: spotlight-border-card
name: Spotlight border card
category: card
uses: [organize-the-page]
surfaces: [landing]
replaces: [COL-07]
components: [blocks/card]
inspiration: []
status: draft
---

## When to use

Use it on a marketing page for a short row of cards that link somewhere, when you want a hint of life without a colored glow. The light follows the pointer along the card edge only. The inside of the card stays flat, so the text keeps its contrast.

Skip it in dense app screens, on touch-only layouts where there is no pointer, and anywhere more than about six cards share the viewport. One quiet effect per page is the budget.

## Anatomy

- Base card: the hairline card, `--bg-elev` with a 1px `--border`.
- Border layer: a pseudo-element on the same box with `padding: 1px`, a `radial-gradient` centered at the pointer, and a mask that cuts out the content box so only the 1px ring shows.
- Pointer position: two custom properties, `--mx` and `--my`, set from `pointermove` on the card, in pixels relative to the card.
- Light color: a neutral, `--text` at low alpha. Not a brand hue, not a saturated glow.
- Fallback: with no pointer or with reduced motion, the ring is static `--border`.

## Do

- Keep the gradient radius around 160 to 240px and the peak alpha under 0.5, so the effect reads as a sheen on the edge.
- Update the properties with `requestAnimationFrame` or just let CSS read them. No React state per mouse move.
- Fade the ring in over `--dur-dropdown` with `--ease-out` on `pointerenter`.
- Make the whole card the link target, and keep a visible `:focus-visible` ring for keyboard users.
- Disable the effect under `@media (hover: none), (prefers-reduced-motion: reduce)`.

## Don't

- Do not add a `box-shadow` glow in the brand color around the card (COL-07).
- Do not put the light inside the card as a filled radial gradient. It lowers text contrast and looks like a mesh background.
- Do not combine it with a tilt, a scale and a lift. Pick the border light alone.
- Do not run it on every card of every section of a long page.
- Do not make the light color saturated just because the page has an accent.

## Swap recipe

Slop: a big colored shadow that blooms on hover.

```css
/* before: COL-07 */
.card { border-radius: 16px; transition: box-shadow .3s; }
.card:hover { box-shadow: 0 0 60px 10px rgba(124, 58, 237, 0.45); }
```

Fixed: the same hover gets a 1px ring lit near the pointer.

```css
/* after */
.spot { position: relative; background: var(--bg-elev); border-radius: var(--r-card); }
.spot::before {
  content: ""; position: absolute; inset: 0; padding: 1px; border-radius: inherit;
  background: radial-gradient(200px circle at var(--mx, 50%) var(--my, 50%),
              color-mix(in oklch, var(--text) 45%, transparent), transparent 70%),
              var(--border);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  opacity: 0; transition: opacity var(--dur-dropdown) var(--ease-out);
  pointer-events: none;
}
.spot:hover::before { opacity: 1; }
```

```tsx
<div className="spot" onPointerMove={(e) => {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
}}>...</div>
```

## Tokens

`--bg-elev`, `--border`, `--text` (light color source), `--r-card`, `--dur-dropdown`, `--ease-out`, `--ring` (focus). Shadows (`--sh-card`, `--sh-pop`) are not used here on purpose.
