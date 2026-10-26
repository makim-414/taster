---
id: hairline-data-table
name: Hairline data table
category: table
uses: [browse-records]
surfaces: [dashboard, app]
replaces: [AC-01, AC-09, AC-14, CMP-02]
components: [blocks/table]
inspiration: []
status: stable
---

## When to use

A list of records with a few columns that people scan and compare: orders, reports, members, invoices. Use it when sort and pagination are not needed or are handled elsewhere; reach for sortable-data-grid when they are. If each row needs 6 lines of detail, it is a list of cards, not a table.

## Anatomy

- Header row: sentence case, 12px, `--text-subtle`, weight 500, 40px high. Not uppercase, not tracked.
- Body rows: 40 to 44px high, 1px `--border-soft` between rows, no zebra stripes. Hover fills `--bg-sunken`.
- Alignment: text left, numbers and dates right, all with tabular numerals. The header aligns with its column.
- Outer frame: a 1px `--border` and `--r-card` on the wrapper only. Cells have no vertical borders.
- First column holds the row identity (name, id) in `--text`; other columns use `--text-muted` unless they are the point.
- Status goes in a column as a neutral label, see status-label.
- Header and footer stay fixed while the body scrolls inside a bounded height; footer holds totals.
- Empty state: one row spanning all columns with a sentence and the next action.

## Do

- Right-align numeric columns and show units in the header ("Amount, USD"), not in every cell.
- Truncate long text with an ellipsis and a full value on hover or in a detail view.
- Keep 5 to 8 columns. Move the rest to a detail panel.
- Make rows keyboard reachable when they open something: the row is a link or has a button in the first cell.
- Use a real `<table>` with `<th scope="col">`.

## Don't

- Don't set headers in uppercase with wide letter spacing.
- Don't set cell numbers, dates or ids in a monospace font for style. Use the body font with `tabular-nums`.
- Don't nest a bordered card inside a bordered table cell.
- Don't wrap the table in a card that also has padding and a shadow; the table is the card.
- Don't stripe rows and also draw borders. Pick hairlines.

## Swap recipe

Slop: tracked all-caps header, mono cells, zebra rows, a card around a card. Fixes AC-01, AC-09, AC-14 and CMP-02.

```css
/* before */
.card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
.card .table-wrap { border: 1px solid #e5e7eb; border-radius: 8px; }
th { text-transform: uppercase; letter-spacing: 0.12em; font-size: 11px; }
td { font-family: ui-monospace, monospace; }
tr:nth-child(even) { background: #f9fafb; }
```

```tsx
// after
import { DataTable } from './blocks/table'

<DataTable
  columns={[
    { key: 'name', label: 'Customer' },
    { key: 'plan', label: 'Plan' },
    { key: 'orders', label: 'Orders', align: 'right' },
    { key: 'amount', label: 'Amount, USD', align: 'right' },
  ]}
  rows={[
    { name: 'Hana Studio', plan: 'Team', orders: 42, amount: '1,280.00' },
    { name: 'Northline', plan: 'Solo', orders: 9, amount: '214.50' },
  ]}
/>
```

`DataTable` is the wrapper with the border and radius, so remove the outer card. Headers are `text-xs font-medium text-text-subtle`, numeric columns get `text-right tabular-nums`, rows use `border-border-soft` and `hover:bg-bg-sunken`.

## Tokens

- `--bg-elev`, `--bg-sunken`: table surface and row hover.
- `--border`, `--border-soft`: frame and row dividers.
- `--text`, `--text-muted`, `--text-subtle`: cell, secondary cell, header.
- `--t-body`, `--t-sm`: cell and header size.
- `--r-card`: wrapper corner.
- `--font`: body font for all cells, with `font-variant-numeric: tabular-nums` on numbers.
