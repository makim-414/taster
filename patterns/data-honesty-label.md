---
id: data-honesty-label
name: Data honesty label
category: badge-label
uses: [label-a-state, prove-trust]
surfaces: [dashboard]
replaces: [CMP-06, CMP-08, CPY-02]
components: [blocks/badge]
inspiration: []
status: stable
---

## When to use

Dashboards, reports and prototypes where some numbers are measured, some are modeled, some are not in yet and some are placeholders. A reader who cannot tell which is which will trust all of them equally, and that is how a mockup number ends up in a board deck.

Use it whenever a figure on screen did not come straight from a system of record.

## Anatomy

- A short label next to or under the figure. Four kinds cover almost every case:
  - Measured: read from a real source, with the source and date available on hover.
  - Estimated: calculated or modeled, with the method named.
  - Pending: expected but not received yet.
  - Concept: a placeholder for layout. It must never look like data.
- Text only, set apart by ink tone: full ink for measured, muted for estimated, subtle for pending, subtle plus italic or a dashed underline for concept.
- The registry `Badge` with `withDot={false}` gives the thin neutral container if you need one. Do not color it.
- A caption slot for the source: "Source: payments export, 12 Oct".

## Do

- Put the label where the eye lands first, next to the number, not in a legend at the bottom.
- Use the same four words across the whole product. Add a fifth kind only if the data has one that cannot be described by these four.
- Show a dash instead of a made-up value for pending items, and keep the label.
- Link the label to the definition: how it is measured, how fresh it is, who owns it.
- Print the label on exports and screenshots too. Labels that vanish when someone copies the chart defeat the point.

## Don't

- Don't print a missing figure as `0` or as the raw `NaN`. A confirmed zero and an unknown value need different words: "0 items" is a fact, "Not counted yet" is honest about the gap.
- Don't use green, amber and red to mean honesty. Colors already mean good, caution, bad, and those are different questions.
- Don't show three round hero numbers (10K+, 99.9%, 3x) with no label at all. If a number is invented, it is a concept, say so.
- Don't hide the label in a tooltip that only appears on hover. Touch devices never see it.
- Don't call estimates "insights". Call them estimates.
- Don't add a "verified" check mark to anything you did not verify.

## Swap recipe

Slop version (fixes CMP-06, CMP-08):

```html
<div class="stats">
  <div><strong>10K+</strong><span>Happy customers</span></div>
  <div><strong>99.9%</strong><span>Uptime</span></div>
  <div><strong>3x</strong><span>Faster</span></div>
</div>
```

Fixed version:

```tsx
import { Badge } from './blocks/badge'

function Figure({ value, kind, source }: { value: string; kind: 'measured' | 'estimated' | 'pending' | 'concept'; source?: string }) {
  const tone = {
    measured: 'text-text',
    estimated: 'text-text-muted',
    pending: 'text-text-subtle',
    concept: 'text-text-subtle italic',
  }[kind]
  return (
    <div>
      <div className="text-2xl font-semibold tabular-nums">{kind === 'pending' ? '-' : value}</div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        <Badge withDot={false} className={tone}>{kind[0].toUpperCase() + kind.slice(1)}</Badge>
        {source && <span className="text-text-subtle">{source}</span>}
      </div>
    </div>
  )
}

<Figure value="1,284" kind="measured" source="Orders export, 12 Oct" />
<Figure value="~92%" kind="estimated" source="Model v2, 90 day window" />
<Figure value="" kind="pending" />
```

## Tokens

- Ink steps carry the meaning: `--text` (measured), `--text-muted` (estimated), `--text-subtle` (pending, concept).
- Container: `--border`, transparent fill, `--r-pill` or `--r-sm`.
- Type: value at `--t-h2` (24px) semibold with tabular numerals, label at `--t-sm` (12px), source at `--t-xs` (11px).
- Space: `--sp-1` between value and label row, `--sp-2` between label and source.
- No semantic colors, no shadow.
