---
id: logo-draw-splash
name: Logo draw splash
category: loader-skeleton
uses: [show-progress, set-the-mood]
surfaces: [landing]
replaces: [MOT-01]
components: [motion/glass-logo-reveal]
inspiration: []
status: draft
---

## When to use

A brand-first site (a studio, a fashion label, a gallery) where the first impression is part of the product, and you want to cover the first paint with something that belongs to the brand rather than a spinner. Play it once per visitor, on the first visit to the site, and keep it under 2 seconds.

Do not use it on an app, on content sites people open from search results, or on any route after the first. A splash on every navigation is the entrance animation problem in its purest form.

## Anatomy

- A full-viewport layer in the page background color with the logo centered, 120 to 200px wide.
- The logo is an inline SVG with the strokes set to `fill: none`. Each path draws with `stroke-dasharray` and `stroke-dashoffset` from its own length to 0, staggered by 80 to 120ms, then the fill fades in.
- Total timeline: draw 900ms, hold 300ms, fade the whole layer out in 300ms. The page underneath is already rendered and interactive when the layer fades.
- A flag in `localStorage` (or a cookie) records that the splash has played. If the flag is set, the layer is never mounted.
- Skip conditions: `prefers-reduced-motion: reduce`, any non-home entry URL, bots, and a click or key press anywhere (skip immediately).
- No sound, no counter, no progress percent.

## Do

- Use the real logo geometry. Do not redraw or trace it by hand; convert the original outline to a stroke path.
- Compute each path length with `getTotalLength()` and set the dash values from that, so any logo works.
- Mount the layer in the initial HTML (server rendered) so there is no flash of the page before the splash.
- Trap nothing: no focus trap, the page is usable underneath after 1.2s at the latest.
- Remove the node from the DOM after the fade ends.

## Don't

- Don't replay it on every route change or on every reload.
- Don't hold it for the real load time. If the page needs three seconds, fix the page.
- Don't add particles, light rays, glow or a gradient wash behind the logo.
- Don't block interaction for the full animation.
- Don't use a splash on mobile web if it delays the first meaningful paint noticeably. Measure LCP with and without it.

## Swap recipe

Slop version (fixes MOT-01):

```tsx
// plays on every page, every time, blocks content, bouncy easing
<motion.div
  initial={{ opacity: 0, scale: 0.4 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 2.4, ease: [0.34, 1.9, 0.64, 1] }}
  className="fixed inset-0 grid place-items-center bg-gradient-to-br from-indigo-900 to-black"
>
  <Logo className="drop-shadow-[0_0_40px_rgba(168,85,247,0.8)]" />
</motion.div>
```

Fixed version:

```css
.splash { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center;
  background: var(--bg); animation: splash-out 300ms var(--ease-out) 1200ms forwards; }
.splash path { fill: none; stroke: var(--text); stroke-width: 1.5;
  stroke-dasharray: var(--len); stroke-dashoffset: var(--len);
  animation: draw 900ms var(--ease-in-out) calc(var(--i) * 100ms) forwards; }
@keyframes draw { to { stroke-dashoffset: 0; } }
@keyframes splash-out { to { opacity: 0; visibility: hidden; } }
@media (prefers-reduced-motion: reduce) { .splash { display: none; } }
```

```tsx
function Splash({ children }: { children: React.ReactNode }) {
  const [show, setShow] = React.useState(() => {
    try { return !localStorage.getItem('splash-seen') } catch { return false }
  })
  React.useEffect(() => {
    if (!show) return
    try { localStorage.setItem('splash-seen', '1') } catch {}
    const t = setTimeout(() => setShow(false), 1600)
    return () => clearTimeout(t)
  }, [show])
  return show ? <div className="splash" onClick={() => setShow(false)}>{children}</div> : null
}
```

## Tokens

- Surface: `--bg`. Stroke and final fill: `--text`.
- Type: none; the logo is the content. If a wordmark appears, use `--font` at its normal weight.
- Motion: draw uses `--ease-in-out` (move on screen), exit fade uses `--ease-out`. Total under 2 seconds; stagger near `--stagger-step` (50 to 120ms).
- Reduced motion: layer is not rendered.
- No glow, no gradient, no shadow.
