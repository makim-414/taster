---
id: gauge-and-meter
name: Gauge and meter
category: chart-kpi
uses: [show-one-number, compare-values]
surfaces: [dashboard]
replaces: [AC-08]
components: [blocks/progress]
inspiration: []
status: stable
---

## When to use

One value against a known scale: quota used, score out of 100, storage, completeness of a profile. Use a thin bar in lists and tables, a ring or half ring beside a large number on a detail page. If the value has no maximum or the scale is invented, show the number alone.

## Anatomy

- Track: 6 to 8px high, full pill ends, `--bg-elev` with a 1px `--border-soft`.
- Fill: `--accent`, width proportional to value over max. The number sits beside the bar, right-aligned in tabular numerals, with its unit.
- Threshold markers: 1px ticks at the "good" and "limit" values, with a caption on hover. They replace green and red zones.
- Empty state: a dashed track and a plain hyphen where the value would be, never a bar at zero.
- Ring variant: 6px stroke, same fill color, value in the center at 24px, caption under it. Half ring only if the scale has real ends (0 to 100).
- Label above or left: what is measured and the scale ("Storage, 100 GB plan").
- Accessible: `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`.

## Do

- Print the number. A bar without a figure is decoration.
- Show the limit as a tick and a number, so people know how close they are.
- Switch to `--danger` text for the figure only when the value crosses a hard limit, and say what happens next.
- Animate the fill once on mount, under 400ms, and not at all with reduced motion.
- Stack several meters with a shared scale so lengths compare directly.

## Don't

- Don't paint the bar green, amber and red by zone. Color without a stated rule is guesswork.
- Don't put a pulsing or glowing dot at the end of the fill.
- Don't draw a speedometer with a needle for a business metric.
- Don't use a gauge for a number that moves by the second; use a figure and a sparkline.
- Don't fill the bar when the value is missing. A dash is true; 0% is a claim.

## Swap recipe

Slop: a glowing colored dot plus a traffic-light bar. Fixes AC-08 (colored status dot).

```tsx
// before
<div className="flex items-center gap-2">
  <span className="size-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
  <div className="h-3 w-40 rounded bg-gradient-to-r from-green-400 via-yellow-400 to-red-500" />
</div>

// after
import { Progress } from './blocks/progress'

<div className="flex items-center gap-3">
  <Progress value={68} label="Storage, 100 GB plan" className="w-64" />
</div>

// with a threshold tick at 80%
<div className="relative w-64">
  <Progress value={68} label="Storage, 100 GB plan" />
  <span aria-hidden className="absolute bottom-0 h-2 w-px bg-text-subtle" style={{ left: '80%' }} />
</div>
<p className="mt-1 text-caption text-text-subtle">Limit warning at 80 GB</p>
```

`Progress` clamps to 0 to 100, prints the rounded percent, and sets the ARIA attributes. For an absolute value ("68 GB of 100 GB"), compute `value = used / max * 100` and put the absolute text in `label`.

## Tokens

- `--accent`: fill.
- `--bg-elev`, `--border-soft`: track.
- `--text-subtle`: threshold ticks and captions.
- `--danger`: figure text after a hard limit is crossed.
- `--r-pill`: track and fill ends.
- `--t-xs`, `--t-h2`: label in a bar, center value in a ring.
