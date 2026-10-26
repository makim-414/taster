---
id: marquee-band
name: Marquee band
category: motion-particle
uses: [set-the-mood, prove-trust]
surfaces: [landing]
replaces: []
components: [motion/marquee]
inspiration: [https://magicui.design/docs/components/marquee]
status: stable
---

## When to use

Use it for a short row of items that are the same kind and equally important: customer logos you have permission to show, press names, supported integrations, a ticker of real recent events. The motion says "there are more than fit", and saves you from a static wall.

Do not use it for anything the reader must read (prices, terms, instructions). Moving text cannot be studied. Do not use it for fewer than six items; a static row is better.

## Anatomy

A clipping container with `overflow: hidden`. Inside, a track holding the items, rendered twice so the loop closes with no jump. The track is animated with `transform: translateX(-100%)` over a linear timing, `infinite`. The second copy is `aria-hidden="true"` and its links are removed from the tab order (`inert`).

Items have a uniform height (32 to 40px) and consistent spacing, with the gap included in the track padding so the seam is invisible. Edges can fade out with a CSS mask on the container.

Controls: hover and focus-within pause the motion. A visible pause button is present when the band runs longer than five seconds, which is the rule for any automatic movement.

## Do

- Use `animation: marquee var(--marquee-duration) linear infinite`, and set the duration from the width: about 40 pixels per second reads comfortably.
- Pause on `:hover` and `:focus-within` via `animation-play-state: paused`.
- Under `prefers-reduced-motion: reduce`, stop the animation and let the band scroll horizontally by hand, or wrap into a static grid.
- Keep the second copy out of the accessibility tree with `aria-hidden` and `inert`.
- Use real logos with permission. If you do not have permission, show names in text.
- Render at least two full viewport widths of content in each copy, repeating the items if needed.
- Keep the vertical rhythm: the band sits on a hairline top and bottom, not in a card.

## Don't

- Do not scroll invented client logos (CMP-08).
- Do not fade the edges with a colored gradient overlay. A mask on the container works on any background and adds no color.
- Do not use two bands moving in opposite directions as decoration.
- Do not animate with `left` or `margin`. Use `transform`.
- Do not start faster than about 60 pixels per second, nor slower than 20.
- Do not mix the band with a counter strip of big numbers (CMP-06).

## Swap recipe

The slop version is a logo strip of made-up names with a heavy gradient fade, no pause and no reduced-motion case.

```html
<!-- before: invented logos, one copy, JS-driven scroll, no pause -->
<div class="relative overflow-hidden bg-gradient-to-r from-black via-transparent to-black">
  <div id="strip" class="flex gap-12" style="animation: scroll 6s linear infinite">
    <span>Acme</span><span>Globex</span><span>Initech</span>
  </div>
</div>
```

```tsx
// after: two copies, pause on hover and focus, reduced motion falls back to manual scroll
export function MarqueeBand({ children, seconds = 30 }: { children: React.ReactNode; seconds?: number }) {
  return (
    <div className="marquee" style={{ ['--marquee-duration' as string]: `${seconds}s` }}>
      <div className="marquee-track">{children}</div>
      <div className="marquee-track" aria-hidden="true" {...({ inert: '' } as object)}>{children}</div>
    </div>
  )
}
```

```css
.marquee {
  display: flex; overflow: hidden;
  border-block: 1px solid var(--border-soft);
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
}
.marquee-track {
  display: flex; flex: none; align-items: center; gap: var(--sp-8); padding-right: var(--sp-8);
  animation: marquee var(--marquee-duration, 30s) linear infinite;
}
.marquee:hover .marquee-track, .marquee:focus-within .marquee-track { animation-play-state: paused; }
@keyframes marquee { to { transform: translateX(-100%); } }
@media (prefers-reduced-motion: reduce) {
  .marquee { overflow-x: auto; -webkit-mask-image: none; mask-image: none; }
  .marquee-track { animation: none; }
  .marquee-track[aria-hidden="true"] { display: none; }
}
```

## Tokens

- Spacing: item gap `--sp-8`, band padding `--sp-4` top and bottom, hairlines `--border-soft`.
- Items: logos at `--text-muted` opacity, hover to `--text` over `--dur-press`. Text items in `--t-body`.
- Speed is a local variable, `--marquee-duration`, because the motion tokens are for UI transitions under 400ms and this runs for tens of seconds.
- Edge fade is a mask, not a colored gradient, so it works on any `--bg`.
- Reduced motion: no animation, manual horizontal scroll. The second track is hidden entirely.
