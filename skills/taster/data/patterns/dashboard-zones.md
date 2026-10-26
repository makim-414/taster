---
id: dashboard-zones
name: Dashboard zones
category: layout-shell
uses: [organize-the-page, show-one-number]
surfaces: [dashboard]
replaces: [AC-14, COL-06, LAY-05]
components: [blocks/card, blocks/kpi]
inspiration: []
status: stable
---

## When to use

Use it for the home view of any analytics or monitoring screen. A dashboard answers three questions in order: how are we doing (a few numbers), what changed (trend charts), and where to look (a table or list). Lay it out in zones that follow that order, with one tone and one panel header style across them.

It replaces the bento grid of mixed-size rounded boxes in a different color each, where nothing tells the reader where to start.

## Anatomy

- Zone 1, KPI row: three to five `Stat` tiles in one row, each with a label, a value in tabular figures, and a delta. One tile is the primary number and may be wider.
- Zone 2, chart panels: one to three panels beneath, each with the same header (title left, range or filter right), a chart in a single hue ramp, and a caption.
- Zone 3, detail: a table or list of the records behind the charts, in a single surface.
- Grid: 12 columns on desktop, stacked on phones. Tiles in a row share one height. Gap `--sp-4`.
- Tone: every panel uses `--bg-elev` and `--border`. Color appears only in deltas and in the highlighted series.
- Page header: title, date range selector and export action in the top bar.

## Do

- Put the one number that decides the day in the first tile and make it the largest.
- Give every panel the same header anatomy so the page scans like a table.
- Color charts with lightness steps of one hue (`--chart-1` to `--chart-6`) and use the accent for the single series that matters.
- Keep panel heights aligned in each row. Different heights read as accidents.
- Show an honest empty value (a middle dot) rather than a zero when data is missing.

## Don't

- Do not build a bento of 2x1, 1x2 and 2x2 boxes in unequal sizes (LAY-05).
- Do not give each widget its own tint, icon color or border color (COL-06).
- Do not repeat flat gray bordered boxes in dozens of sizes without hierarchy (AC-14). Merge related stats into one panel.
- Do not mix chart styles and palettes between panels.
- Do not put more than five KPI tiles in the first row.

## Swap recipe

Slop: a colorful bento of boxes.

```jsx
{/* before: LAY-05, COL-06, AC-14 */}
<div className="grid grid-cols-4 gap-4">
  <div className="col-span-2 row-span-2 rounded-3xl bg-violet-100 p-6">...</div>
  <div className="rounded-3xl bg-emerald-100 p-6">...</div>
  <div className="rounded-3xl bg-amber-100 p-6">...</div>
  <div className="col-span-2 rounded-3xl bg-sky-100 p-6">...</div>
</div>
```

Fixed: KPI row, then aligned panels, one tone.

```tsx
import { Stat } from './blocks/kpi'
import { Card, CardHeader, CardTitle, CardContent } from './blocks/card'

{/* after */}
<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
  <Stat label="Revenue" value="$48,210" delta={{ value: '+4.2%', dir: 'up' }} sub="vs last week" />
  <Stat label="Orders" value="1,204" delta={{ value: '-1.1%', dir: 'down' }} />
  <Stat label="Conversion" value="3.4%" />
  <Stat label="Refunds" value="18" />
</div>
<div className="mt-6 grid gap-4 lg:grid-cols-2">
  <Card><CardHeader><CardTitle>Revenue by day</CardTitle></CardHeader><CardContent>{/* line chart */}</CardContent></Card>
  <Card><CardHeader><CardTitle>Orders by channel</CardTitle></CardHeader><CardContent>{/* bar chart */}</CardContent></Card>
</div>
```

## Tokens

`--bg-elev`, `--border`, `--sp-4` (grid gap), `--sp-6` (zone gap), `--t-h2` (KPI value), `--t-sm` (labels), `--text-muted`, `--delta-up`, `--delta-down`, `--chart-1` to `--chart-6`, `--r-card`. Tailwind: `grid-cols-2 lg:grid-cols-4`, `gap-4`, `text-h2 tabular-nums`.
