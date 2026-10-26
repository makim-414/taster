---
id: plan-comparison-table
name: Plan comparison table
category: pricing
uses: [compare-plans]
surfaces: [landing]
replaces: [AC-08, AC-11]
components: [blocks/table]
inspiration: []
status: stable
---

## When to use

Use it under the plan cards when plans differ in more than five ways: limits, integrations, support, security. The cards give the quick read and the table gives the full answer for the person doing procurement. It belongs on a pricing page, rarely on a landing page.

Skip it when the plans differ by one number (seats or volume). Then a sentence on each card is enough.

## Anatomy

A table with plans as columns and features as rows, grouped.

- Header row: plan names, with the price under each name in small text and a button in the last header row on mobile. The recommended column is marked by a single word "Recommended" over the name and a slightly lighter surface for the column; it is not wider or taller.
- Group rows: a spanning row with the group title ("Reports", "Security", "Support") in `--text-subtle`, no fill.
- Feature rows: label on the left (with an optional help tooltip), values in each plan column.
- Cell formats, always in neutral ink: included is a small line check; not included is an en dash drawn as a short rule (use an inline SVG line or the text "Not included", never an actual dash character in the copy); limited shows the limit ("5 domains"); unlimited shows the word "Unlimited"; numbers are tabular and right aligned.

The table scrolls horizontally in a container on mobile, with the first column sticky.

## Do

- Group rows by what the buyer is trying to decide. Put the rows that decide most purchases first.
- Use real limits and units, not "More" and "Lots".
- Give every symbol a text equivalent for screen readers (`<span class="sr-only">Included</span>`).
- Keep header and first column sticky on long tables.
- Make the toggle between monthly and yearly affect the header prices.
- Keep the column order identical to the plan cards above.

## Don't

- Do not color the symbols: green circles for included, red crosses for excluded (AC-11). Neutral ink, line icons.
- Do not use colored status dots in cells to show tier or level (AC-08). Say it in a word.
- Do not make the recommended column a different size or add a glow.
- Do not use more than 30 rows. If you need more, link a separate feature matrix.
- Do not repeat the plan description in every row.

## Swap recipe

Slop version: colored discs, dots and a glowing popular column.

```html
<!-- before: AC-11, AC-08 -->
<td><span class="disc green"><svg><!-- white check --></svg></span></td>
<td><span class="disc red"><svg><!-- white x --></svg></span></td>
<td><span class="dot amber pulsing"></span> Limited</td>
<style>.popular-col { box-shadow: 0 0 40px #8b5cf655; background: #8b5cf611; }</style>
```

Fixed version: neutral line symbols, cells with words and numbers, a quiet column marker.

```tsx
const Check = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 13l4 4 10-10" />
  </svg>
)
const Included = () => (<><Check /><span className="sr-only">Included</span></>)
const No = () => (<><span aria-hidden className="inline-block h-px w-3 bg-text-subtle align-middle" /><span className="sr-only">Not included</span></>)

const columns = [
  { key: 'feature', label: 'Feature' },
  { key: 'starter', label: 'Starter', align: 'right' as const },
  { key: 'team', label: 'Team (recommended)', align: 'right' as const },
]
const rows = [
  { feature: 'Domains', starter: '1', team: '5' },
  { feature: 'Report frequency', starter: 'Weekly', team: 'Daily' },
  { feature: 'Alerts', starter: <No />, team: <Included /> },
  { feature: 'API access', starter: <No />, team: <Included /> },
]

<DataTable columns={columns} rows={rows} />
```

Add group headings by inserting rows whose first cell spans the table and uses `text-label text-text-subtle`. The registry `DataTable` already gives you sentence-case headers, hairline row separators and right-aligned tabular numbers.

## Tokens

- Table: `--bg-elev` surface, `--border` outline, radius `--r-card`; row separators `--border-soft`; row height 40px (the registry default) or `--sp-12` for the airy variant.
- Type: header `--t-sm` in `--text-subtle`; cells `--t-body` in `--text`; group titles `--t-sm` at `--w-med`.
- Recommended column: background `--bg-sunken`, no border change.
- Symbols: `currentColor` set to `--text` for included, `--text-subtle` for not included.
- Space: cell padding `--sp-3` horizontally; section padding `--sp-16`.
