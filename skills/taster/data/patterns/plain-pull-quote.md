---
id: plain-pull-quote
name: Plain pull quote
category: testimonial
uses: [prove-trust, emphasize-text]
surfaces: [landing, editorial]
replaces: [AC-10, TYP-03]
components: []
inspiration: [https://21st.dev/@designali-in/components/dot-pattern-1]
status: stable
---

## When to use

Use it for one quote that earns the space: a customer sentence, a line from a review, a sentence from a long article that sums up the piece. A pull quote is not a second hero. It gives the page a moment of rest, a change of scale, and a human voice.

Use at most one per page section, and on editorial pages one per 600 to 800 words. If you have three quotes, use `outcome-quote-card`. If you have none that is real, skip it.

## Anatomy

- Quote text: one typeface, one weight, one color, 20 to 32 words, set at `--t-h2` or larger for a feature quote. Left aligned or centered for a single short quote; never justified.
- Opening mark: a large quotation mark in the same typeface, placed in the margin (hanging) or above the first line at about 2x the text size, in `--text-subtle`. Not a decorative glyph from another font.
- Attribution: a line below with a short rule or no rule, name in `--text`, role and place in `--text-muted`, with a link to the source if the quote is public.
- Container: no card, no side bar, no tint. Optional hairline above and below, or generous space.

The quote can sit over a plain surface or a very subtle dot texture at 3 to 6% contrast, as long as the text contrast stays at 7:1.

## Do

- Keep the typeface the page already uses for headings. If the page has a serif for quotes, use that serif for the whole quote.
- Use real typographic quotes (“ ”) or none at all.
- Set the line length to about 22 to 28 characters at the biggest size, 40 to 60 at body size.
- Give attribution a specific source: a person and the date, a publication and its link.
- Leave 2 to 3 times the line height of space above and below.
- Mark up with `<figure>`, `<blockquote>` and `<figcaption>`.

## Don't

- Do not set the quote in italics with a thick colored bar on the left (AC-10). A side-accent border is a weak habit.
- Do not switch a single word of the quote to another font, italic or color to make it "pop" (TYP-03).
- Do not use a gradient text fill.
- Do not stack the quote in a rounded card with a shadow and an avatar disc.
- Do not center a four-line quote. Centered paragraphs are hard to read.
- Do not use a quote you made up or reworded.

## Swap recipe

Slop version: italic fragment, left bar, emphasized word.

```css
/* before: AC-10, TYP-03 */
.quote {
  border-left: 4px solid #8b5cf6;
  padding-left: 24px;
  font-style: italic;
  background: rgba(139, 92, 246, 0.06);
  border-radius: 8px;
}
.quote em { font-family: 'Instrument Serif'; color: #8b5cf6; }
```

Fixed version: one typeface, hanging mark, attribution line.

```tsx
export function PullQuote() {
  return (
    <figure className="relative mx-auto my-16 max-w-[720px] px-6">
      <span aria-hidden className="absolute -left-1 -top-6 text-[72px] leading-none text-text-subtle md:-left-10">“</span>
      <blockquote className="m-0 text-h2 md:text-h1 font-medium leading-[1.3] text-text">
        We stopped guessing which pages mattered. The list told us on Monday and we fixed them by Friday.
      </blockquote>
      <figcaption className="mt-6 text-body text-text-muted">
        <span className="text-text">Dana Okafor</span>, head of content at Fabrikam, September 2026
      </figcaption>
    </figure>
  )
}
```

Replace the sample line, name and company with a real, approved quote. Remove the bar, the tint and the italic; the only emphasis left is size and space.

## Tokens

- Type: quote `--t-h2` (24px) on mobile and `--t-h1` (30px) on desktop at `--w-med`, `--lh-snug`; attribution `--t-body` in `--text-muted` with the name in `--text`.
- Mark: `--text-subtle`, 72px in the same font.
- Space: figure margin `--sp-16`, quote to attribution `--sp-6`, container padding `--sp-6`.
- Surface: `--bg`. Optional dot texture at 4% alpha of `--text`.
- Motion: none.
