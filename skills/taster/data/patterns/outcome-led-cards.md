---
id: outcome-led-cards
name: Outcome-led cards
category: feature-section
uses: [explain-features, show-one-number]
surfaces: [landing]
replaces: [CMP-03, CMP-06, LAY-02]
components: [blocks/card, blocks/kpi]
inspiration: []
status: stable
---

## When to use

Use it when you have a small set of capabilities and a measured result for each. The card leads with the result and the sentence below says how. It replaces the row of three identical icon cards, which tells a visitor nothing they could not guess from the headings.

Use it only with real measurements. If you have no numbers, use `content-matched-grid` and plain sentences. Invented figures do more damage than none.

## Anatomy

Two to four cards in a row, equal width, aligned on a shared baseline grid.

- Figure: the measured result in large type (`--t-h2` or `--t-h1`), tabular numerals, with its unit attached ("38 min", "-41%", "2.1x").
- Label: a short noun phrase under or beside the figure that says what was measured ("median time to first reply").
- Sentence: one sentence, 12 to 25 words, `text-muted`, that explains the mechanism.
- Source line: small `--text-subtle` text with the period and sample ("14 accounts, Aug to Sep") or a link to the method.

No icon, no icon tile, no tinted corner. The card is a surface with a hairline border and padding of `--sp-5`. Each card has its own figure, so the three cards are not interchangeable in length; let them differ rather than force equal text.

## Do

- Put the figure first in reading order and in the DOM, so screen readers say it before the explanation.
- Pair every figure with its denominator or period. "41% faster" with no base is a claim, not a result.
- Use `tabular-nums` and consistent units across cards so scanning is easy.
- Show the number your customer cares about, not the one that is easiest to produce.
- Link the source line to a methods page or a case study.
- Let the grid collapse to one column under 640px and keep the figure above the sentence.

## Don't

- Do not put a pale tinted rounded square with an icon above the heading (CMP-03).
- Do not repeat three same-size cards that each hold an icon, a heading and two lines (LAY-02).
- Do not use a big-number strip of round marketing numbers: "10K+", "99.9%", "3x" (CMP-06). These are the numbers people stop reading.
- Do not color each figure differently. One ink color for all.
- Do not animate the figure counting up from zero. It delays the answer.

## Swap recipe

Slop version: three icon cards, then a strip of vanity numbers.

```tsx
// before: LAY-02, CMP-03, CMP-06
<div className="grid grid-cols-3 gap-6">
  {['Fast', 'Secure', 'Smart'].map((t) => (
    <div className="rounded-2xl p-6 shadow-lg">
      <div className="mb-4 grid size-12 place-items-center rounded-xl bg-violet-500/10 text-violet-500"><Zap /></div>
      <h3>{t}</h3><p>Lorem ipsum dolor sit amet, consectetur adipiscing.</p>
    </div>
  ))}
</div>
<div className="flex justify-around text-5xl font-bold"><span>10K+</span><span>99.9%</span><span>3x</span></div>
```

Fixed version: each card opens with its own measured result.

```tsx
import { Card, CardContent } from './blocks/card'

const results = [
  { figure: '38 min', label: 'median time to first reply', body: 'Replies are drafted from the open ticket and the last three similar ones, so agents edit instead of write.', source: '14 accounts, Aug to Sep' },
  { figure: '-41%', label: 'tickets reopened', body: 'Every draft cites the help article it used, which makes wrong answers easy to spot.', source: '6,210 tickets, Sep' },
  { figure: '2.1x', label: 'tickets closed per agent per day', body: 'Routing sends billing questions to a fixed queue with a fixed template.', source: '9 agents, Sep' },
]

export function Outcomes() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {results.map((r) => (
        <Card key={r.label}>
          <CardContent className="grid gap-2">
            <div className="text-h1 font-semibold tabular-nums tracking-[-0.02em] text-text">{r.figure}</div>
            <div className="text-body text-text">{r.label}</div>
            <p className="text-body text-text-muted">{r.body}</p>
            <p className="mt-2 text-label text-text-subtle">{r.source}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

If one card has no measurement yet, drop to two cards instead of inventing a third.

## Tokens

- Type: figure `--t-h1` (30px) or `--t-h2` (24px), weight `--w-semi`, tracking -0.02em; label `--t-body`; sentence `--t-body` in `--text-muted`; source `--t-sm` in `--text-subtle`.
- Surface: `--bg-elev` with `--border`, radius `--r-card`. No `--sh-card` stack of different shadows; one border is enough.
- Space: card padding `--sp-5`, gap inside `--sp-2`, gap between cards `--sp-4`.
- Color: all text from `--text`, `--text-muted`, `--text-subtle`. Delta color (`--delta-up`) only if the figure is a delta and the direction matters.
