---
id: filter-chip
name: Filter chip
category: badge-label
uses: [filter-and-search]
surfaces: [app, commerce]
replaces: [AC-05]
components: [blocks/badge, blocks/toggle]
inspiration: []
status: stable
---

## When to use

Narrowing a list, grid or feed by a handful of known categories: product types in a store, document kinds in a library, time ranges on a report. Use a row of chips when there are roughly 4 to 12 options and people often pick one or two.

If there are two to four mutually exclusive views of the same data, use the segmented control. If there are dozens of options, use a search field with a combobox.

## Anatomy

- A horizontally scrolling row of chips, 32px tall, 8px gap, no wrap on phones. The row bleeds to the screen edge so the cut-off chip signals "more".
- Unselected chip: transparent fill, 1px `--border`, muted text.
- Selected chip: inverted tone (`--accent` fill with `--accent-fg` text). No hue change. The selection is a lightness change, not a color.
- Optional count in tabular numerals after the label, in subtle ink.
- Optional "Clear" text button at the end of the row, visible only when something is selected.
- Each chip is a toggle: `aria-pressed`, space and enter toggle it. The registry `Toggle` file gives checkbox and switch semantics if you build multi-select as real inputs; `Badge` gives the neutral container.

## Do

- Put the "All" chip first and select it by default so the empty state is never a blank filter.
- Update the list in place and announce the new count with `aria-live="polite"`.
- Keep chip labels to one or two words in sentence case.
- Keep selection in the URL (`?type=linen`) so a filtered view can be shared and survives reload.
- Make the hit target 44px tall on touch by padding the row, even if the chip draws at 32px.

## Don't

- Don't give each category its own pastel color. Filters are not a legend.
- Don't outline selected chips in blue. Outline only says "focus" to most people.
- Don't wrap chips into three lines on a phone. Scroll sideways or move to a sheet.
- Don't add an icon to every chip. If a category needs an icon to be understood, the label is wrong.
- Don't let selected state depend on color alone. The inverted fill is lightness, which survives grayscale.

## Swap recipe

Slop version (fixes AC-05):

```css
.chip { border: 1px solid #8b5cf6; color: #8b5cf6; background: transparent; border-radius: 999px; padding: 4px 12px; }
.chip.active { background: rgba(139, 92, 246, 0.15); }
```

Fixed version:

```tsx
export function FilterChips({ options, value, onChange }: {
  options: { id: string; label: string; count?: number }[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1" role="group" aria-label="Filter by type">
      {options.map((o) => {
        const on = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.id)}
            className={
              'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm outline-none ' +
              'transition-colors focus-visible:ring-2 focus-visible:ring-ring ' +
              (on
                ? 'border-transparent bg-accent text-accent-fg'
                : 'border-border bg-transparent text-text-muted hover:text-text')
            }
          >
            {o.label}
            {o.count != null && <span className="tabular-nums text-text-subtle">{o.count}</span>}
          </button>
        )
      })}
    </div>
  )
}
```

## Tokens

- Selected: `--accent` fill, `--accent-fg` text. Unselected: transparent, `--border`, `--text-muted`.
- Hover: `--text`. Focus ring: `--ring`.
- Type: `--t-body` (14px), `--w-med`; counts use tabular numerals.
- Space: gap `--sp-2`, horizontal padding `--sp-3`, height 32px.
- Radius: `--r-pill`. Motion: color change at `--dur-press`.
