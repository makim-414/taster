---
id: stage-dot-progress
name: Stage dot progress
category: timeline-stepper
uses: [guide-through-steps, label-a-state]
surfaces: [dashboard, app, auth-onboarding]
replaces: [AC-08]
components: [blocks/progress]
inspiration: []
status: stable
---

## When to use

A fixed, short list of stages that something moves through: a record in a pipeline, an install, a signup. Use dots in a table row or a card where space is tight and the question is "how far along is this". Use a segmented bar at the top of a signup or setup flow, where the person sees one stage at a time.

## Anatomy

- Row of 4 to 7 marks, 8 to 10px each, 6px apart, on one baseline.
- Passed stage: filled dot in `--text`. Current stage: filled dot with a 2px ring in `--text-muted`. Pending: empty ring, 1px `--border`.
- A stage that is below its target is a faint dot (`--text-subtle` at low opacity), not a red one.
- Optional text to the right: the name of the current stage and a count, "Review, 3 of 5".
- Segmented variant: N equal bars 4px high, 4px gap, filled with `--accent` up to the current stage. Built from `Progress` with `value = stage / total * 100`.
- Each mark has a tooltip with the stage name and the date it passed.

## Do

- Give every stage a name that a screen reader reads: `aria-label="Review, current, step 3 of 5"`.
- Keep the same order and same count across every row of a table, so columns line up.
- Show the result of the whole row in one word next to the dots when it matters ("Blocked").
- Use `aria-valuenow` and the `progressbar` role for the segmented bar; the dots are a list.
- Let a stage be skipped: draw a short dash through the ring, do not fake a fill.

## Don't

- Don't color the dots green, amber and red. Place carries meaning here, not hue.
- Don't pulse or glow the current dot. A static ring is easier to scan down a column.
- Don't connect dots with a thick line when 3 or more rows are stacked; the lines turn into a ladder.
- Don't use more than 7 marks. Group stages instead.
- Don't show a percent for a stage count. "3 of 5" is true; "60%" is invented precision.

## Swap recipe

Slop: colored status dots with a glow, one per row, meaning unclear. Fixes AC-08 (colored status dot).

```css
/* before */
.status-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #22c55e; box-shadow: 0 0 8px #22c55e;
  animation: pulse 1.6s infinite;
}
```

```tsx
// after: five stages, third is current
const STAGES = ['Draft', 'Submitted', 'Review', 'Approved', 'Live']

<ol className="flex items-center gap-1.5" aria-label="Stage 3 of 5, Review">
  {STAGES.map((name, i) => {
    const state = i < 2 ? 'done' : i === 2 ? 'current' : 'pending'
    return (
      <li key={name} title={name} aria-current={state === 'current' ? 'step' : undefined}
        className={
          state === 'done' ? 'size-2 rounded-full bg-text'
          : state === 'current' ? 'size-2 rounded-full bg-text ring-2 ring-text-muted ring-offset-1 ring-offset-bg'
          : 'size-2 rounded-full border border-border'
        } />
    )
  })}
</ol>

// segmented bar for a signup flow
import { Progress } from './blocks/progress'
<Progress value={(3 / 5) * 100} label="Step 3 of 5" />
```

## Tokens

- `--text`, `--text-muted`: passed and current marks.
- `--border`, `--text-subtle`: pending ring and faint below-target dot.
- `--accent`: filled part of the segmented bar.
- `--bg-elev`, `--border-soft`: bar track.
- `--sp-1`, `--sp-2`: gap between marks.
- `--r-pill`: dots and bar ends are the only pill shapes here.
