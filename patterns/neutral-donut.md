---
id: neutral-donut
name: Neutral donut
category: chart-kpi
uses: [show-composition]
surfaces: [dashboard]
replaces: [AC-13]
components: [blocks/donut]
inspiration: []
status: stable
---

## When to use

Parts of one whole when there are 2 to 5 parts and the question is "what is the biggest share". The center holds the total or the one value you want read. With more than 5 parts, or when parts are close in size, use a ranked bar chart; angles are hard to compare.

## Anatomy

- Ring with a thickness of about 10% of the diameter. Thin rings read as a gauge, fat ones as a pie.
- Segments in one hue, stepping through `--chart-1` to `--chart-6` by lightness. The segment you discuss can use `--accent`.
- 2px gap between segments in the background color, so neighbors do not blur.
- Track behind the ring in `--border-soft`, visible only when the parts sum to less than 100%.
- Center: the total or the lead value at 24px semibold, with a one-word caption under it ("Total", "Mobile").
- Legend to the side or below: a 8px dot in the segment's tone, the label, the value right-aligned in tabular numerals, the share in `--text-subtle`.
- Hover on a legend row highlights the segment and dims others to 40%.

## Do

- Order segments largest first, starting at 12 o'clock and going clockwise.
- Put exact values in the legend. The ring is for shape, the legend is for numbers.
- Emphasize one slice. Say why in the heading: "Mobile is 61% of sessions".
- Make adjacent segments differ by at least 12 points of lightness.
- Provide a text alternative listing label, value and share.

## Don't

- Don't give each slice a hue from the rainbow.
- Don't explode slices, add 3D tilt or drop shadows.
- Don't put labels on the ring itself; they collide on small slices.
- Don't use a donut for a single percent. That is a meter.
- Don't group "Other" at 40%. Break it down or change the chart.

## Swap recipe

Slop: a six-color donut with legend chips in matching tints. Fixes AC-13 (rainbow chart colors).

```tsx
// before
const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444']
<PieChart>
  <Pie data={data} innerRadius={50} outerRadius={80} dataKey="value">
    {data.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
  </Pie>
</PieChart>

// after
import { DonutChart } from './blocks/donut'

<DonutChart
  size={160}
  segments={[
    { label: 'Mobile', value: 6120 },
    { label: 'Desktop', value: 3010 },
    { label: 'Tablet', value: 870 },
  ]}
/>
```

`DonutChart` draws segments with `stroke-chart-1` to `stroke-chart-6`, shows the sum in the center, and lists label and value in the legend. For one highlighted slice, add a class to that circle that sets `stroke: var(--accent)` and leave the rest on the ramp.

## Tokens

- `--chart-1` to `--chart-6`: segment ramp, lightest to darkest.
- `--accent`: the highlighted slice.
- `--border-soft`: ring track.
- `--t-h2`, `--w-semi`: center value.
- `--t-sm`, `--text-muted`, `--text`: legend label and value.
- `--sp-4`: gap between ring and legend.
