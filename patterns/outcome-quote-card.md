---
id: outcome-quote-card
name: Outcome quote card
category: testimonial
uses: [prove-trust]
surfaces: [landing]
replaces: [AC-17, CMP-08]
components: [blocks/card]
inspiration: [https://21st.dev/@uilayout.contact/components/testimonial-1]
status: stable
---

## When to use

Use it when you have real customers who agreed to be named, and at least one measured result per customer. A testimonial that begins with the number and then explains it carries more weight than five stars and a generic compliment. Use it once on the landing page, close to the pricing, and on case study index pages.

If you have no named customers yet, omit the section. An empty slot is better than made-up praise. You can substitute a short note about your beta ("14 teams in the private beta") only if it is true.

## Anatomy

A card in a row of two or three, or one wide card.

- Result line: the measured result at `--t-h2`, tabular numerals, with its label ("-41% tickets reopened in 8 weeks").
- Quote: one to three sentences, 20 to 45 words, in the customer's own words, set at `--t-body` or `--t-title` in `--text`. Straight quotation marks or none.
- Attribution: full name, role and company on one line, with a small real photograph (optional, 32 to 40px, square with `--r-md`) or a text-only line.
- Link: "Read the case" to a page where the claim is backed up, if one exists.

Photographs are real headshots supplied by the person. If there is no photo, skip the avatar; do not use initials in a colored disc.

## Do

- Get written permission for the name, the company and the number.
- Use the exact wording of the quote, edited only for length with an ellipsis.
- State the time span and the baseline for every result.
- Link the company name to its site, with `rel="noopener"`.
- Present quotes in the same size and weight, with the card height driven by content.
- Keep the total count to three. More is shelf-filling.

## Don't

- Do not add a five-star row or a rating badge unless you display a rating from a real review platform with its link (AC-17's family: drawing the look of proof instead of showing the proof).
- Do not use stock avatars or generated faces, and do not invent people (CMP-08).
- Do not make up a company and a title to fill the third card.
- Do not paraphrase into marketing language and put it in quotes.
- Do not decorate with a giant quotation mark graphic on every card.
- Do not scrape reviews and rewrite them.

## Swap recipe

Slop version: stars, stock avatar, invented person and a vague compliment.

```tsx
// before: CMP-08, AC-17
<div className="rounded-2xl bg-white/5 p-6">
  <div className="text-yellow-400">★★★★★</div>
  <p>"This product completely transformed our workflow. Highly recommend!"</p>
  <div className="mt-4 flex items-center gap-3">
    <img src="https://i.pravatar.cc/80?img=12" className="size-10 rounded-full" />
    <div><b>Sarah Johnson</b><div className="text-sm opacity-60">CEO, TechCorp</div></div>
  </div>
</div>
```

Fixed version: result first, named person, link to proof.

```tsx
import { Card, CardContent } from './blocks/card'

export function OutcomeQuote({ q }: { q: {
  result: string; label: string; quote: string; name: string; role: string; company: string; href: string
} }) {
  return (
    <Card>
      <CardContent className="grid gap-3">
        <div>
          <div className="text-h2 font-semibold tabular-nums text-text">{q.result}</div>
          <div className="text-label text-text-subtle">{q.label}</div>
        </div>
        <blockquote className="m-0 text-body text-text">{q.quote}</blockquote>
        <p className="m-0 text-label text-text-muted">
          {q.name}, {q.role}, <a className="text-text underline" href={q.href} rel="noopener">{q.company}</a>
        </p>
      </CardContent>
    </Card>
  )
}
```

Use it only with data you hold written consent for, for example `result: "-41%"`, `label: "tickets reopened in 8 weeks"`. If you cannot fill every field truthfully, do not render the card.

## Tokens

- Card: `--bg-elev`, `--border`, radius `--r-card`, padding `--sp-5`.
- Type: result `--t-h2` at `--w-semi`; label `--t-sm` in `--text-subtle`; quote `--t-body` in `--text`; attribution `--t-sm` in `--text-muted`.
- Space: gap `--sp-3` inside, `--sp-4` between cards, `--sp-16` section padding.
- Avatar (if used): 40px, `--r-md`, a real image, no ring.
- Color: neutral only. The result is not colored by sign.
