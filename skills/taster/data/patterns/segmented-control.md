---
id: segmented-control
name: Tabs and segmented control
category: tabs-segmented
uses: [switch-views, filter-and-search]
surfaces: [app, dashboard, landing]
replaces: [AC-04, AC-05, COL-06]
components: [blocks/tabs, blocks/toggle]
inspiration: [https://www.radix-ui.com/primitives/docs/components/tabs]
status: stable
---

## When to use

Switching between two to four views of the same content, or between sibling pages that share a header. Examples: Monthly or Yearly, List or Grid, Overview / Activity / Settings on a detail page, EN or KO on a language switch.

Use the contained segmented control for a view or mode switch inside a page. Use text tabs with a thin underline when the options are sibling pages. If there are more than five options or the labels are long, use a select or a sidebar.

## Anatomy

- Segmented variant: one container with a 1px border and `--bg-elev` fill, 4px inner padding, options laid out in a row with 4px gaps. The active option lifts to the page surface (`--bg`) with full ink. Inactive options stay transparent with muted ink.
- Underline variant: a row of text tabs on a 1px baseline, the active tab in full ink with a 2px bottom line in ink color, no fill.
- Height 32px per option (36px if touch is primary). Labels in sentence case, 14px, medium weight.
- Language switch: show codes ("EN", "KO"), not flags and not the full language name in two scripts.
- Registry: `Tabs` takes `tabs: { value, label }[]`, `value` and `onValueChange`, and renders `role="tablist"` with `aria-selected` on each button. `Toggle` exports `Checkbox` and `Switch` for binary choices.

## Do

- Separate the active option by lightness only: container `--bg-elev`, active `--bg`. It stays legible in grayscale.
- Support arrow keys to move between options and Home / End to jump, with roving `tabindex`.
- Keep every option the same width class so the control does not jump when the selection changes (use `min-width` or a grid with equal columns).
- Reflect the selection in the URL when it changes the page content.
- Use a real `Switch` for on or off settings, not a two-option segmented control.

## Don't

- Don't color the active pill (purple, blue, gradient). The hue says "brand", not "selected".
- Don't animate a glowing indicator behind the active option.
- Don't use a segmented control for navigation that changes the route and the page title. That is tabs or a sidebar.
- Don't put icons and labels and counts in each segment. One of the three.
- Don't use flags for languages. A flag is a country.

## Swap recipe

Slop version (fixes AC-04, AC-05, COL-06):

```css
.tabs button { border-radius: 999px; padding: 6px 16px; color: #8b5cf6; border: 1px solid #8b5cf6; }
.tabs button.active { background: linear-gradient(90deg, #6366f1, #a855f7); color: #fff; box-shadow: 0 0 20px #a855f7; }
```

Fixed version:

```tsx
import { Tabs } from './blocks/tabs'

const [view, setView] = React.useState('grid')

<Tabs
  tabs={[
    { value: 'grid', label: 'Grid' },
    { value: 'list', label: 'List' },
  ]}
  value={view}
  onValueChange={setView}
/>
```

The container is `rounded-md border border-border bg-bg-elev p-1`; the active button is `bg-bg text-text`, inactive is `text-text-muted hover:text-text`. For sibling pages use the underline variant:

```css
.tab { height: 40px; color: var(--text-muted); border-bottom: 2px solid transparent; }
.tab[aria-selected="true"] { color: var(--text); border-bottom-color: var(--text); }
```

## Tokens

- Container: `--bg-elev` fill, `--border` line. Active segment: `--bg`.
- Ink: `--text` active, `--text-muted` inactive. Underline variant line: `--text` (active), `--border` (baseline).
- Type: `--t-body` (14px), `--w-med`.
- Space: container padding `--sp-1`, gap `--sp-1`, option padding `--sp-3`, height 32px.
- Radius: `--r-md` container, `--r-sm` segment. Motion: color change at `--dur-press`.
