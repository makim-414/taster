---
id: kpi-stat-tile
name: KPI stat tile
category: chart-kpi
uses: [show-one-number, explain-on-demand]
surfaces: [dashboard]
replaces: [AC-11, CMP-06, COL-01, CPY-02]
components: [blocks/kpi, blocks/trend]
inspiration: []
status: stable
---

## When to use

The top of a dashboard, a report header, a detail page: any place one number answers one question. Use one tile per question, 3 to 6 tiles in a row. If you cannot say what a tile is compared with, it is not a KPI yet; it is a number.

## Anatomy

- Label: small, sentence case, `--text-subtle`. Says what is counted and over what period: "Qualified leads, last 30 days".
- Value: 24 to 30px, semibold, tabular numerals, `--text`. Missing data renders a middle dot, never a fake zero, and never the raw `undefined` or `NaN` (rule CPY-02).
- Delta: caret icon, sign and value, colored by direction with `--delta-up` or `--delta-down`. Delta is the only colored element on the tile. For a metric where up is not simply good (share, rank, cost, churn), keep the caret and the sign and drop the color (`neutral` on the Stat block): color would otherwise tell the reader what to feel.
- Caption: what the delta is against, in words ("vs previous 30 days", "last day vs the day before"), in `--text-muted`. A delta without a stated basis is not readable.
- Optional sparkline on the right, 120 by 32, neutral stroke.
- Optional "How is this calculated" affordance: the whole tile or a small link opens the definition and source.
- Surface: `--bg-elev`, one 1px `--border`, radius `--r-card`. No icon box.

## Do

- Put the unit with the value: "1,284", "3.2%", "$48k". Never leave a bare number.
- State direction as well as color: the caret and the sign carry meaning when color does not.
- Write a change between two percentages in percentage points: 18.4% to 19.6% is "+1.2%p", not "+1.2%" and not "+6.5%".
- If a comparison has no basis yet (no benchmark chosen, a period before anything was classified), leave the delta out and say why ("Not measured yet: tracking starts 3 June"). Never fill the gap with a top N or a 0%.
- Korean finance readers expect up in red and down in blue. Swap `--delta-up` and `--delta-down` in the theme; the block does not change.
- Align tiles on a 4 or 6 column grid and keep the same height; let the caption wrap, not the value.
- Link each tile to the view that explains it.
- Show loading as a skeleton of the same height, so the row does not jump.

## Don't

- Don't put a gradient icon square or a colored circle with an icon in front of the label.
- Don't use a pale green pill for "+12%". Plain colored text with a caret is quieter and clearer.
- Don't give each tile its own accent hue. Color means up or down, not category.
- Don't show three giant marketing numbers ("10K+", "99.9%", "3x") as a dashboard row. Real figures need a period and a comparison.
- Don't animate counting up on every page load.

## Swap recipe

Slop: gradient tile with an icon disc and a green pill. Fixes COL-01 (purple gradient), AC-11 (filled circle glyph) and CMP-06 (triple number strip).

```tsx
// before
<div className="rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/10 p-5">
  <span className="grid size-10 place-items-center rounded-full bg-indigo-500/30">
    <UsersIcon />
  </span>
  <div className="text-4xl font-extrabold">10K+</div>
  <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-green-300">+12%</span>
</div>

// after
import { Stat } from './blocks/kpi'
import { Sparkline } from './blocks/spark'

<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
  <Stat
    label="Qualified leads, last 30 days"
    value="1,284"
    delta={{ value: '12.4%', dir: 'up' }}
    sub="vs previous 30 days"
  />
  {/* up is not simply good here, so the delta keeps its caret and loses its color */}
  <Stat
    label="Share of answers, last 7 days"
    value="19.6%"
    delta={{ value: '1.2%p', dir: 'up', neutral: true }}
    sub="vs the 7 days before"
  />
</div>
// with a trend beside the value
<Sparkline data={[8, 9, 7, 11, 12, 14, 13, 16]} dir="up" />
```

If a tile has no comparison yet, leave `delta` out. A tile without a delta is honest; a delta of 0% on no baseline is not.

## Tokens

- `--bg-elev`, `--border`, `--r-card`: tile surface.
- `--text-subtle`, `--text`, `--text-muted`: label, value, caption.
- `--delta-up`, `--delta-down`: the only color on the tile, by direction. `--delta-flat` (muted) for no change and for the neutral tone.
- `--t-h2`, `--w-semi`: value size and weight; `--t-sm` for the label.
- `--sp-5`, `--sp-2`: padding and spacing between label, value and delta.
- `--chart-2`: sparkline stroke when it is neutral.
