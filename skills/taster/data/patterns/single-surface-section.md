---
id: single-surface-section
name: Single surface section
category: card
uses: [organize-the-page]
surfaces: [dashboard, app]
replaces: [CMP-02]
components: [blocks/card, blocks/separator]
inspiration: []
status: stable
---

## When to use

Use it whenever you notice a bordered box inside a bordered box: a settings card whose fields each sit in their own outlined tile, a table inside a panel inside a page card. One idea gets one container. Everything inside is separated by spacing and a thin divider, not by more boxes.

This is also the right shape for list or table frames that need a fixed header and a scrolling body: one rounded frame, one border, rows divided by lines.

## Anatomy

- Outer surface: a single `Card` with `--bg-elev` and a 1px `--border`.
- Section header: title and optional description at the top, with `--sp-5` padding.
- Groups: each group is a block of rows. Between groups sits one `Separator` (1px, `--border`) or `--sp-6` of empty space.
- Rows: plain flex rows with no border of their own. A row can have a hover surface (`--bg-sunken`) but never an outline at rest.
- Footer: actions aligned right, after a divider.
- Overflow edge: if the body scrolls, draw the frame border once on the outer element, not on both the frame and the table.

## Do

- Count the borders along any vertical line through the section. More than two (the outer edges) means something is boxed that should not be.
- Use `--sp-3` between related rows and `--sp-6` between groups so the grouping reads without a line.
- Use a divider when groups are of equal weight and a heading when they are not.
- Let inputs keep their own border. Controls are the one allowed inner outline.
- For selectable options that really are separate objects, use list-item-row option cards instead.

## Don't

- Do not wrap each form field group in its own bordered card inside the section card (CMP-02).
- Do not put a shadowed stat tile inside a bordered panel inside a card.
- Do not use a colored background strip as a substitute for a divider.
- Do not add an inner border on a table that already sits in a bordered frame.
- Do not fix nesting by removing the outer border and keeping three inner ones. Keep the outer one.

## Swap recipe

Slop: a card that holds bordered sub-cards.

```jsx
{/* before: CMP-02 */}
<div className="rounded-xl border p-6 shadow-sm">
  <h3>Notifications</h3>
  <div className="rounded-lg border p-4 shadow-sm">Email digest ...</div>
  <div className="rounded-lg border p-4 shadow-sm">Push alerts ...</div>
</div>
```

Fixed: one surface, rows divided by a hairline.

```tsx
import { Card, CardHeader, CardTitle, CardContent } from './blocks/card'
import { Separator } from './blocks/separator'

{/* after */}
<Card>
  <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
  <CardContent className="flex flex-col gap-3">
    <Row label="Email digest" />
    <Separator />
    <Row label="Push alerts" />
  </CardContent>
</Card>
```

```css
.row { display: flex; align-items: center; gap: var(--sp-3); padding-block: var(--sp-3); }
.row:hover { background: var(--bg-sunken); }
```

## Tokens

`--bg-elev`, `--border`, `--border-soft`, `--bg-sunken` (row hover), `--sp-3`, `--sp-5`, `--sp-6`, `--r-card`. Tailwind: `Card` plus `Separator` (renders `h-px w-full bg-border`), `gap-3`, `p-5`.
