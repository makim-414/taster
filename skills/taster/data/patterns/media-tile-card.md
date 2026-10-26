---
id: media-tile-card
name: Media tile card
category: card
uses: [browse-media, explain-features]
surfaces: [landing, commerce, app, editorial]
replaces: [AC-17, LAY-02]
components: [blocks/card, blocks/badge]
inspiration: []
status: stable
---

## When to use

Use it when the thing being shown is an image: a product, a template, an article, a result, a hub entry. The image is the tile and the caption is a thin line of text. This replaces the three icon cards of the same size, each with a heading and two lines of filler, and it replaces a CSS-drawn fake screenshot where a real capture belongs.

Hub cards (links to sections of a site) and article cards follow the same shape. If you have no image, the answer is a list row, not a tile with an empty gray rectangle.

## Anatomy

- Frame: a fixed aspect ratio (4:3, 3:2 or 1:1 per grid), `overflow: hidden`, radius `--r-xl` or `--r-card`.
- Media: a real photo or a real screen capture, `object-fit: cover`, with explicit width and height or `aspect-ratio` to avoid layout shift.
- Caption: below the frame, title in `text-body` weight 500, one muted line beneath. Or, on a bottom scrim, white text over a gradient that fades from `--scrim` to transparent.
- Meta: an optional neutral Badge or a plain count in `--text-subtle`.
- Grid: 2 columns on phones, 3 to 4 on desktop, gap `--sp-4`. Tiles are equal in size unless one is a deliberate feature tile.

## Do

- Use a real capture of the product or a real photograph. If one does not exist yet, ship the page without the tile.
- Keep the caption to a title and one line. The tile does the persuading.
- Make the full tile one link, with the title as the accessible name.
- Give images `alt` text that says what is in them, and a muted background color while loading.
- Vary the layout by content: one large feature tile plus a grid is fine when one item really matters more.

## Don't

- Do not build a fake dashboard out of nested divs and call it an image (AC-17).
- Do not repeat three identical cards of icon, heading and two lines (LAY-02). A list, a table or a screenshot says it faster.
- Do not put a colored gradient in place of a missing photo.
- Do not stack a title, a tag, a description, a chip row and a button under every image.
- Do not crop faces or product edges with a fixed square when the source is portrait.

## Swap recipe

Slop: three equal feature cards with a tinted icon box.

```jsx
{/* before: LAY-02, AC-17 */}
<div className="grid grid-cols-3 gap-6">
  {features.map(f => (
    <div className="rounded-2xl border p-6 shadow-lg">
      <div className="size-12 rounded-xl bg-indigo-100">{f.icon}</div>
      <h3>{f.title}</h3><p>{f.body}</p>
    </div>
  ))}
</div>
```

Fixed: the real capture is the tile, text is one thin line.

```tsx
import { Card } from './blocks/card'

{/* after */}
<ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
  {items.map((it) => (
    <li key={it.href}>
      <a href={it.href} className="group block">
        <div className="aspect-[4/3] overflow-hidden rounded-xl border border-border bg-bg-sunken">
          <img src={it.src} alt={it.alt} width={640} height={480} className="h-full w-full object-cover" />
        </div>
        <div className="mt-3 text-body font-medium text-text">{it.title}</div>
        <div className="text-label text-text-muted">{it.line}</div>
      </a>
    </li>
  ))}
</ul>
```

## Tokens

`--r-xl`, `--r-card`, `--border`, `--bg-sunken` (image placeholder), `--scrim` (caption scrim), `--sp-3`, `--sp-4`, `--text`, `--text-muted`, `--text-subtle`, `--t-body`, `--t-sm`. Tailwind: `rounded-xl`, `text-body`, `text-label`, `gap-4`.
