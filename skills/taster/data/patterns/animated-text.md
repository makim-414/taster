---
id: animated-text
name: Animated text
category: typography
uses: [emphasize-text]
surfaces: [landing]
replaces: [COL-04, MOT-01, TYP-03]
components: []
inspiration: [https://21st.dev/@dillionverma/components/text-reveal, https://21st.dev/@kapishdima/components/marker-highlight]
status: draft
---

## When to use

Use text motion once per page, on the one line that benefits from it. Three effects hold up: words firming up from muted to full contrast as the reader scrolls through a statement; one word in a headline cycling through a short list; and a tagline typing out a single time. Each has a job: pacing the reading, showing range, or marking a live product.

Do not use it on body copy, on every section heading, or on a page where the same reveal runs on every block. A different effect per heading is the clearest sign of effect shopping.

## Anatomy

- Scroll reveal: a statement split into words; each word's opacity moves from 0.2 to 1 as it passes a trigger band, driven by scroll position, not by timers.
- Word cycle: a fixed-width slot holding the current word, replaced by a vertical slide of 8px with opacity, every 2 to 3 seconds, 3 to 5 words total.
- Typewriter: types once, holds, and does not loop. A line caret blinks while typing and then rests.
- Static twin: the final text is present in the DOM from the start, so search, screen readers and no-JS users see it.
- Reduced motion: under `prefers-reduced-motion`, show the final state with no animation.

## Do

- Keep the effect on a single element and choose the effect from the content: reading pace, range of use, or liveness.
- Reserve the width of the longest cycling word to avoid layout shift.
- Use `--ease-out` and durations from the motion tokens, with a stagger of `--stagger-step` between words.
- Provide the full text in an `aria-label` or visually hidden span, and mark the animated copy `aria-hidden`.
- Test with the animation off. If the headline fails without it, the animation was carrying meaning it should not.

## Don't

- Do not fill text with an animated gradient (COL-04).
- Do not run a fade-and-rise entrance on every heading and card as the page scrolls (MOT-01).
- Do not switch one word to another font or color to mark it as special (TYP-03). A word cycle keeps the same face and color.
- Do not scramble, glitch or shimmer text the reader needs to read quickly, such as prices.
- Do not loop a typewriter forever.

## Swap recipe

Slop: every heading reveals the same way, with a gradient on top.

```css
/* before: MOT-01, COL-04 */
h2, .card, p { opacity: 0; transform: translateY(24px); animation: rise 0.8s cubic-bezier(.34,1.56,.64,1) forwards; }
h1 span { background: linear-gradient(90deg, #f0abfc, #818cf8); -webkit-background-clip: text; color: transparent; }
```

Fixed: no entrance on general content, one scroll-linked statement.

```css
/* after */
.statement .w { opacity: 0.2; transition: opacity var(--dur-dropdown) var(--ease-out); }
.statement .w[data-on="true"] { opacity: 1; }
@media (prefers-reduced-motion: reduce) { .statement .w { opacity: 1; transition: none; } }
```

```tsx
// words light up from muted to full as they cross the middle of the viewport
const words = text.split(' ')
<p className="statement text-h2 text-text" aria-label={text}>
  {words.map((w, i) => <span key={i} className="w" aria-hidden="true" data-on={progress * words.length > i}>{w} </span>)}
</p>
```

## Tokens

`--dur-dropdown` (200ms), `--ease-out`, `--stagger-step` (50ms, 0 under reduced motion), `--text`, `--text-subtle`, `--t-h2`, `--enter-offset` (8px, 0 under reduced motion). The reduced-motion block in `tokens.css` already zeroes the offsets and stagger, so reading the tokens is enough to be compliant.
