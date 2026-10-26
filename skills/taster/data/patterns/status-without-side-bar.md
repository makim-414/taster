---
id: status-without-side-bar
name: Status without side bar
category: card
uses: [label-a-state]
surfaces: [dashboard, app]
replaces: [AC-10]
components: [blocks/alert, blocks/badge]
inspiration: []
status: stable
---

## When to use

Use it when a card, a row or a callout has to carry a severity: a failed sync, a plan limit warning, a pending review. The colored left bar is the most copied way to do this, and it says nothing a word does not say better. Tell the state with a text label and let the border or surface carry the emphasis.

Pick this pattern over a plain badge when the whole block is affected, not a single value inside it. For one value in a table cell, use status-label instead.

## Anatomy

- Container: the normal card surface (`--bg-elev`) with a 1px `--border` on all four sides, equal width.
- State label: a short word or phrase in the title line, set in `--text`, such as "Sync failed" or "Limit reached". The word is the state, color is a hint.
- Optional marker: one 16px line icon or a 6px dot in the semantic color (`--danger`, `--warning`, `--success`). It is the only colored element.
- Emphasis step: for urgent states, brighten the full border one step (for example `--text-subtle`) instead of thickening one edge.
- Action: one text button or link in the footer that resolves the state.

## Do

- Write the state as text first. A reader who cannot see color still gets the message.
- Keep all four borders the same width. If urgency needs more weight, change the border color for the whole box.
- Reserve semantic color for real meaning, and use at most one colored mark per block.
- Make the next step explicit: "Reconnect", "Upgrade", "View log".
- Use `role="alert"` only for states that interrupt, and `role="status"` for the quiet ones.

## Don't

- Do not draw `border-left: 4px solid red` on a rounded card (AC-10). The square bar against a round corner is the tell.
- Do not tint the whole box pale red or pale yellow as well. That is a second slop pattern stacked on the first.
- Do not use the same bar for four different severities and rely on hue alone.
- Do not add a top bar either. A thick top border is the same device rotated.
- Do not wrap the label in a colored pill inside the box. See status-label for the neutral chip.

## Swap recipe

Slop: a rounded card with a heavy colored edge on one side.

```css
/* before: AC-10 */
.notice {
  background: #fff5f5;
  border: 1px solid #eee;
  border-left: 4px solid #ef4444;
  border-radius: 8px;
  padding: 16px;
}
```

Fixed: neutral surface, equal hairline, the state in words, one colored icon.

```css
/* after */
.notice {
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: var(--sp-4);
}
.notice[data-urgent="true"] { border-color: var(--text-subtle); }
.notice__icon { color: var(--danger); }   /* the only colored thing */
```

```tsx
import { Alert } from './blocks/alert'

<Alert tone="danger" title="Sync failed">
  The last import stopped at row 412. <a href="/logs">View log</a>
</Alert>
```

## Tokens

`--bg-elev`, `--border`, `--text-subtle` (urgent border), `--danger`, `--warning`, `--success`, `--r-md`, `--sp-4`, `--text`, `--text-muted`. Tailwind: `border border-border bg-bg-elev rounded-md p-4`, icon `text-danger` or `text-warning`. The soft variants (`--danger-soft`) exist for chips, not for card fills.
