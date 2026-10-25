---
id: sourced-answer-block
name: Sourced answer block
category: chat-ai
uses: [ask-the-assistant, prove-trust]
surfaces: [ai-chat, dashboard]
replaces: [CMP-06, CPY-01]
components: [blocks/card, blocks/kpi]
inspiration: []
status: stable
---

## When to use

Use it whenever an assistant or a report answers a factual question about data: "How did we do last month?", "Which suppliers are late?". The answer must be checkable. The reader should see the conclusion first, then the evidence, then where it came from and how current it is.

Do not use it for opinions or creative text, where there is nothing to cite. Do not use it as decoration around an answer that has no source; an empty source row is worse than none.

## Anatomy

One card, five parts in a fixed order:

1. Conclusion: one sentence that states the answer with the number in it. "Share rose to 31.4 percent, up 2.1 points on last month."
2. Evidence: a table, a small chart, or a single `Stat` with the headline number and its delta. One visual, not three.
3. Reading note: one or two sentences on what the figure means and how sure we are ("Based on 412 samples, margin about 3 points"). This is the confidence note.
4. Sources: chips, each a domain or a document name, linking out. Three to six at most, with a "+4" overflow.
5. As-of line: "As of 24 Oct 2026, 09:10". Plain small text, bottom left. A follow-up row of two or three questions may sit bottom right.

## Do

- Write the conclusion before you design the widget. If it cannot be written in one sentence, the answer is not ready.
- Show the headline number once, in the `Stat` block, with the delta as the only colored element.
- State the sample size or period beside the number. "412 queries over 7 days" turns a claim into a measurement.
- Make every source chip a real link with the page title, not just a hostname. Open in a new tab with `rel="noopener"`.
- Show the as-of date even when it is today. It tells the reader the answer will age.
- When the data is missing, say "No data for this period" and show a middle dot in the number slot. Never a fake zero.

## Don't

- Do not show three big invented numbers in a row as a "stats strip" (CMP-06). Use one number, with its source.
- Do not open with filler such as "Great question" or "Here is a comprehensive overview" (CPY-01).
- Do not give a confidence meter with a gauge needle and a percentage you cannot defend. Write the sample and the range in words.
- Do not hide sources behind a tooltip on a tiny icon.
- Do not highlight the answer with a left accent border or a tinted band (AC-10, AC-06).
- Do not paraphrase the source so loosely that the link no longer supports the sentence.

## Swap recipe

The slop version is a hero-style stat strip with marketing copy, no dates and no sources.

```html
<!-- before: invented stat strip, filler, no source -->
<div class="rounded-2xl border-l-4 border-indigo-500 bg-indigo-500/10 p-6">
  <p>Great news! Here is a comprehensive look at your performance. Build faster, ship smarter.</p>
  <div class="flex gap-10"><b class="text-5xl">10K+</b><b class="text-5xl">99.9%</b><b class="text-5xl">3x</b></div>
</div>
```

```tsx
// after: conclusion first, one stat, sample note, source chips, as-of
import { Card, CardContent } from './blocks/card'
import { Stat } from './blocks/kpi'

export function SourcedAnswer({ a }: { a: Answer }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-[var(--sp-4)]">
        <p className="text-[length:var(--t-title)] leading-[var(--lh-snug)]">{a.conclusion}</p>
        <Stat label={a.metricLabel} value={a.value} delta={a.delta} sub={a.period} />
        <p className="text-[length:var(--t-sm)] text-[var(--text-muted)]">{a.note}</p>
        <ul className="flex flex-wrap gap-[var(--sp-2)]">
          {a.sources.map((s) => (
            <li key={s.href}>
              <a href={s.href} target="_blank" rel="noopener" className="rounded-[var(--r-sm)] border border-[var(--border)] px-2 py-1 text-[length:var(--t-sm)]">{s.title}</a>
            </li>
          ))}
        </ul>
        <p className="text-[length:var(--t-xs)] text-[var(--text-subtle)]">As of {a.asOf}</p>
      </CardContent>
    </Card>
  )
}
```

The stat strip is CMP-06, the filler sentence is CPY-01, the accent bar is AC-10.

## Tokens

- Card: `blocks/card` surface, `--bg-elev`, `--border`, padding `--sp-5`.
- Conclusion `--t-title`; reading note `--t-sm` in `--text-muted`; as-of `--t-xs` in `--text-subtle`.
- Delta colors only: `--delta-up` and `--delta-down`. Everything else stays on the neutral ramp.
- Source chips: `--r-sm`, `--border`, `--t-sm`. Hover raises text to `--text` over `--dur-press`.
- Chart series, if a chart is the evidence: `--chart-1` to `--chart-4`, told apart by lightness.
