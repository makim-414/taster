---
id: monochrome-logo-strip
name: Monochrome logo and proof strip
category: testimonial
uses: [prove-trust]
surfaces: [landing]
replaces: [AC-11, CMP-08]
components: [blocks/badge]
inspiration: []
status: stable
---

## When to use

Use it directly under the hero or just above the pricing when you have real customers or integrations that visitors recognize. Logos work as proof only if the visitor knows the brand and you have the right to show it. A second strip type, certification chips such as SOC 2 or GDPR, is for sites that sell to security-minded buyers.

Omit the strip when you have fewer than four real logos or no permission. A missing strip costs nothing. A made-up strip costs trust the moment someone checks.

## Anatomy

One row, left aligned label, logos at equal optical height.

- Caption: a sentence in sentence case in `--text-subtle` at `--t-sm`: "Used by teams at" or "Works with". Not uppercase, not tracked.
- Logos: 4 to 8 single-color logos in `currentColor` (`--text-muted`), same optical height (20 to 24px), spaced `--sp-8` apart. They wrap to two rows on mobile; they do not scroll as a marquee.
- Optional certification chips: bordered neutral chips using the registry `Badge`, with no color dot, set in a separate line below ("SOC 2 Type II", "GDPR", "ISO 27001") and only for audits you passed. Each can link to the trust page.
- Optional count: "and 40 more" as plain text.

Logos link to a case study if one exists; otherwise they are not links.

## Do

- Request logo files from each customer's brand page and keep their clear space.
- Convert them to one color. Keep their original proportions.
- Match optical size: wide wordmarks shorter, square marks slightly larger so they feel the same weight.
- Give each logo an `alt` equal to the company name.
- State the claim in the caption exactly: "Customers" if all are customers, "Integrations" if they are.
- Link the certification chip to the report or the trust page.

## Don't

- Do not put colored circles or discs behind icons in the chips (AC-11). Use text and a hairline border.
- Do not show logos of companies you merely tried to sell to, former employers, or any brand without permission (CMP-08).
- Do not invent a company name and a wordmark for filler.
- Do not use a marquee of 20 logos scrolling forever. It cannot be read and it cannot be audited.
- Do not claim awards or "as seen in" without a link to the piece.

## Swap recipe

Slop version: colored fake logos in a scrolling marquee, with green check discs.

```html
<!-- before: CMP-08, AC-11 -->
<div class="marquee">
  <img src="/logos/acme-color.svg"><img src="/logos/globex-color.svg"><img src="/logos/initech-color.svg"> ... x20
</div>
<span class="disc green"><svg><!-- check --></svg></span> SOC 2 certified
```

Fixed version: a quiet one-color row and neutral chips.

```tsx
import { Badge } from './blocks/badge'

const logos = [
  { name: 'Northwind', src: '/logos/northwind.svg' },
  { name: 'Contoso', src: '/logos/contoso.svg' },
  { name: 'Fabrikam', src: '/logos/fabrikam.svg' },
  { name: 'Tailspin', src: '/logos/tailspin.svg' },
]

export function ProofStrip() {
  return (
    <section className="mx-auto max-w-[1100px] px-6 py-12">
      <p className="text-label text-text-subtle">Used by teams at</p>
      <ul className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-4 p-0 list-none text-text-muted">
        {logos.map((l) => (
          <li key={l.name}>
            <img src={l.src} alt={l.name} height={22} className="h-[22px] w-auto opacity-80 [filter:grayscale(1)_contrast(0.9)]" />
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap gap-2">
        <Badge withDot={false}>SOC 2 Type II</Badge>
        <Badge withDot={false}>GDPR</Badge>
      </div>
    </section>
  )
}
```

The names above are placeholders; ship only logos you are entitled to show, and prefer SVG files that you recolor with `fill="currentColor"` over a CSS filter.

## Tokens

- Logo color: `--text-muted` as `currentColor`; hover (if linked) `--text`.
- Caption: `--t-sm` in `--text-subtle`, normal tracking, sentence case.
- Chips: registry `Badge` with `withDot={false}`: `--border`, transparent background, `--t-sm`, radius `--r-pill` (it is the one place the pill shape is acceptable, with a neutral outline).
- Space: logo gap `--sp-8`, row gap `--sp-4`, section padding `--sp-12`.
- Motion: none.
