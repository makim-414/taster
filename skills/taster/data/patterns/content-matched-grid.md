---
id: content-matched-grid
name: Content-matched grid
category: feature-section
uses: [explain-features]
surfaces: [landing, commerce]
replaces: [LAY-02, LAY-05, LAY-06]
components: [blocks/card, blocks/separator]
inspiration: []
status: stable
---

## When to use

Use it whenever you reach for a feature grid. The layout is chosen by what the content is: five facts become a list, two kinds of thing become a two-column table, six products become a simple grid sized to six, and anything with photographs lets the photographs do the work. It is the default for any set of two to eight items that are not outcomes with numbers (for those, `outcome-led-cards`).

It does not give you a trendy layout. It gives you the plainest one that reads correctly, and tidy spacing that groups related things.

## Anatomy

Pick one of four shapes.

1. List: a vertical list with a title on the left and a sentence on the right, separated by hairlines. Best for 3 to 8 features that are all text.
2. Two-column table: term and description, or "Included" and "Not included". Best for specs and facts.
3. Plain grid: N items in `repeat(auto-fit, minmax(240px, 1fr))`, no more than three columns on desktop, each item a title and a sentence with no frame, or a hairline top border.
4. Photo grid: one photograph per item at one aspect ratio (4:5 or 1:1) with a caption beneath it.

Spacing rule: gap inside a group is `--sp-2` to `--sp-3`, between items `--sp-6`, between groups `--sp-12`. Different distances tell the reader what belongs together.

## Do

- Count the items and size the grid to the count: 2 items, two columns; 4 items, 2 by 2 or four in a row; 5 items, a list.
- Let one item be wider or taller only when it is more important, and say so in its content.
- Use hairlines (`Separator`) between list rows instead of boxing every row.
- Use real photographs at one crop. Put the text under or beside the image, not over it.
- Write each item as a title plus a sentence that names something concrete.
- Use the same type sizes for every item. Hierarchy comes from position and spacing.

## Don't

- Do not make three equal cards with an icon, a heading and two lines of text (LAY-02).
- Do not pack rounded boxes of different sizes into a bento puzzle to make the page look busy (LAY-05).
- Do not use the same 24px gap between everything: between sections, cards and lines (LAY-06). Uniform spacing hides structure.
- Do not frame every item in a bordered, shadowed card. Frames are for things that are interactive or that float.
- Do not center text in a grid cell.

## Swap recipe

Slop version: bento grid with a single repeated gap and large equal radii.

```css
/* before: LAY-05, LAY-06, LAY-02 */
.bento { display: grid; grid-template-columns: repeat(4, 1fr); grid-auto-rows: 180px; gap: 24px; }
.bento > * { border-radius: 24px; background: rgba(255,255,255,.04); padding: 24px; }
.bento .a { grid-column: span 2; grid-row: span 2; }
.bento .b { grid-column: span 2; }
section + section { margin-top: 24px; }
```

Fixed version: a list for five text features, spacing that groups them.

```tsx
import { Separator } from './blocks/separator'

const features = [
  ['Weekly report', 'Every Monday, a ranked list of cited pages for each domain.'],
  ['Competitor view', 'The same report for up to three competitors, side by side.'],
  ['Fix list', 'Pages that are ignored, each with the missing fact or source.'],
  ['Alerts', 'A message when a cited page falls out of answers.'],
  ['CSV and API', 'Pull the data into your own dashboards.'],
]

export function FeatureList() {
  return (
    <ul className="m-0 list-none p-0">
      {features.map(([title, text], i) => (
        <li key={title}>
          {i > 0 && <Separator />}
          <div className="grid gap-2 py-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-12">
            <h3 className="text-title font-semibold text-text">{title}</h3>
            <p className="text-body text-text-muted">{text}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
```

Photo variant: `grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-8`, each `figure` with `aspect-[4/5] object-cover rounded-lg` and a `figcaption` at `--t-body`.

## Tokens

- Spacing scale in use: `--sp-2` and `--sp-3` inside an item, `--sp-6` between items, `--sp-12` between groups, `--sp-16` around the section. At least three different values on the page.
- Lines: `Separator` uses `--border`. Photo frames use `--r-card`, list rows have no radius.
- Type: item title `--t-title` at `--w-semi`; description `--t-body` in `--text-muted`.
- Surface: `--bg` only. Use `--bg-elev` for the one item you want to stand out.
- Motion: none.
