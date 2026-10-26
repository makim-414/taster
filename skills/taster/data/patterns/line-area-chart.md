---
id: line-area-chart
name: Line and area chart
category: chart-kpi
uses: [show-a-trend]
surfaces: [dashboard]
replaces: [AC-13, COL-01]
components: [blocks/line, blocks/trend, blocks/spark]
inspiration: []
status: stable
---

## When to use

Something changes over time and the reader wants shape, not exact values: traffic, revenue, latency. Use a full chart (`TrendChart`) for the main panel, a light inline chart (`AreaChart`) inside cards, and a sparkline beside a KPI. If there are fewer than 5 points, use a list or a bar chart.

## Anatomy

- One line, 2px stroke, round joins, in `--chart-2`. A second series is `--chart-4` and dashed only when it is a forecast or a previous period.
- Area fill is optional: the same color at 8 to 28% opacity, fading to zero. Never a rainbow gradient.
- Grid: horizontal lines only, `--border-soft`. Axis text in `--text-subtle` at 10 to 11px. Y axis hidden when values are on hover.
- Tooltip: a small popover (`--popover`, `--border`) with the date and the value in tabular numerals. A vertical cursor line in `--border`.
- Period selector above the chart (7d, 30d, 90d) as a segmented control.
- Sparkline: no axes, no labels, 120 by 32, a dot on the last point. Semantic color only if the direction matters.
- Direct label at the end of a line beats a legend when there are 2 or 3 series.

## Do

- Start the Y axis at zero for volumes and at a sensible floor for rates, and say so.
- Mark one event on the line (a launch, an outage) with a small tick and a caption.
- Keep the same time range across charts on one screen.
- Show missing data as a gap, not a line to zero.
- Respect `prefers-reduced-motion`: draw the line once, without animation.

## Don't

- Don't use `type="monotone"` smoothing on data that is spiky by nature; it invents peaks that never happened.
- Don't fill the area with a violet-to-blue gradient.
- Don't plot more than 3 series. Small multiples are clearer.
- Don't put a dot on every point of a long series.
- Don't hide the tooltip behind a tiny hit area; use the full column width.

## Swap recipe

Slop: neon gradient area with glow and a rainbow of series. Fixes AC-13 (rainbow chart colors) and COL-01 (purple gradient).

```tsx
// before
<Area dataKey="v" stroke="#a855f7" strokeWidth={3} fill="url(#neon)" style={{ filter: 'drop-shadow(0 0 8px #a855f7)' }} />
<linearGradient id="neon"><stop offset="0" stopColor="#6366f1" /><stop offset="1" stopColor="#ec4899" /></linearGradient>

// after
import { TrendChart } from './blocks/trend'
import { Sparkline } from './blocks/spark'
import { AreaChart } from './blocks/line'

<TrendChart
  height={220}
  data={[
    { label: 'Mon', value: 120 },
    { label: 'Tue', value: 148 },
    { label: 'Wed', value: 133 },
    { label: 'Thu', value: 171 },
  ]}
/>

<AreaChart data={[4, 6, 5, 9, 12, 11, 15]} height={96} />   {/* inside a card */}
<Sparkline data={[4, 6, 5, 9, 12, 11, 15]} dir="up" />      {/* next to a KPI */}
```

`TrendChart` uses a single `--chart-2` stroke with an opacity fade, `--border-soft` grid and a tooltip on `--popover`. Pass `area={false}` for a bare line.

## Tokens

- `--chart-2`, `--chart-4`: primary and secondary series.
- `--border-soft`, `--border`: grid and axis.
- `--text-subtle`, `--text`: tick labels and the active point.
- `--popover`, `--sh-pop`: tooltip surface.
- `--delta-up`, `--delta-down`: sparkline color when a direction is stated.
- `--t-micro`, `--t-xs`: axis and tooltip text sizes.
