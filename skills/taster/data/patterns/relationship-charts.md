---
id: relationship-charts
name: Relationship charts
category: chart-kpi
uses: [show-relationships, show-composition]
surfaces: [dashboard]
replaces: [AC-13, COL-06]
components: []
inspiration: []
status: draft
---

## When to use

Questions about how things relate, not how big they are: which cells in a grid are hot (heatmap), how two measures move together (scatter), how several scores compare on one entity (radar), how a total splits into nested parts (treemap, sunburst), how volume flows between steps (Sankey). Reach for these only after a bar or a line has failed to answer the question.

## Anatomy

- Heatmap: a grid of equal cells, one hue, lightness from `--chart-6` (low) to `--chart-1` (high). The value is printed inside each cell when the cell is 32px or wider. Row and column labels in `--text-muted`.
- Scatter: dots 6 to 8px in `--chart-3`, the subject in `--accent`. Axes labeled with the measure and unit. A log scale is stated on the axis.
- Radar: 3 to 6 axes, one polygon with 15% fill and a 1.5px stroke. Unconfirmed axes are drawn dashed.
- Treemap, sunburst, Sankey: one hue ramp by depth, the own slice highlighted, gaps of 2px between shapes in the surface color.
- Empty regions (no data, no entries) are dashed outlines, never filled with a color.
- Legend: a continuous ramp bar with min and max values, not a list of colors.
- Tooltip: the row, the column, the value, the sample size.

## Do

- Order rows and columns by a meaningful sort (by total, by cluster) so patterns show.
- State the scale: linear or log, what the ramp's ends mean, what zero means.
- Label what is missing. A blank cell with no explanation reads as zero.
- Highlight the one cell, dot or slice the reader should find. Everything else stays quiet.
- Offer the same data as a table; these charts are hard to read with assistive tech.

## Don't

- Don't use a diverging red to green ramp unless the midpoint is a real, labeled value like zero change.
- Don't color scatter dots by category with 6 hues. Use shape or a single highlight.
- Don't use radar for more than 6 axes or for comparing many entities.
- Don't pick a pie, a sunburst or a Sankey when a sorted bar answers the question.
- Don't smooth or blur a heatmap into a gradient surface; cells are discrete.

## Swap recipe

Slop: a rainbow heatmap with a jet-style scale and soft tinted tiles around it. Fixes AC-13 (rainbow chart colors) and COL-06 (tinted box rainbow).

```css
/* before */
.cell[data-level="1"] { background: #3b82f6; }
.cell[data-level="2"] { background: #22c55e; }
.cell[data-level="3"] { background: #eab308; }
.cell[data-level="4"] { background: #ef4444; }
```

```tsx
// after: one-hue ramp from the chart tokens, empty cells dashed
const RAMP = ['var(--chart-6)', 'var(--chart-5)', 'var(--chart-4)', 'var(--chart-3)', 'var(--chart-2)']

function level(v: number | null, max: number) {
  if (v == null) return null
  return Math.min(RAMP.length - 1, Math.floor((v / max) * RAMP.length))
}

<div role="grid" className="grid" style={{ gridTemplateColumns: `120px repeat(${cols.length}, 40px)` }}>
  {cells.map((c) => {
    const l = level(c.value, max)
    return (
      <div key={c.key} role="gridcell" title={`${c.row}, ${c.col}: ${c.value ?? 'no data'}`}
        className="h-10 text-center text-xs tabular-nums leading-10"
        style={l == null
          ? { border: '1px dashed var(--border)' }
          : { background: RAMP[l], color: l >= 3 ? 'var(--accent-fg)' : 'var(--text)' }}>
        {c.value ?? ''}
      </div>
    )
  })}
</div>
```

For the scatter, set every dot to `var(--chart-3)` and the subject to `var(--accent)` with `r="5"` versus `r="3"`.

## Tokens

- `--chart-1` to `--chart-6`: the single ramp for cells, slices and flows.
- `--accent`: the one highlighted item.
- `--border`: dashed outline for empty regions.
- `--text`, `--accent-fg`: value text on light and dark cells.
- `--text-muted`, `--t-xs`: axis and row labels.
- `--popover`, `--sh-pop`: tooltip.
