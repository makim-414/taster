---
id: select-and-combobox
name: Select and combobox
category: form-input
uses: [enter-data, filter-and-search]
surfaces: [app]
replaces: []
components: [blocks/combobox, blocks/datepicker, blocks/calendar, blocks/select-menu]
inspiration: [https://ui.shadcn.com/docs/components/combobox, https://ui.shadcn.com/docs/components/date-picker, https://cmdk.paco.me]
status: stable
---

## When to use

Choose one or several items from a list. Use a native select for fewer than 7 options. Use the searchable combobox when the list is long, has descriptions, or the person knows the name and wants to type it: countries, languages, customers, tags. Use the date picker for dates (see month-calendar).

## Anatomy

- Trigger: the same chrome as a text field (36px, 1px border, `--r-md`), the chosen label on the left, a line chevron pair on the right. Placeholder in `--text-subtle`.
- Popover: `--popover` surface, 1px `--border`, `--sh-pop`, same width as the trigger or wider for descriptions. Opens in 200ms with `--ease-out`.
- Search input at the top of the popover, no extra border box, a hairline under it.
- List: 36px options, label in `--text`, optional second line in `--text-subtle`, a line check on the selected one. Group headers are small `--text-subtle` text, sentence case.
- Highlighted option: `--bg-elev`. Arrow keys move it, Enter selects, Escape closes, typing filters.
- Empty result: one line, "No results", with the query echoed.
- Multi select: options toggle without closing; a "Done" button applies the change (apply on confirm), and the trigger shows "3 selected" or chips.

## Do

- Filter as the person types, on label and on keywords. Match case-insensitively, ignore diacritics.
- Keep the selected option visible when the list opens by scrolling it into view.
- Show the current value in the trigger even if it is not in the loaded list.
- Close on selection for single select; stay open for multi select.
- Support clearing with a visible control when the field is optional.

## Don't

- Don't build a custom dropdown for 4 options. A native select works with every keyboard and phone.
- Don't open a full-screen modal for choosing a country on desktop.
- Don't tint the selected row with a bright accent; a lightness step and a check is enough.
- Don't hide the search field behind a click inside the popover.
- Don't submit a multi select on every click; each submit is a network call and a flicker.

## Swap recipe

No catalog rule covers this yet. The common slop is a native select reskinned with a gradient border, or a hand-built list with no keyboard support.

```tsx
// before
<div className="relative rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 p-px">
  <select className="w-full rounded-xl bg-zinc-900 px-4 py-3">{options}</select>
</div>

// after: long list with search
import { Combobox } from './blocks/combobox'

const COUNTRIES = [
  { value: 'kr', label: 'South Korea' },
  { value: 'mx', label: 'Mexico' },
  { value: 'us', label: 'United States' },
]

<Combobox
  options={COUNTRIES}
  value={country}
  onValueChange={setCountry}
  placeholder="Select a country"
  searchPlaceholder="Search countries"
  emptyText="No country found"
/>

// after: date
import { DatePicker } from './blocks/datepicker'
<DatePicker value={date} onValueChange={setDate} placeholder="Pick a date" />
```

For fewer than 7 options, use `Select` from `blocks/input`, which shares the same field chrome.

## Tokens

- `--input`, `--border`: trigger and popover edge.
- `--popover`, `--sh-pop`: popover surface and shadow.
- `--bg-elev`: highlighted option.
- `--text`, `--text-muted`, `--text-subtle`: selected, options, placeholder and descriptions.
- `--r-md`, `--r-card`: trigger and popover corners.
- `--dur-dropdown`, `--ease-out`: open animation.
- `--ring`: keyboard focus.
