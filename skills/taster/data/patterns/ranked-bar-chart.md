---
id: ranked-bar-chart
name: Ranked bar chart
category: chart-kpi
uses: [compare-values]
surfaces: [dashboard, landing]
replaces: [AC-13]
components: [blocks/bar, blocks/compare]
inspiration: []
status: stable
---

## When to use

Comparing the same measure across categories: sales by channel, share of answers by brand, errors by service. Bars are the first chart to try when the question is "which is bigger, and by how much". For change over time use a line; for parts of one whole with 3 to 5 parts use a donut.

## Anatomy

- Bars ordered by value, largest first. Horizontal when labels are long, vertical when there are fewer than 8 short labels.
- One hue. Bars step down in lightness by rank (`--chart-2` to `--chart-5`). The series you want to talk about uses the brand color (`--accent`) instead.
- Value label at the end of each bar, tabular numerals, `--text`. Category label at the start, `--text-muted`.
- Baseline is a 1px `--border` rule. No gridlines when values are printed; if you keep gridlines, `--border-soft`, horizontal only.
- Axis starts at zero. Always.
- A leaderboard variant adds a share bar per row (value over total) and one short verdict line above the chart: "Brand C leads with 31% of mentions."
- Bar radius 2px. Gap between bars about 45% of the bar width.

## Do

- Write the takeaway as the chart title: "Email drives 42% of signups", not "Signups by channel".
- Sort by value unless the categories have a natural order (months, age bands).
- Highlight one bar. If everything is highlighted nothing is.
- Make bars at least 24px thick on a touch screen, and show values on tap.
- Add `role="img"` and a text summary or a data table for screen readers.

## Don't

- Don't give every bar its own color. Red, yellow and green bars say "traffic light" and nothing about the data.
- Don't truncate the axis to make a small gap look big.
- Don't use 3D bars, bevels or shadows.
- Don't sort alphabetically when readers want a ranking.
- Don't print a legend for a single series.

## Swap recipe

Slop: a different primary per bar. Fixes AC-13 (rainbow chart colors).

```tsx
// before
const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7']
{data.map((d, i) => <rect key={d.label} fill={COLORS[i]} ... />)}

// after, using the registry bar chart: neutral ramp by rank
import { BarChart } from './blocks/bar'

const data = [
  { label: 'Email', value: 420 },
  { label: 'Search', value: 310 },
  { label: 'Referral', value: 190 },
  { label: 'Social', value: 120 },
]
<BarChart data={data} height={180} aria-label="Signups by channel, email leads" />
```

To emphasize one series, override a single rect:

```css
.bar--focus { fill: var(--accent); }
.bar { fill: var(--chart-3); }
```

`BarChart` already picks `fill-chart-2` to `fill-chart-5` by rank, so the swap is usually: delete the color array, pass plain `{ label, value }` rows.

## Tokens

- `--chart-2`, `--chart-3`, `--chart-4`, `--chart-5`: rank ramp.
- `--accent`: the one emphasized bar.
- `--border`, `--border-soft`: baseline and optional gridlines.
- `--text-muted`, `--text-subtle`, `--t-xs`: labels and tick text.
- `--r-sm`: bar corner radius, small.
- `--sp-3`: space between label column and bars.
