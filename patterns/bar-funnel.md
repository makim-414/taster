---
id: bar-funnel
name: Bar funnel
category: chart-kpi
uses: [show-drop-off]
surfaces: [dashboard]
replaces: [AC-13]
components: [blocks/funnel]
inspiration: []
status: stable
---

## When to use

An ordered process where each stage can only lose people: visit, signup, activation, purchase. The point is where the biggest loss is. If stages are not strictly nested, or people can skip, use a Sankey or a table of conversion rates instead.

## Anatomy

- One row per stage: label (80px column), a horizontal bar on a sunken track, the count, the percent of the first stage.
- Bar length is the count over the first stage, so the first bar is 100%.
- Lightest bar on top, darker down the list, from `--chart-1` to `--chart-6`. No hue change.
- Between rows, an optional small text "-34% from previous" in `--text-subtle`. The biggest drop gets `--text` instead.
- Track: `--bg-sunken`, 20px high, radius 3px.
- Hover on a row expands it with the absolute counts, the step conversion and the median time between stages.
- Click pins a stage and filters the table below the funnel.
- A vertical variant narrows bars downward for a hero or a report cover; keep a legend of exact numbers next to it.

## Do

- Show both views of the same loss: percent of start and percent of previous stage.
- Keep stage names to one or two words and in the order users actually go through.
- Label the time window and the cohort ("Signups in September").
- Use tabular numerals for counts and percents so they align as a column.
- Provide the same data as a table for screen readers.

## Don't

- Don't draw a trapezoid funnel with curved sides; the area distorts the numbers.
- Don't color the worst stage red and the best green by default. Say it in text.
- Don't use a different hue per stage.
- Don't show a funnel for two stages. A single rate is enough.
- Don't hide the first stage's absolute number.

## Swap recipe

Slop: multicolor funnel with glow edges and percent badges in tinted pills. Fixes AC-13 (rainbow chart colors).

```tsx
// before
const STAGE_COLOR = ['#22c55e', '#eab308', '#f97316', '#ef4444']
<div className="funnel">
  {stages.map((s, i) => (
    <div key={s.name} style={{ width: `${s.pct}%`, background: STAGE_COLOR[i], boxShadow: `0 0 24px ${STAGE_COLOR[i]}` }}>
      <span className="pill-green">{s.pct}%</span>
    </div>
  ))}
</div>

// after
import { Funnel } from './blocks/funnel'

<Funnel
  stages={[
    { label: 'Visit', value: 12400 },
    { label: 'Signup', value: 3100 },
    { label: 'Activated', value: 1480 },
    { label: 'Paid', value: 390 },
  ]}
/>
```

`Funnel` computes the percent against the largest stage, fills bars from `fill-chart-1` down to `fill-chart-6`, and renders the count and percent in tabular numerals. Add the "-34% from previous" line as a sibling under each row if the table needs it.

## Tokens

- `--chart-1` to `--chart-6`: bar ramp, top to bottom.
- `--bg-sunken`: bar track.
- `--text-muted`, `--text`, `--text-subtle`: label, count, percent.
- `--r-sm`: bar radius.
- `--sp-2`, `--sp-3`: row gap and column gap.
- `--dur-dropdown`, `--ease-out`: hover expansion.
