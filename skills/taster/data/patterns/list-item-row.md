---
id: list-item-row
name: List item row
category: card
uses: [browse-records]
surfaces: [app, dashboard]
replaces: [CMP-02]
components: [blocks/card, blocks/session-list]
inspiration: []
status: stable
---

## When to use

Use it for a collection of similar objects that the reader scans and acts on: documents, members, integrations, saved searches, clinics, topics. Each object is one line with an icon or thumbnail, a title, a short description and one trailing action. This replaces a stack of boxed cards where every card has its own border, padding and shadow.

Use the option-card variant only when the reader must pick one or several of a few choices. There the stronger border and a check mark carry the "selected" meaning.

## Anatomy

- Row: flex, `align-items: center`, `gap: var(--sp-3)`, min height 56px, padding `--sp-3` by `--sp-4`.
- Lead: a 32 to 40px thumbnail (radius `--r-md`) or a bare line icon. No colored tile behind an icon.
- Body: title in `text-body` weight 500, truncated to one line; description in `text-label` `--text-muted`, one line.
- Trail: one action (button, switch, chevron) and optional meta in tabular numerals, right aligned.
- Separation: 1px `--border-soft` between rows inside a single list surface.
- Option variant: 1px `--border` at rest, `--text` border and a check icon when selected. The selected state never relies on hue alone.

## Do

- Put the whole list in one surface and divide rows with a hairline. See single-surface-section.
- Make the row hover state a surface step (`--bg-sunken`), not a lift.
- Keep trailing actions in the same column across rows so the eye can run down them.
- Truncate with an ellipsis and provide the full text in `title` or a tooltip.
- Give the row a minimum 44px touch height on phones.

## Don't

- Do not render each record as its own bordered, shadowed, rounded card inside a grid when the content is one line of text (CMP-02).
- Do not put a gradient or tinted square behind the leading icon.
- Do not stack three buttons on the right of every row. One primary action, the rest in a menu.
- Do not center-align the text of a row.
- Do not mark the selected option with only a pale blue border.

## Swap recipe

Slop: every item is its own card.

```jsx
{/* before: CMP-02 */}
{items.map(i => (
  <div className="mb-3 rounded-2xl border p-4 shadow-md">
    <div className="rounded-xl bg-blue-50 p-2">{i.icon}</div>
    <h4>{i.title}</h4><p>{i.text}</p>
    <button>Open</button><button>Share</button><button>Delete</button>
  </div>
))}
```

Fixed: one surface, one row per item, one trailing action.

```tsx
import { Card } from './blocks/card'

{/* after */}
<Card className="divide-y divide-border-soft overflow-hidden">
  {items.map((i) => (
    <div key={i.id} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-bg-sunken">
      <img src={i.thumb} alt="" width={40} height={40} className="size-10 rounded-md object-cover" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-body font-medium text-text">{i.title}</div>
        <div className="truncate text-label text-text-muted">{i.text}</div>
      </div>
      <span className="text-label tabular-nums text-text-subtle">{i.count}</span>
      <button className="text-label text-text-muted hover:text-text">Open</button>
    </div>
  ))}
</Card>
```

## Tokens

`--bg-elev`, `--bg-sunken` (hover), `--border`, `--border-soft` (row divider), `--r-md`, `--sp-3`, `--sp-4`, `--t-body`, `--t-sm`, `--text`, `--text-muted`, `--text-subtle`. Tailwind: `divide-border-soft`, `min-h-14`, `gap-3`, `tabular-nums`.
