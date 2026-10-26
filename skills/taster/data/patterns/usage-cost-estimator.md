---
id: usage-cost-estimator
name: Usage and cost estimator
category: pricing
uses: [compare-plans, enter-data]
surfaces: [landing, app]
replaces: []
components: [blocks/input]
inspiration: []
status: draft
---

## When to use

Use it when the price depends on a quantity the visitor can estimate: seats, messages, pages, hours of rental, units per month. A small calculator starts from a sensible preset and shows what they would pay for their own numbers. It answers the one question a pricing table cannot: "what will it cost me?"

Use it on the pricing page, next to the plan cards, and inside the app when someone changes their plan. Do not use it when price is fixed per plan. Do not use it as a lead-capture trick that hides the result behind an email.

## Anatomy

A two-part panel: inputs on the left, result on the right (stacked on mobile).

- Preset row: three to four named presets ("Solo", "Small team", "Agency") that fill the inputs with typical values. The first is selected on load, so the result is never empty.
- Inputs: one to four numeric inputs, each with a label, a unit and a sensible range. A slider is optional and always paired with a number field.
- Result: the total in large type (`--t-h1`, tabular numerals), the period, and below it a line-item breakdown: base fee, included quantity, overage rate, tax note.
- Plan hint: a sentence that states which plan fits the input and why ("At 6 domains, Team is cheaper than paying for extras on Starter").
- Footnote: the assumptions and the date the rates were last updated.

Update on input, not on a button. Clamp values to the allowed range and show the clamp in text.

## Do

- Start from a preset that matches the most common customer, not zero.
- Show the arithmetic. The breakdown should let a person recompute the total with a calculator.
- Format with `Intl.NumberFormat` for the visitor's locale and currency.
- Use `inputmode="numeric"` and accept pasted numbers with separators.
- Say what is not included (taxes, overage cap, minimum).
- Make the result reachable by keyboard and announce updates with `aria-live="polite"` on the total.

## Don't

- Do not show a result that is empty, zero or "$NaN" while the user is typing. Hold the last valid total and mark invalid inputs.
- Do not hide the real price behind a form.
- Do not add a slider with a thumb that jumps in unit steps the user cannot predict.
- Do not use made-up savings claims ("Save 87%") that depend on a competitor you did not measure.
- Do not make the total a gradient-filled number with a glow.

## Swap recipe

A pricing page without the estimator usually shows a table of tiers and a "Contact us" for anything in between.

```html
<!-- before: no way to price your own usage -->
<table class="tiers">
  <tr><th>Starter</th><th>Team</th><th>Enterprise</th></tr>
  <tr><td>$19</td><td>$79</td><td>Contact us</td></tr>
</table>
```

Fixed version: a calculator with presets and a visible breakdown.

```tsx
import { Input } from './blocks/input'

const presets = {
  solo: { domains: 1, pages: 200 },
  team: { domains: 5, pages: 5000 },
  agency: { domains: 25, pages: 40000 },
}

function price({ domains, pages }: { domains: number; pages: number }) {
  const base = 79
  const extraDomains = Math.max(0, domains - 5) * 12
  const extraPages = Math.ceil(Math.max(0, pages - 5000) / 1000) * 4
  return { base, extraDomains, extraPages, total: base + extraDomains + extraPages }
}

export function Estimator() {
  const [v, setV] = React.useState(presets.team)
  const p = price(v)
  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
  return (
    <div className="grid gap-8 rounded-lg border border-border bg-bg-elev p-6 md:grid-cols-2">
      <div className="grid gap-4">
        <label className="grid gap-1 text-body text-text">Domains
          <Input type="number" inputMode="numeric" min={1} max={100} value={v.domains}
                 onChange={(e) => setV({ ...v, domains: Math.min(100, Math.max(1, +e.target.value || 1)) })} />
        </label>
        <label className="grid gap-1 text-body text-text">Pages checked per month
          <Input type="number" inputMode="numeric" min={0} value={v.pages}
                 onChange={(e) => setV({ ...v, pages: Math.max(0, +e.target.value || 0) })} />
        </label>
      </div>
      <div aria-live="polite">
        <div className="text-h1 font-semibold tabular-nums text-text">{fmt.format(p.total)}<span className="ml-1 text-body font-normal text-text-muted">per month</span></div>
        <dl className="mt-4 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-body text-text-muted tabular-nums">
          <dt>Team plan</dt><dd>{fmt.format(p.base)}</dd>
          <dt>Extra domains</dt><dd>{fmt.format(p.extraDomains)}</dd>
          <dt>Extra pages</dt><dd>{fmt.format(p.extraPages)}</dd>
        </dl>
        <p className="mt-4 text-label text-text-subtle">Rates as of 24 Oct. Taxes are not included.</p>
      </div>
    </div>
  )
}
```

## Tokens

- Panel: `--bg-elev`, `--border`, radius `--r-card`, padding `--sp-6`.
- Type: total `--t-h1` with tabular numerals; labels `--t-body`; breakdown `--t-body` in `--text-muted`; footnote `--t-sm` in `--text-subtle`.
- Inputs: registry `Input` uses `--input` and `--ring`. Radius `--r-md`.
- Space: column gap `--sp-8`, field gap `--sp-4`, breakdown rows `--sp-1` apart.
- Color: no semantic color. If a plan hint recommends an upgrade, it is plain text with a link.
