---
id: spacing-and-dividers
name: Spacing and dividers
category: layout-shell
uses: [organize-the-page]
surfaces: [landing, app, dashboard]
replaces: [CMP-02, LAY-06]
components: [blocks/separator]
inspiration: []
status: stable
---

## When to use

Use it on every layout. Space is how a page tells the reader which things belong together. Related items sit close, unrelated groups sit far apart, and a thin line appears only where space alone does not separate two groups of equal weight.

When a page feels like a stack of identical parts, or when you reach for another bordered box to separate things, this pattern is the fix.

## Anatomy

- Scale: the 4px grid in the tokens: 4, 8, 12, 16, 20, 24, 32, 48, 64. Nothing off the scale.
- Inside a group: `--sp-2` to `--sp-3` between a label and its value, a title and its line, a row and the next row.
- Between groups: `--sp-6` to `--sp-8` inside a card or panel, `--sp-12` to `--sp-16` between page sections.
- Divider: a 1px line in `--border` (or `--border-soft` inside a list), full width of its container, no shadow.
- Rhythm: at least three distinct vertical values on a page, so the eye can tell levels apart.
- Whitespace in cards: padding `--sp-5` to `--sp-6`, equal on all sides unless a header or footer needs a divider.

## Do

- Decide the grouping first, then pick the gap. Close for related, far for unrelated, with a ratio of at least 2 to 1.
- Use one divider per boundary. If a card has a header, body and footer, two dividers is the maximum.
- Use `gap` in flex and grid and a single owner for each space. Avoid mixing margins and gaps on the same edge.
- Make the gap between sections larger than the gap between any two items within a section.
- Check at 360px. Halve section gaps, keep item gaps.

## Don't

- Do not nest bordered boxes to create grouping (CMP-02). Remove the inner border, add space.
- Do not use one spacing value everywhere, for example 24px between all sections and all cards (LAY-06).
- Do not invent values like 18px or 22px that are not in the scale.
- Do not use a divider and a background step and a gap to separate the same two things.
- Do not use thick, colored or dashed dividers for decoration.

## Swap recipe

Slop: every block 24px apart, every group in a box.

```css
/* before: LAY-06, CMP-02 */
section { margin-bottom: 24px; }
.card { margin-bottom: 24px; padding: 24px; border: 1px solid #ddd; border-radius: 12px; }
.card .group { margin-bottom: 24px; padding: 24px; border: 1px solid #ddd; border-radius: 12px; }
```

Fixed: tight inside, wide between, a hairline where groups are equal.

```css
/* after */
.page { display: flex; flex-direction: column; gap: var(--sp-16); }
.section { display: flex; flex-direction: column; gap: var(--sp-6); }
.group { display: flex; flex-direction: column; gap: var(--sp-2); }
.group + .group { padding-top: var(--sp-6); border-top: 1px solid var(--border); }
```

```tsx
import { Separator } from './blocks/separator'

<div className="flex flex-col gap-2"> <Field /> <Field /> </div>
<Separator className="my-6" />
<div className="flex flex-col gap-2"> <Field /> <Field /> </div>
```

## Tokens

`--sp-1` (4), `--sp-2` (8), `--sp-3` (12), `--sp-4` (16), `--sp-5` (20), `--sp-6` (24), `--sp-8` (32), `--sp-12` (48), `--sp-16` (64), `--border`, `--border-soft`. Tailwind: `gap-2`, `gap-6`, `my-6`, `Separator` (`h-px w-full bg-border`).
