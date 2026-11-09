---
id: scroll-driven-product-hero
name: Scroll-driven product hero
category: hero
uses: [introduce-the-product, show-when-things-happen]
surfaces: [landing]
replaces: [BG-01, MOT-01]
components: []
inspiration: [https://21st.dev/@ruixen.ui/components/tilted-grid-hero, https://21st.dev/@ruixen.ui/components/phone-scroll-hero]
status: draft
---

## When to use

Use it when the product has a sequence that is easier to see than to read: a device that unfolds to reveal the app, rows of screens that slide as you scroll, a word that changes with each stage of a process. The scroll gesture is the explanation. One idea, shown once.

Skip it when the motion would only decorate. If removing the animation changes nothing a visitor learns, you do not need it. Also skip it when most of your traffic is on slow phones; the static fallback below becomes the whole hero.

## Anatomy

A tall wrapper (about 200 to 300vh) containing a sticky stage that stays pinned while scroll progress `p` runs from 0 to 1.

- Sticky stage: `position: sticky; top: 0; height: 100vh`.
- Text block: the lockup, which stays put or fades out by `p = 0.3`.
- Moving part: one object whose transform is a function of `p`. Examples: a device rotating from 25 degrees to 0, two rows of screenshots translating in opposite directions by up to 12% of width, or a headline word cycling through three values at fixed `p` thresholds.
- End state: the object lands in a readable resting position and the page scrolls on normally.

Drive `p` from `IntersectionObserver` plus `requestAnimationFrame`, or the CSS `animation-timeline: scroll()` where supported. Write transforms as `transform` and `opacity` only.

## Do

- Move one thing, and make that thing the product.
- Define the resting frame first (p = 1) and design it as a static hero that works alone. Animate toward it.
- Use real screenshots on the moving part. Motion over a drawn mockup is still a mockup.
- Keep total travel short. The hero should resolve within two screens of scroll.
- Provide the static version under `prefers-reduced-motion: reduce` and on viewports under 768px: no pinning, the resting frame only.
- Keep the ease on scroll linear to scroll position. Easing a scroll-linked value feels like lag.

## Don't

- Do not add an aurora, mesh or blurred color blob behind the moving object (BG-01).
- Do not make every block below the hero fade up from 24px as well (MOT-01). One scroll story per page.
- Do not hijack the scroll wheel or change scroll speed.
- Do not hide the call to action until the animation ends. The button is visible from p = 0.
- Do not animate layout properties such as `width`, `top` or `margin`. They cause jank.
- Do not loop. The motion plays with the scroll and stops.

## Swap recipe

Slop version: every element reveals with the same entrance, over a glowing blob.

```css
/* before: BG-01, MOT-01 */
.hero::before { content:""; position:absolute; width:60vw; height:60vw; filter:blur(120px);
  background: radial-gradient(circle, #8b5cf6, transparent 70%); }
.reveal { opacity:0; transform: translateY(32px); transition: all .8s cubic-bezier(.34,1.56,.64,1); }
.reveal.in { opacity:1; transform:none; }
```

Fixed version: one sticky stage, one scroll-linked transform, no blob.

```tsx
function ScrollHero() {
  const ref = React.useRef<HTMLDivElement>(null)
  const [p, setP] = React.useState(0)
  React.useEffect(() => {
    const el = ref.current!
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const t = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)))
        setP(t)
      })
    }
    addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => removeEventListener('scroll', onScroll)
  }, [])
  return (
    <div ref={ref} className="relative h-[240vh] max-md:h-auto">
      <div className="sticky top-0 grid h-screen place-items-center max-md:static max-md:h-auto max-md:py-16">
        <img
          src="/shots/app.png" alt="The app on a phone"
          style={{ transform: `perspective(1200px) rotateX(${(1 - p) * 25}deg) scale(${0.9 + p * 0.1})` }}
          className="w-[min(90vw,420px)] rounded-xl border border-border motion-reduce:!transform-none"
        />
      </div>
    </div>
  )
}
```

The blob and the global `.reveal` class are deleted. Only `transform` changes, and the reduced-motion and mobile paths render the resting frame.

## Tokens

- Motion: scroll-linked values are not eased, so no `--ease-*` token applies to the moving part. Use `--ease-out` and `--dur-modal` only for any opacity fade of the text block.
- Reduced motion: the tokens zero out `--enter-offset` and `--press-scale` under `prefers-reduced-motion`; also disable the pinned stage itself.
- Surface: moving frame uses `--border` and `--r-xl`. No `--sh-pop`; a floating shadow under a rotating device reads as a render, not a product.
- Space: wrapper height is the only layout number; `240vh` is a good start, tune by feel.
- Color: `--bg` behind the stage. Anything tinted comes from the screenshot, not from CSS.
