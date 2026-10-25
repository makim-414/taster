---
id: neutral-cta-band
name: Neutral call to action band
category: cta
uses: [ask-for-action]
surfaces: [landing]
replaces: [CMP-04, COL-01, COL-07]
components: [blocks/button]
inspiration: []
status: stable
---

## When to use

Use it at the point where a visitor has read enough to decide: after the proof and the pricing, at the end of the page, and once in the middle of a long page. It is a band, not a feature: one sentence, one primary action, at most one secondary.

Use two tones if you repeat it. The middle band is soft (same surface as the page, hairline top and bottom). The final band is strong (one step lighter or darker surface). Do not use more than two bands on a page.

## Anatomy

A full-width row inside the page container.

- Sentence: one line of 6 to 14 words at `--t-h2`, left aligned, saying what the visitor gets or what happens next ("Run your first report in two minutes").
- Primary button: solid, with a verb and an object. One per band.
- Secondary: a text link or an outline button for the lower-commitment path ("See a sample report"). Optional.
- Fine print: a single line of conditions in `--text-subtle` ("Free up to 200 lines. No card needed.") Only when it is true.

Layout: sentence left and buttons right on desktop (flex, `justify-between`, `align-items: center`); stacked on mobile with the buttons full width. The surface is flat: a fill from the surface scale and a 1px border, radius `--r-card`.

## Do

- Write the sentence from the visitor's side: what they do and what they get.
- Keep the label of the primary button identical to the page's hero button so the action is recognizable.
- Make the band's surface a step from the page (`--bg-elev` on `--bg`), not a brand color or a gradient.
- Put the fine print on one line and link terms if you name a condition.
- Leave empty space around the band: `--sp-16` above and below.
- For a dark page, keep the band dark with a lighter border; do not invert it to white.

## Don't

- Do not put a radial glow, spotlight or gradient box behind the text (CMP-04's "same soft shadow everywhere" family and COL-01).
- Do not use an indigo to violet gradient for the band or the button (COL-01).
- Do not give the button a large colored shadow halo (COL-07). A flat fill is enough, and the registry button has none.
- Do not give the band the same large radius and the same soft shadow as every card above it (CMP-04). Bands are wide and flat; use the card radius and no shadow.
- Do not add a third and fourth button, or a row of social proof inside the band.
- Do not write "Ready to transform your business?" Name the actual next step.

## Swap recipe

Slop version: glowing gradient box, centered, two equal buttons.

```css
/* before: COL-01, COL-07, CMP-04 */
.cta {
  border-radius: 32px;
  background: radial-gradient(60% 120% at 50% 0%, #8b5cf6 0%, #4f46e5 45%, transparent 100%), #0b0b14;
  box-shadow: 0 40px 120px rgba(139, 92, 246, .45);
  text-align: center;
  padding: 96px 24px;
}
.cta .btn { box-shadow: 0 0 40px rgba(139, 92, 246, .8); }
```

Fixed version: flat band, one primary, one text link.

```tsx
import { Button } from './blocks/button'

export function CtaBand() {
  return (
    <section className="mx-auto max-w-[1100px] px-6 py-16">
      <div className="flex flex-col gap-6 rounded-lg border border-border bg-bg-elev p-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-h2 font-semibold text-text">Run your first report in two minutes</h2>
          <p className="mt-2 text-label text-text-subtle">Free up to 200 lines. No card needed.</p>
        </div>
        <div className="flex items-center gap-4 max-md:flex-col max-md:items-stretch">
          <Button size="lg">Run a free report</Button>
          <a href="/sample" className="text-body text-text-muted hover:text-text">See a sample</a>
        </div>
      </div>
    </section>
  )
}
```

Delete the gradient, the `box-shadow` and the centered text. If it needs more presence, make the sentence larger or add vertical padding, not color.

## Tokens

- Surface: `--bg-elev` on `--bg`, border `--border`, radius `--r-card`. No shadow token.
- Type: sentence `--t-h2` (24px) at `--w-semi`; fine print `--t-sm` in `--text-subtle`; link `--t-body` in `--text-muted`.
- Button: solid uses `--accent` and `--accent-fg`; size `lg` is 44px high, above the touch target minimum.
- Space: band padding `--sp-8`, section padding `--sp-16`, gap `--sp-6`.
- Motion: button press only, `--dur-press` and `--press-scale`.
