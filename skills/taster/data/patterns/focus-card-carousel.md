---
id: focus-card-carousel
name: Focus card carousel
category: media-gallery
uses: [browse-media, explain-features]
surfaces: [landing]
replaces: [LAY-02]
components: [blocks/card, blocks/coverflow-carousel]
inspiration: [https://21st.dev/@cult-ui/components/feature-carousel, https://21st.dev/@aayush-duhan/components/card-fan-carousel]
status: draft
---

## When to use

Use it when you have four to eight things that are each a real picture or screen, and the reader needs to look at one at a time while knowing there are more. Product screens, case studies with a lead image, chapters of a walkthrough. The focused card is the content, its neighbors say "more here".

Do not use it to hold three icon cards that could sit in a row. If every card is an icon, a heading and two lines, the fix is a different format (a list or a table), not a carousel (LAY-02). Do not hide the only copy that explains the product inside slides nobody advances.

## Anatomy

A track of cards in a `role="group"` with `aria-roledescription="carousel"`. One card is active: full size, full opacity, in the center. The two neighbors are scaled to about 0.88, dimmed with opacity, and partially overlapped. Cards two steps away are hidden or reduced to slivers.

Controls are two 44px buttons, left and right, outside the cards, plus a position readout such as "3 of 6" for assistive tech and sighted users alike. Optionally a row of small step marks underneath.

Each card has a real image or screenshot on top, a one-line title and one sentence below. Clicking a neighbor makes it active. The arc variant lays the cards along a shallow circle with `translate` and `rotate`; the center variant is the same idea on a straight line.

## Do

- Drive position from one number, the active index. Derive every card's `translateX`, `scale` and `opacity` from `offset = i - active`.
- Support arrow keys when the carousel has focus, swipe on touch, and click on a neighbor.
- Show a visible position, "3 of 6", and give each slide `aria-label="3 of 6"`.
- Keep the active card's text readable at rest. Move only the transform and opacity, never the layout.
- Pause any autoplay on hover, focus and when the tab is hidden. Better, skip autoplay.
- Put a real screenshot in each card. A carousel of empty gradients is a gradient gallery.

## Don't

- Do not make three equal cards with an icon, a heading and a paragraph and call it a carousel (LAY-02).
- Do not use a 3D flip, a card fan with rotation beyond about 8 degrees, or a perspective tilt on every hover. It reads as a template.
- Do not add a radial glow behind the active card (COL-07, BG-01).
- Do not loop forever on a timer with no way to stop it. That fails WCAG 2.2.2.
- Do not use a bouncy spring that overshoots the final position (MOT-01).
- Do not use it on a phone with the neighbors visible at 0.88 and no room. On narrow screens show the active card and a peek of the next at 12 percent.

## Swap recipe

The slop version is three identical cards with icons, which may also have a decorative glow.

```html
<!-- before: three equal icon cards, glow behind them -->
<section class="relative">
  <div class="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-500/30 blur-3xl"></div>
  <div class="relative grid grid-cols-3 gap-6">
    <div class="rounded-2xl bg-white/5 p-6"><svg class="h-8 w-8 text-violet-400" /><h3>Fast</h3><p>Two lines of filler.</p></div>
    <div class="rounded-2xl bg-white/5 p-6"><svg class="h-8 w-8 text-violet-400" /><h3>Secure</h3><p>Two lines of filler.</p></div>
    <div class="rounded-2xl bg-white/5 p-6"><svg class="h-8 w-8 text-violet-400" /><h3>Simple</h3><p>Two lines of filler.</p></div>
  </div>
</section>
```

```tsx
// after: one active card, neighbors recede, all driven by the active index
export function FocusCarousel({ slides }: { slides: { src: string; title: string; text: string }[] }) {
  const [active, setActive] = React.useState(0)
  const go = (n: number) => setActive(Math.min(slides.length - 1, Math.max(0, n)))
  return (
    <div
      role="group" aria-roledescription="carousel" aria-label="Product screens" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'ArrowRight') go(active + 1); if (e.key === 'ArrowLeft') go(active - 1) }}
      className="relative mx-auto flex h-[420px] max-w-5xl items-center justify-center overflow-hidden"
    >
      {slides.map((s, i) => {
        const o = i - active
        if (Math.abs(o) > 2) return null
        return (
          <figure
            key={s.title} aria-label={`${i + 1} of ${slides.length}`} onClick={() => go(i)}
            className="absolute w-[56%] overflow-hidden rounded-[var(--r-card)] border border-[var(--border)] bg-[var(--bg-elev)] transition-[transform,opacity] duration-[var(--dur-modal)] ease-[var(--ease-out)]"
            style={{ transform: `translateX(${o * 62}%) scale(${o === 0 ? 1 : 0.88})`, opacity: o === 0 ? 1 : 0.45, zIndex: 10 - Math.abs(o) }}
          >
            <img src={s.src} alt="" className="aspect-video w-full object-cover" />
            <figcaption className="p-[var(--sp-4)]"><b className="text-[length:var(--t-title)]">{s.title}</b><p className="text-[var(--text-muted)]">{s.text}</p></figcaption>
          </figure>
        )
      })}
    </div>
  )
}
```

Add the two 44px arrow buttons and the "3 of 6" readout outside the track. Under `prefers-reduced-motion`, the token durations collapse to 1ms, so the jump becomes a cut.

## Tokens

- Card: `--bg-elev` fill, `--border` hairline, `--r-card` radius, no shadow beyond `--sh-card`.
- Neighbor state: opacity 0.45, scale 0.88. These two numbers are the whole effect, keep them in one place.
- Motion: `--dur-modal` with `--ease-out` for position changes, since a card moves a long way. Avoid `--ease-in-out` bounces. Use `--dur-press` for the arrow buttons.
- Controls: `--r-pill` buttons, 44px target, `--text` icon on `--bg-elev`.
- Text: title `--t-title`, body `--t-body`, readout `--t-sm` with `tabular-nums`.
