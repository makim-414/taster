---
id: quiet-empty-state
name: Quiet empty state
category: empty-state
uses: [handle-no-data]
surfaces: [app, dashboard]
replaces: [AC-07, AC-11]
components: [blocks/skeleton]
inspiration: []
status: stable
---

## When to use

A list, table, chart or page that has no content yet or no results for the current filter. The empty state has one job: tell the person why it is empty and give them the next step. It should be quieter than the content that will replace it.

Use the structural variant (keep axes, headers and labels, dash the values) for data views such as charts, tables and KPI cards. Use the one-line variant for lists and inboxes.

## Anatomy

- One line of text that explains why: "No invoices yet." or "No results for 'linen'." Muted ink, 14px, centered in the area or left aligned under the header.
- One action: a button or link that creates the first item or clears the filter. Primary only if creation is the main path of the page.
- Optional second line with a link to the docs, in subtle ink.
- Data views: the frame stays. Axes, column headers, card labels and legends render as normal and each value cell shows a dash with an accessible label ("No value"). Rows are placeholders, so layout does not jump when data arrives.
- No illustration, no big colored icon circle, no confetti. If you must have an icon, a 20px line icon in subtle ink inline with the text.
- Registry `Skeleton` can render the placeholder rows while the first load resolves; the empty state replaces it only after the request finishes with zero results.

## Do

- Distinguish three cases with different copy: never had data, filtered to nothing, failed to load (that last one is the error state).
- Keep the empty area the same height as the content would be, so the page does not collapse.
- Write what the person can do in the verb the button uses: "Create invoice", not "Get started".
- Give the dash cell `aria-label="No value"` or `<span class="sr-only">No value</span>`.
- Test it with a screen reader. An empty list should announce "No invoices", not stay silent.

## Don't

- Don't center a 160px illustration of a person looking at an empty box.
- Don't put the icon in a 48px gray disc or a tinted circle (AC-11).
- Don't write "Oops! Nothing here yet" or "It's quiet... too quiet".
- Don't hide the table header when there are no rows. The header tells people what will appear.
- Don't show a primary button and a secondary button and a link all at once.

## Swap recipe

Slop version (fixes AC-07, AC-11):

```tsx
<div className="flex flex-col items-center gap-4 py-24 text-center">
  <div className="grid size-20 place-items-center rounded-full bg-indigo-500/15">
    <InboxIcon className="size-10 text-indigo-400" />
  </div>
  <h3 className="text-xl font-semibold">Oops! Nothing here yet</h3>
  <p className="max-w-sm text-gray-400">Looks like you have not created anything. Let's change that!</p>
  <button className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 rounded-full">Get started</button>
</div>
```

Fixed version:

```tsx
import { Button } from './blocks/button'
import { Skeleton } from './blocks/skeleton'

// list
<div className="py-16 text-center">
  <p className="text-sm text-text-muted">No invoices yet.</p>
  <Button size="sm" variant="outline" className="mt-3">Create invoice</Button>
</div>

// data view: keep the structure, dash the values
<table className="w-full text-sm">
  <thead className="text-left text-text-subtle"><tr><th>Month</th><th>Revenue</th><th>Orders</th></tr></thead>
  <tbody>
    {months.map((m) => (
      <tr key={m} className="border-t border-border-soft">
        <td className="py-2">{m}</td>
        <td className="text-text-subtle"><span aria-hidden>-</span><span className="sr-only">No value</span></td>
        <td className="text-text-subtle"><span aria-hidden>-</span><span className="sr-only">No value</span></td>
      </tr>
    ))}
  </tbody>
</table>
```

## Tokens

- Ink: `--text-muted` for the sentence, `--text-subtle` for dashes and the optional docs link.
- Surface: none. The empty area uses the page `--bg`; table rules use `--border-soft`.
- Type: `--t-body` (14px), no heading larger than `--t-title` (16px).
- Space: `--sp-16` vertical padding for list areas, `--sp-3` between sentence and button.
- Radius: `--r-md` on the button. No shadow, no gradient, no filled circle.
