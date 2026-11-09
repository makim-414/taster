---
id: pagination
name: Pagination
category: tabs-segmented
uses: [browse-records, switch-views]
surfaces: [app, dashboard, editorial]
replaces: [AC-04, RSP-01]
components: [blocks/pagination]
inspiration: []
status: draft
---

## When to use

A list or table split into pages because people need a stable place to come back to: "it was on page 3", a page number in the URL, a printable list. Search results, records in an admin table, an archive of articles.

For a feed people read from the top, use "Load more" or infinite loading instead. For fewer than two pages, show nothing.

## Anatomy

- Previous and Next in words, each with a small chevron, at the two ends.
- Page numbers between them: first, last, the current page and one page on each side, with "..." where pages are skipped, so the row has a fixed maximum length.
- The current page is marked with `aria-current="page"` and one surface step plus a hairline, not a colored pill.
- Below the sm breakpoint the numbers give way to "Page 4 of 12" between Previous and Next, so the row never wraps or scrolls sideways.
- A quiet line nearby says what is shown: "Showing rows 76 to 100 of 300".
- Registry `Pagination` takes `page`, `pageCount` and `onPageChange`; `paginationRange` returns the tokens for a custom layout.

## Do

- Put the page in the URL (`?page=4`) and scroll back to the top of the list when it changes.
- Keep Previous on the left and Next on the right on every page; disable them at the ends instead of hiding them, so nothing shifts.
- Give each page button a full name ("Page 4 of 12") and keep every target 44px on touch screens.
- Use tabular figures so the row does not jitter as the numbers change.

## Don't

- Don't fill the current page with the brand color in a pill and tint the others (AC-04).
- Don't render every page number for a long list, so the row runs off a phone screen (RSP-01).
- Don't use arrows only, without words or an accessible name.
- Don't reset the page when a filter changes without saying so; go back to page 1 and show the new count.

## Swap recipe

Slop version (fixes AC-04, RSP-01):

```tsx
<div className="flex gap-2">
  {Array.from({ length: 40 }, (_, i) => (
    <button className={i + 1 === page ? 'rounded-full bg-indigo-500 text-white px-3' : 'rounded-full bg-indigo-50 text-indigo-600 px-3'}>{i + 1}</button>
  ))}
</div>
```

Fixed version:

```tsx
import { Pagination } from './blocks/pagination'

<Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
<p className="text-label text-text-subtle">Showing rows {from} to {to} of {total}</p>
```

## Tokens

- Ink: `--text` for the current page, `--text-muted` for the others and for Previous and Next, `--text-subtle` for the gap.
- Current page: `--bg-elev` fill and a `--border` hairline.
- Size: `--control-touch` (44px) on touch screens, `--control-md` on a desk.
- Type: `--t-body`, tabular figures. Motion: color at `--dur-press`.
