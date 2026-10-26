---
id: search-and-filter-bar
name: Search and filter bar
category: form-input
uses: [filter-and-search, jump-anywhere]
surfaces: [app, dashboard, editorial]
replaces: []
components: [blocks/input, blocks/combobox]
inspiration: []
status: stable
---

## When to use

A list or a table with more rows than fit on a screen: prompts, orders, articles, files. One bar above the list holds search, sort, filters and the primary action. For a global "find anything or run anything" tool use a command palette instead; this bar filters the list under it.

## Anatomy

- One row, 36px high controls, 8px gaps: search input (flexible width, search icon inside, clear button when filled), sort select, one or two filter selects or chips, and the primary action at the far right.
- Search types ahead. With an index of fewer than a few thousand items, filter on the client with a static index (labels plus keywords). With more, debounce 200ms and query the server.
- Autocomplete: a popover under the input with up to 6 suggestions, the match part in `--text`, the rest in `--text-muted`. Arrow keys and Enter work; Escape closes.
- Filters: a select per facet (Status, Owner, Date). Chosen filters show as removable chips below the bar, with "Clear all".
- Result count in `--text-subtle`: "42 of 318". On zero results, one sentence and a "Clear filters" action.
- State lives in the URL: `?q=kimchi&status=open&sort=newest`.
- On phones the filters collapse behind one "Filters" button and the search stays on top.

## Do

- Put the cursor in search on `/` or `Cmd K` if no palette exists. Show the shortcut as text inside the input.
- Keep sort and filter controls in the same position on every list in the product.
- Highlight matches in results, subtly, with weight rather than yellow marks.
- Keep the previous results on screen while new ones load, with a thin progress line.
- Offer recent searches only if they are useful, and let people remove them.

## Don't

- Don't make search a bare icon that expands. The field is the affordance.
- Don't reset the list scroll position on every keystroke.
- Don't hide the primary action in a menu because the bar is crowded; remove a filter instead.
- Don't show 12 filter dropdowns in a row. Group them under "More filters".
- Don't search only on Enter if results are cheap.

## Swap recipe

No catalog rule covers this yet. The usual slop is a rounded glass search pill with a glow, floating above a list with no filters and no count.

```tsx
// before
<div className="mx-auto w-full max-w-xl rounded-full bg-white/10 px-6 py-4 shadow-[0_0_40px_rgba(99,102,241,0.5)] backdrop-blur">
  <input className="w-full bg-transparent" placeholder="Search anything..." />
</div>

// after
import { Input, Select } from './blocks/input'
import { Combobox } from './blocks/combobox'
import { Button } from './blocks/button'

<div className="flex flex-wrap items-center gap-2">
  <div className="relative min-w-[220px] flex-1">
    <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search prompts" aria-label="Search prompts" className="pl-9" />
    {/* 16px line search icon, absolutely placed at left-3 */}
  </div>
  <Select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort" className="w-40">
    <option value="newest">Newest</option>
    <option value="name">Name</option>
  </Select>
  <Combobox options={owners} value={owner} onValueChange={setOwner} placeholder="Owner" searchPlaceholder="Search people" />
  <Button className="ml-auto">New prompt</Button>
</div>
<p className="mt-2 text-xs text-text-subtle tabular-nums">{shown} of {total}</p>
```

## Tokens

- `--input`, `--ring`: field border and focus.
- `--popover`, `--sh-pop`: autocomplete and filter popovers.
- `--text`, `--text-muted`, `--text-subtle`: matched text, rest of suggestion, result count.
- `--bg-elev`, `--border`: filter chips.
- `--r-md`: all controls share one radius.
- `--sp-2`: gap between controls.
- `--dur-dropdown`, `--ease-out`: popover open.
