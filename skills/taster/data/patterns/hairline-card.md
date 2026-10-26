---
id: hairline-card
name: Hairline card
category: card
uses: [organize-the-page]
surfaces: [landing, dashboard, app]
replaces: [AC-14, CMP-04, CMP-05, COL-07]
components: [blocks/card]
inspiration: []
status: stable
---

## When to use

Use it for any bounded group on a page: a settings block, a chart panel, a plan summary, a form section. A card is the right container when the content has its own title and could be moved elsewhere without losing meaning. If the content is just a paragraph, a card is decoration and you should leave it on the page surface.

The pattern fixes the "everything is a white box" look: same radius, same gray border, same soft shadow on forty elements. Here the container is defined by a one pixel border and a small step in surface tone, and the radius follows the size of the box.

## Anatomy

- Surface: `--bg-elev`, one step away from `--bg`. On dark themes this is a translucent white, on light themes an opaque white.
- Edge: 1px solid `--border`. Nothing else draws the edge, no inset shadow, no second ring.
- Radius: scaled to the element. Small controls inside use `--r-sm`, the card itself `--r-card`, a full-width panel or media frame `--r-xl`.
- Slots: header (title and one line of description), content, footer for actions. Padding is `--sp-5` on every slot so the text edge lines up.
- Elevation: none at rest. A shadow (`--sh-pop`) belongs on things that float above the page, like menus and popovers, not on cards sitting in a grid.

## Do

- Let the surface step and the hairline do the work. If the border is removed and you can still see the card, the tone step is enough.
- Put the title in `text-title` weight 600 and the description in `--text-muted`, so two levels of hierarchy exist without a third color.
- Scale radius with size: a 32px chip gets `--r-sm`, a 320px card gets `--r-card`, a 640px panel gets `--r-xl`.
- Use one hover treatment for clickable cards: raise the border to `--border` at higher alpha or step the surface once. Do not add a lift and a shadow at the same time.
- Keep a card grid on a 16px or 24px gap taken from the spacing scale.

## Don't

- Do not apply the same `border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,.08)` to every box (CMP-04).
- Do not give the card a colored glow on hover, or a blurred colored shadow behind a featured one (COL-07).
- Do not apply `backdrop-filter: blur()` to cards that sit on a flat page. Blur is for layers that really overlap (CMP-05).
- Do not fill a page with four or more identical light gray bordered boxes when two of them could share one surface (AC-14). Merge them first, see single-surface-section.
- Do not nest a second bordered box inside the card for each field or row.

## Swap recipe

Slop: a generic card with a big radius, a gray shadow and a glow on hover.

```css
/* before: AC-14, CMP-04, COL-07 */
.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(12px);            /* CMP-05 */
}
.card:hover { box-shadow: 0 12px 40px rgba(99, 102, 241, 0.35); } /* COL-07 */
```

Fixed: tokens, a hairline, radius from the scale, no shadow at rest, no blur.

```css
/* after */
.card {
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--r-card);
  box-shadow: none;
}
.card:hover { border-color: var(--text-subtle); }
.card .card-media { border-radius: var(--r-md); } /* inner radius is smaller */
```

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './blocks/card'

<Card>
  <CardHeader>
    <CardTitle>Billing</CardTitle>
    <CardDescription>Invoices and payment method</CardDescription>
  </CardHeader>
  <CardContent>{/* rows, divided by 1px lines, not boxes */}</CardContent>
</Card>
```

## Tokens

`--bg-elev` (surface), `--border` (edge), `--border-soft` (quiet dividers inside), `--r-sm`, `--r-md`, `--r-card`, `--r-xl`, `--sp-4`, `--sp-5`, `--sp-6`, `--text`, `--text-muted`, `--sh-pop` (only for floating layers). Tailwind: `bg-bg-elev border border-border rounded-lg p-5`, `text-title`, `text-text-muted`.
