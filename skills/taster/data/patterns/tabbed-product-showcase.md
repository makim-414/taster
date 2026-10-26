---
id: tabbed-product-showcase
name: Tabbed product showcase
category: feature-section
uses: [explain-features, switch-views]
surfaces: [landing]
replaces: [LAY-02, LAY-03]
components: [blocks/tabs]
inspiration: []
status: stable
---

## When to use

Use it when the product has three to five distinct capabilities and each one is visible: a chart, a screen, a document, a short recording. One large frame swaps content as the visitor picks a tab, a list item or a claim. It shows each capability instead of describing it, and it uses one frame's worth of space instead of five.

Do not use it when the capabilities have no visual, or when the page is read on a phone and the frame would be too small to read. In that case use a stacked list with one image per item.

## Anatomy

Two parts: a control and a stage.

- Control: either a segmented `Tabs` row above the stage, or a vertical list of selectable claims on the left of the stage. Each item is a short noun phrase or a one-line claim (2 to 8 words). The active item is told apart by lightness (the registry `Tabs` does this), not by a colored pill.
- Stage: one large frame, 16:10 or 4:3, holding a real screenshot or chart. Fixed size, so the page does not jump when content changes.
- Caption under the stage: one sentence about the active item, updated with it.

Behavior: arrow keys move between tabs, the stage has `role="tabpanel"` and `aria-labelledby`, content crossfades in `--dur-dropdown` or swaps instantly under reduced motion. No auto-rotate. If you want to hint at order, show the tab row only and let the first tab load selected.

## Do

- Order tabs by how often visitors need them, not by how the code is organized.
- Give every tab a real capture of the real product at the same scale and crop.
- Preload the next image so the swap never shows an empty frame.
- Update the URL hash (`#reports`) so a tab can be linked to.
- Keep labels as nouns people already use ("Reports", "Alerts", "Exports"), not brand-invented words.
- Keep the control visible at the top of the stage on mobile and scroll it horizontally if needed.

## Don't

- Do not number the tabs 01, 02, 03 (LAY-03). Numbers belong to real steps only.
- Do not build the control as three identical icon cards (LAY-02) with a heading and two lines each.
- Do not auto-advance every four seconds. Visitors cannot read while the content moves.
- Do not make the stage a drawn skeleton. See `real-product-frame`.
- Do not use a different frame size per tab.

## Swap recipe

Slop version: numbered icon cards plus a decorative preview that does not change.

```tsx
// before: LAY-02, LAY-03
<div className="grid grid-cols-3 gap-6">
  {features.map((f, i) => (
    <div className="rounded-2xl bg-white/5 p-6">
      <span className="text-sm text-violet-400">0{i + 1}</span>
      <Icon name={f.icon} /><h3>{f.title}</h3><p>{f.text}</p>
    </div>
  ))}
</div>
```

Fixed version: one control, one stage, real captures.

```tsx
import { Tabs } from './blocks/tabs'

const items = [
  { value: 'reports', label: 'Reports', src: '/shots/reports.png', caption: 'Weekly report per domain, with the cited pages ranked.' },
  { value: 'alerts', label: 'Alerts', src: '/shots/alerts.png', caption: 'A message when a cited page drops out of answers.' },
  { value: 'exports', label: 'Exports', src: '/shots/exports.png', caption: 'CSV and API access for your own dashboards.' },
]

export function Showcase() {
  const [tab, setTab] = React.useState(items[0].value)
  const cur = items.find((i) => i.value === tab)!
  return (
    <section className="mx-auto max-w-[1100px] px-6 py-16">
      <Tabs tabs={items.map(({ value, label }) => ({ value, label }))} value={tab} onValueChange={setTab} />
      <div role="tabpanel" className="mt-6 aspect-[16/10] overflow-hidden rounded-lg border border-border bg-bg-elev">
        <img key={cur.src} src={cur.src} alt={cur.caption} className="h-full w-full object-cover object-top" />
      </div>
      <p className="mt-4 max-w-[60ch] text-body text-text-muted">{cur.caption}</p>
    </section>
  )
}
```

For the left-list variant, keep the same stage and replace `Tabs` with a `ul` of buttons; the active one gets `text-text` and the others `text-text-muted`.

## Tokens

- Control: registry `Tabs` uses `--bg-elev` for the rail and `--bg` for the active tab, `--border` outline, radius `--r-md` outer and `--r-sm` inner.
- Stage: `--bg-elev` surface, `--border`, radius `--r-card`, fixed `aspect-ratio`.
- Type: tab labels `--t-body` at `--w-med`; caption `--t-body` in `--text-muted`.
- Space: `--sp-6` between control and stage, `--sp-4` before the caption.
- Motion: crossfade `--dur-dropdown` (200ms) with `--ease-out`; no translate on the image.
