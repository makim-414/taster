---
id: plan-cards
name: Plan cards
category: pricing
uses: [compare-plans]
surfaces: [landing]
replaces: [AC-04, AC-14, CMP-09]
components: [blocks/card, blocks/badge, blocks/button, blocks/toggle, marketing/pricing-cards]
inspiration: [https://21st.dev/@mokshithgujjeti/components/pricing-section]
status: stable
---

## When to use

Use it when you sell a small number of fixed plans and the visitor needs to compare them at a glance. One card per plan, with the same slots in the same places so the eye can run across the row. Use it on the pricing page, and a shortened version on the landing page.

Show as many cards as you have plans. If you have two, show two. If pricing is custom, show one card and a contact link. Use `plan-comparison-table` underneath when plans differ by more than five features.

## Anatomy

Every card has the same slots, in this order, with fixed heights so rows align across cards.

1. Name: `--t-title`, plus a recommended marker as text (a small text label "Recommended") for at most one plan.
2. Price: `--t-h1` with tabular numerals, the unit and period beside it in `--text-muted` ("per month, billed yearly"). A struck-through list price only if it is a real previous price.
3. Billing note: one line, such as "Billed $228 yearly" or "Includes 5 seats". Reserve the line even when empty, so the card aligns.
4. Action: one button. Solid for the recommended plan, outline for the rest.
5. Features: 4 to 7 plain lines, with a check drawn as a line icon or a "+" prefix. The last line may link to the full table.

Above the cards: a monthly and yearly `Switch` with the saving in words ("Yearly: 2 months free"). Toggling updates every price at once and the billing notes.

## Do

- Use `display: grid; grid-template-rows: subgrid` or fixed min-heights so name, price, note, action and list start on the same lines.
- Mark the recommended plan with a text label and a one-step stronger border. Keep its size identical to the others.
- Show the price in the currency the visitor pays. State tax handling in a footnote.
- Write the features as outcomes and limits ("5 domains", "Weekly reports"), not adjectives.
- Keep the same list order across cards; show only differences in bold if you must emphasize.
- Make the monthly and yearly switch a real control with a label, and persist the choice.

## Don't

- Do not put a pale tinted pill saying "Most popular" with a violet fill (AC-04). The marker is plain text with a hairline border.
- Do not fill the row with flat gray bordered boxes of identical radius when there are only two real plans (AC-14).
- Do not scale the middle card up, lift it with a shadow or put a badge on it just because there are three (CMP-09).
- Do not invent a third plan to make a symmetrical row.
- Do not hide the price behind "Contact us" on plans that have one.
- Do not use a green check in a green circle on every line.

## Swap recipe

Slop version: three tiers, the middle one scaled and glowing.

```css
/* before: CMP-09, AC-04, AC-14 */
.tier { border: 1px solid #2a2a2a; border-radius: 16px; background: #141414; padding: 32px; }
.tier.popular { transform: scale(1.06); border-color: #8b5cf6; box-shadow: 0 0 60px #8b5cf655; }
.popular-badge { background: #8b5cf633; color: #c4b5fd; border-radius: 999px; padding: 2px 10px; }
```

Fixed version: same-size cards, aligned slots, a text marker.

```tsx
import { Card, CardContent } from './blocks/card'
import { Button } from './blocks/button'
import { Switch } from './blocks/toggle'

const plans = [
  { name: 'Starter', monthly: 19, yearly: 190, note: '1 domain', cta: 'Start free', features: ['Weekly report', '200 pages checked', 'CSV export'] },
  { name: 'Team', monthly: 79, yearly: 790, note: '5 domains, 5 seats', cta: 'Start trial', recommended: true, features: ['Daily report', '5,000 pages checked', 'Alerts', 'API'] },
]

export function Plans() {
  const [yearly, setYearly] = React.useState(true)
  return (
    <section className="mx-auto max-w-[900px] px-6 py-16">
      <Switch checked={yearly} onChange={(e) => setYearly(e.target.checked)} label="Yearly, 2 months free" />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {plans.map((p) => (
          <Card key={p.name} className={p.recommended ? 'border-text-subtle' : ''}>
            <CardContent className="grid grid-rows-[auto_auto_1.25rem_auto_1fr] gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-title font-semibold text-text">{p.name}</h3>
                {p.recommended && <span className="text-label text-text-muted">Recommended</span>}
              </div>
              <div className="text-h1 font-semibold tabular-nums text-text">
                ${yearly ? Math.round(p.yearly / 12) : p.monthly}
                <span className="ml-1 text-body font-normal text-text-muted">per month</span>
              </div>
              <p className="text-label text-text-subtle">{p.note}{yearly ? `, billed $${p.yearly} yearly` : ''}</p>
              <Button variant={p.recommended ? 'solid' : 'outline'}>{p.cta}</Button>
              <ul className="m-0 grid list-none gap-2 p-0 pt-4 text-body text-text-muted">
                {p.features.map((f) => <li key={f}>{f}</li>)}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
```

## Tokens

- Card: `--bg-elev`, border `--border`; recommended border `--text-subtle`. Radius `--r-card`; padding `--sp-5`.
- Type: name `--t-title`; price `--t-h1` with tabular numerals; note and marker `--t-sm`; features `--t-body` in `--text-muted`.
- Space: card gap `--sp-4`, slot gap `--sp-3`, switch to cards `--sp-8`.
- Color: no tint. Semantic color is not used on pricing.
- Motion: price swap is instant; if you cross-fade, use `--dur-tooltip` and `--ease-out`.
