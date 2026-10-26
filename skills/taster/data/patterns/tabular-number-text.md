---
id: tabular-number-text
name: Tabular number text
category: typography
uses: [show-one-number, browse-records]
surfaces: [dashboard, app]
replaces: [AC-09]
components: []
inspiration: []
status: stable
---

## When to use

Use it for every figure that sits in a column, a KPI tile, a price list or a timer: counts, currency, percentages, dates, durations. The body typeface with `font-variant-numeric: tabular-nums` makes digits the same width, so columns align and changing numbers do not jitter.

It replaces the habit of setting labels, captions and numbers in a monospaced font to look "technical". Monospace belongs to code, keyboard shortcuts and fixed-width data such as hashes.

## Anatomy

- Face: the same body font as the rest of the UI. The `--font` stack, not `--font-mono`.
- Feature: `font-variant-numeric: tabular-nums`, plus `slashed-zero` only when 0 and O would be confused (IDs, codes).
- Alignment: numbers in a column are right aligned, and the header of that column too. Text columns are left aligned.
- Units: the unit or currency symbol sits in `--text-muted`, a few percent smaller, attached to the figure with a thin space.
- Deltas: signed, with a minus sign (U+2212) rather than a hyphen, in the delta color only on the delta itself.
- Live values: tabular figures stop layout jumps as a counter updates.

## Do

- Add `tabular-nums` globally to table cells, KPI values, and any element that updates in place.
- Keep decimals consistent per column. A column with 2 and 2.50 is a bug.
- Format with `Intl.NumberFormat` for the locale, not by hand.
- Right align and use `white-space: nowrap` so a number never wraps.
- Use `text-label` or `text-caption` in the body face for tiny captions.

## Don't

- Do not set short labels, tags, nav items and captions in a code font for flavor (AC-09).
- Do not use the monospace font for a whole table to get alignment. The OpenType feature does it.
- Do not left align a numeric column because the header is left aligned.
- Do not mix figure styles (old-style and lining) in the same view.
- Do not color every number. Only a delta or a threshold crossing earns color.

## Swap recipe

Slop: monospace everywhere.

```css
/* before: AC-09 */
.label, .tag, .kpi-value, td, .caption { font-family: 'JetBrains Mono', monospace; }
```

Fixed: body face with tabular figures.

```css
/* after */
.kpi-value, td.num, .counter {
  font-family: var(--font);
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}
.label, .tag, .caption { font-family: var(--font); }   /* plain text stays plain */
code, kbd, pre { font-family: var(--font-mono); }       /* the legitimate use */
```

```tsx
<td className="text-right tabular-nums">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.total)}</td>
```

## Tokens

`--font` (all UI text), `--font-mono` (code only), `--t-h2` (KPI value size), `--t-body`, `--t-sm`, `--w-med`, `--text`, `--text-muted`, `--delta-up`, `--delta-down`. Tailwind: `tabular-nums`, `text-right`, `whitespace-nowrap`, `text-h2 font-semi` for a KPI value, as in `blocks/kpi`.
