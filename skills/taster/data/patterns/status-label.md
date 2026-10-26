---
id: status-label
name: Status label
category: badge-label
uses: [label-a-state]
surfaces: [dashboard, app]
replaces: [AC-04, AC-05, AC-07, AC-08]
components: [blocks/badge]
inspiration: []
status: stable
---

## When to use

Anywhere a thing has a state a person needs to scan: rows in a table, cards in a list, a header on a detail page. Orders (paid, shipped), jobs (queued, running, failed), documents (draft, published), connections (healthy, down).

If the label is a category or a tag rather than a state, use plain text or the filter chip. If the number matters more than the state, show the number.

## Anatomy

- Text label, 12px, medium weight, neutral ink. The word carries the meaning.
- Optional 6px flat dot in front of the text. Its color is the only place semantic color appears, and only for real success or real error. Everything else (queued, draft, paused, archived) gets a neutral dot or no dot.
- Optional thin 1px neutral border and `--r-pill` radius when the label has to read as a separate object in a dense row. The registry `Badge` is this: border, transparent fill, `variant` of `neutral | up | down | warn | info`, and `withDot` to show or hide the dot.
- Fixed height 24px (`h-6`) so a column of labels aligns.

## Do

- Keep the text neutral in every state. Change the dot, not the word color.
- Write the state in one or two words, sentence case: "Paid", "Needs review", "Failed".
- Use `variant="up"` and `variant="down"` only when the state is an outcome (healthy, outage). In-progress states stay `neutral`.
- Pair the dot with text always. A dot alone fails color-blind readers and screen readers.
- Add `aria-label` or visible text that includes the state, and keep the dot `aria-hidden`.

## Don't

- Don't fill the label with a pale tint and color the text the same hue (green on light green). That is the tinted pill.
- Don't outline a pill in color (a blue border, blue text, transparent fill) to suggest status.
- Don't pulse or glow the dot. An orange pill with a halo that says "Processing" is the loudest thing on the page for the least important state.
- Don't give every state its own hue. Five colors in one table is a rainbow, and none of them means anything.
- Don't stack a status label, a tag and a count in the same cell.

## Swap recipe

Slop version (fixes AC-04, AC-05, AC-07, AC-08):

```css
.badge-success { background: rgba(34, 197, 94, 0.15); color: #16a34a; border-radius: 999px; padding: 2px 10px; }
.badge-info    { background: transparent; color: #3b82f6; border: 1px solid #3b82f6; border-radius: 999px; }
.badge-processing {
  background: rgba(249, 115, 22, 0.15); color: #f97316; border-radius: 999px;
  box-shadow: 0 0 12px rgba(249, 115, 22, 0.6);
}
.dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; animation: pulse 1.5s infinite; }
```

Fixed version:

```tsx
import { Badge } from './blocks/badge'

<Badge variant="up">Paid</Badge>
<Badge variant="down">Failed</Badge>
<Badge variant="neutral">Processing</Badge>
<Badge variant="neutral" withDot={false}>Draft</Badge>
```

The component renders `border border-border bg-transparent text-text` with a 6px dot whose color comes from `--delta-up`, `--delta-down`, `--warning` or the neutral `--text-subtle`. No background tint, no glow, no animation.

## Tokens

- Border: `--border`. Fill: transparent.
- Ink: `--text` for the word, `--text-muted` for the container.
- Dot: `--text-subtle` (neutral), `--delta-up`, `--delta-down`, `--warning`, `--accent`.
- Type: `--t-sm` (12px), `--w-med`.
- Space: `--sp-2` horizontal padding, 6px gap between dot and text, height 24px.
- Radius: `--r-pill`. Shadow: none.
