---
id: sortable-data-grid
name: Sortable data grid
category: table
uses: [browse-records, filter-and-search]
surfaces: [dashboard, app]
replaces: [AC-08, AC-09]
components: [blocks/datagrid]
inspiration: [https://ui.shadcn.com/docs/components/data-table, https://tanstack.com/table]
status: stable
---

## When to use

A working table where people look things up, reorder, filter and act on rows: a queue, an inventory, a customer list with a few hundred rows or more. If the list is short and static, hairline-data-table is enough. If every row is a decision with a next step, add the decision columns described below.

## Anatomy

- Header cells are buttons. A small chevron pair marks sortable columns; the active column shows a single up or down chevron in `--text`. `aria-sort` is set on the `th`.
- Toolbar above the table: search, filter chips or selects, a column chooser, a density toggle (comfortable 44px, compact 32px). See search-and-filter-bar.
- Sticky first column and sticky header; the first column holds the row identity.
- Footer: "Page 2 of 14, 276 rows" at the left, Previous and Next at the right. Page size selector if rows exceed 50.
- Row action: clicking the row opens a detail sheet; the primary action sits in the last column as a text button.
- Decision queue rows add three cells: a verdict as plain text ("Go", "Hold"), stage progress as five dots (see stage-dot-progress), and a next-action button.
- Sort, filter and page live in the URL query string, so a link reproduces the view.
- Numbers right-aligned with tabular numerals, same as hairline-data-table.

## Do

- Sort on the server when the data does; show the loading state as skeleton rows of the same height.
- Keep the sort indicator quiet until a column is active.
- Persist column visibility and density per user.
- Offer bulk selection with a checkbox column and a bar that appears only when rows are selected.
- Make Previous and Next at least 32px high with a visible disabled state.

## Don't

- Don't use a colored dot as the only status marker in a column. Use words, and add a dot only if the color rule is explained.
- Don't set cells in monospace to look technical.
- Don't hide sorting behind a menu when the header can be clicked.
- Don't reset the page to 1 when the user sorts a column they were scanning; keep position where it is safe.
- Don't paginate under 25 rows.

## Swap recipe

Slop: colored dots for status, mono cells, headers that do nothing. Fixes AC-08 (colored status dot) and AC-09 (monospace for UI labels).

```tsx
// before
<td className="font-mono"><span className="mr-2 inline-block size-2 rounded-full bg-emerald-400" />Active</td>

// after
import { DataGrid } from './blocks/datagrid'
import type { ColumnDef } from '@tanstack/react-table'

type Row = { name: string; status: string; orders: number; amount: number }

const columns: ColumnDef<Row, any>[] = [
  { accessorKey: 'name', header: 'Customer' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'orders', header: 'Orders', meta: { align: 'right' } },
  {
    accessorKey: 'amount',
    header: 'Amount, USD',
    meta: { align: 'right' },
    cell: (c) => c.getValue<number>().toLocaleString('en-US', { minimumFractionDigits: 2 }),
  },
]

<DataGrid columns={columns} data={rows} pageSize={25} />
```

Keep status as text in `--text-muted`. If a dot is needed, make it neutral and let the word carry the state. Wire URL state with your router: read `?sort=amount.desc&page=3` into `initialState`, write it back in `onSortingChange`.

## Tokens

- `--bg-sunken`, `--bg-elev`: header row and hover row.
- `--border`, `--border-soft`: frame, header rule, row dividers.
- `--text`, `--text-muted`, `--text-subtle`: active sort, cells, headers.
- `--t-body`, `--t-xs`: cell and footer text.
- `--r-md`: pagination buttons; `--r-card`: table frame.
- `--ring`: focus on header buttons and row actions.
