---
id: sourced-metric-band
name: Sourced metric band
category: chart-kpi
uses: [show-one-number, prove-trust]
surfaces: [landing, dashboard]
replaces: [CMP-06, CMP-08, COL-01]
components: [blocks/kpi]
inspiration: []
status: stable
---

## When to use

A strip of three or four figures that supports a claim: on a landing page under the hero, in a report summary, in a pitch page. Use it only when every figure is real, dated and can be traced. If the numbers are aspirations or rounded marketing, cut the band and write the one fact that is true.

## Anatomy

- One row, 3 or 4 cells, divided by 1px `--border-soft` rules, not by cards.
- Each cell: the figure at 36 to 48px in tabular numerals, a label of one line beneath, and a source line in `--text-subtle` at caption size ("Internal order data, Jan to Sep 2026").
- Hierarchy by ink tone: the lead figure in `--text`, the supporting ones in `--text-muted`. No gradient text.
- Each figure is a link or a button that opens its calculation: numerator, denominator, period, and the rows behind it, or a link to the original page.
- A footer line for the band: the as-of date and a link to the method.
- On phones the cells stack, figure and label on one line each.

## Do

- Print the period and the base next to every percentage. "38% of 412 orders" beats "38%".
- Round honestly. If the figure is 1,284, do not print "1K+".
- Link to the original source: a public report, a dataset, a dashboard view. Use the host name as the link text.
- Date the band. Numbers go stale and readers know it.
- Prefer one hard figure over four soft ones. Three is a pattern people ignore.

## Don't

- Don't invent a metric to fill the fourth slot.
- Don't use round claims with plus signs ("10K+", "99.9%", "3x faster") without a source line.
- Don't put a logo strip of customers who did not agree to appear. If you have none, remove the strip.
- Don't paint the numbers with a purple-to-pink gradient clip.
- Don't count up from zero on scroll. The reader wants the number, not the show.

## Swap recipe

Slop: three giant claims with gradient text and no source. Fixes CMP-06 (triple number strip), CMP-08 (fake trust signals) and COL-01 (purple gradient).

```tsx
// before
<section className="grid grid-cols-3 text-center">
  <div><b className="bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-6xl text-transparent">10K+</b><p>Happy users</p></div>
  <div><b className="bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-6xl text-transparent">99.9%</b><p>Uptime</p></div>
  <div><b className="bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-6xl text-transparent">3x</b><p>Faster</p></div>
</section>

// after
const FIGURES = [
  { value: '412', label: 'Orders handled', source: 'Order system export, Jan to Sep 2026', href: '/method#orders', lead: true },
  { value: '38%', label: 'Repeat customers, of 412', source: 'Same export, customers with 2+ orders', href: '/method#repeat' },
  { value: '1.8 days', label: 'Median delivery time', source: 'Carrier tracking data', href: '/method#delivery' },
]

<section aria-labelledby="band-h" className="grid divide-y divide-border-soft border-y border-border-soft sm:grid-cols-3 sm:divide-x sm:divide-y-0">
  {FIGURES.map((f) => (
    <a key={f.label} href={f.href} className="block px-6 py-6">
      <div className={`text-display font-semibold tabular-nums ${f.lead ? 'text-text' : 'text-text-muted'}`}>{f.value}</div>
      <div className="mt-1 text-sm text-text">{f.label}</div>
      <div className="mt-2 text-caption text-text-subtle">{f.source}</div>
    </a>
  ))}
</section>
<p className="mt-3 text-caption text-text-subtle">As of 30 September 2026. <a href="/method" className="underline">How we count</a></p>
```

`Stat` from `blocks/kpi` can replace the inner markup when the band sits inside an app and needs a delta.

## Tokens

- `--text`, `--text-muted`, `--text-subtle`: lead figure, supporting figures, source line.
- `--border-soft`: dividers between cells.
- `--t-display`, `--w-semi`: figure size and weight.
- `--t-body`, `--t-xs`: label and source line.
- `--sp-6`, `--sp-12`: cell padding and band margin.
