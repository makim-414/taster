---
id: scroll-reveal-wrapper
name: Scroll reveal wrapper
category: motion-particle
uses: [set-the-mood]
surfaces: [landing]
replaces: [MOT-01]
components: []
inspiration: []
status: stable
---

## When to use

Use it sparingly, for two cases. First, a short fade-up on the first entry of a few key elements: the headline group of a long page, a figure that should land when you reach it. Second, a height-expanding reveal for a panel that opens on a click, such as a details row, a filter drawer or an "Show more" region.

Do not wrap every section in it. When every block enters the same way, the motion carries no meaning and the page feels slow (MOT-01). Motion should mark a change of state, not the act of scrolling.

## Anatomy

Two small pieces.

Entrance: a wrapper that renders its children normally, observes them with `IntersectionObserver` (threshold 0.15, root margin of `0px 0px -10% 0px`), and the first time they enter, sets `data-in="true"`. CSS moves them from `opacity: 0` and `translateY(var(--enter-offset))` to rest. It disconnects after the first entry. It never replays on scroll up.

Expansion: a grid wrapper with `grid-template-rows: 0fr` that goes to `1fr` when open, with the inner element `overflow: hidden; min-height: 0`. This animates height without measuring it in JavaScript, and fades with opacity at the same time. `@starting-style` handles elements that are inserted already open.

Both are inert until JavaScript marks the document, so content is visible without scripts.

## Do

- Apply the entrance to at most one element per screen, and different elements should not all share the same offset or order.
- Keep the offset small, `--enter-offset` (8px), and the duration short, `--dur-dropdown` (200ms) with `--ease-out`. A reveal that takes 600ms is a delay, not a flourish.
- Stagger only within one group, using `--stagger-step`, and cap at four items.
- Use `grid-template-rows` for expansion. Do not animate `height: auto` or use `max-height` hacks.
- Hide only with a `.js` class on `<html>` so the page is readable without scripts and for crawlers.
- Under `prefers-reduced-motion`, drop the translate and keep, at most, a quick opacity change. The tokens already set `--enter-offset: 0px` and durations to 1ms.
- Test the page with the observer disabled. Everything must still be present and legible.

## Don't

- Do not fade up every section, every card and every paragraph (MOT-01).
- Do not use a spring that overshoots, or `cubic-bezier` values above 1. The block should stop where it stops.
- Do not animate things above the fold on load. The first screen should be there when the page is.
- Do not replay on every scroll pass, or animate when scrolling back up.
- Do not use `data-aos` style libraries for a page with three reveals.
- Do not delay content: no waiting for the animation before text becomes selectable or focusable.

## Swap recipe

The slop version applies one reveal class to everything, with a bounce.

```html
<!-- before: every block, same fade-up, overshoot easing (MOT-01) -->
<section class="reveal" data-aos="fade-up"><h2>Features</h2></section>
<div class="reveal" data-aos="fade-up" data-aos-delay="100">...</div>
<div class="reveal" data-aos="fade-up" data-aos-delay="200">...</div>
```

```css
/* before */
.reveal { opacity: 0; transform: translateY(40px); transition: all .9s cubic-bezier(.34, 1.56, .64, 1); }
.reveal.in { opacity: 1; transform: none; }
```

```tsx
// after: one wrapper, used on one or two elements, plays once
export function Reveal({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const el = ref.current!
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.dataset.in = 'true'; io.disconnect() }
    }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return <div ref={ref} className="reveal">{children}</div>
}
```

```css
/* after: tokens only, hidden only when scripts run */
.js .reveal:not([data-in]) { opacity: 0; transform: translateY(var(--enter-offset)); }
.reveal { transition: opacity var(--dur-dropdown) var(--ease-out), transform var(--dur-dropdown) var(--ease-out); }

.expand { display: grid; grid-template-rows: 0fr; opacity: 0;
  transition: grid-template-rows var(--dur-dropdown) var(--ease-out), opacity var(--dur-dropdown) var(--ease-out); }
.expand[data-open="true"] { grid-template-rows: 1fr; opacity: 1; }
.expand > .expand-inner { overflow: hidden; min-height: 0; }
@starting-style { .expand[data-open="true"] { grid-template-rows: 0fr; opacity: 0; } }
```

## Tokens

- Offset: `--enter-offset` (8px, 0 under reduced motion). Scale entrances use `--enter-scale` if needed.
- Timing: `--dur-dropdown` for reveals and expansions, `--ease-out`. Use `--stagger-step` for gaps inside one group, capped at four items.
- For panels sliding in from an edge, `--dur-modal` with `--ease-drawer`.
- Reduced motion: the `:root` media block in `tokens.css` handles it. If you hand-write a transition, wrap it in `@media (prefers-reduced-motion: no-preference)`.
- Never inline `cubic-bezier` numbers in components, reference the tokens.
