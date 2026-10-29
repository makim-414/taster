---
id: ambient-background
name: Ambient background
category: motion-particle
uses: [set-the-mood]
surfaces: [landing, auth-onboarding]
replaces: [BG-01, COL-01, COL-03]
components: [motion/mesh-drift]
inspiration: [https://blog.maximeheckel.co/posts/the-magical-world-of-particles-with-react-three-fiber-and-shaders/]
status: stable
---

## When to use

Use it behind a hero or a sign-in screen when the page needs a presence but the content is thin: a few lines of text, one form. The background sets a tone (calm, technical, precise) without carrying information.

Do not use it behind dense text, tables or forms with many fields. Do not use it on a page whose job is to be scanned quickly. If the screen is already full, leave the space empty (BG-01).

## Anatomy

Two honest options, both neutral in color.

A point field: a few hundred to a few thousand points drawn on a `<canvas>`, drifting very slowly, optionally gathering into a shape (a ring, a wave, a sphere) over ten seconds or more. Points are 1 to 1.5px, one gray, 25 to 45 percent opacity. For large counts, a GPU version simulates positions in a texture; for under about 2,000 points, 2D canvas is enough and has no dependencies.

A line field: thin lines displaced by noise, drawn in `--border` color on a calm surface, moving only a few pixels.

Both sit in an absolutely positioned layer with `pointer-events: none`, `aria-hidden="true"`, and a solid `--bg` behind them. Foreground text is above at full contrast. A static first frame is drawn before anything animates.

## Do

- Pick a single neutral color from the tokens. Let lightness, not hue, carry depth.
- Cap the device pixel ratio at 2 and the point count by screen area, fewer on phones.
- Pause the loop when the canvas is off screen (`IntersectionObserver`) and when the tab is hidden (`document.hidden`).
- Draw one still frame and stop when `prefers-reduced-motion: reduce` is set.
- Keep the movement slower than reading speed. If you notice it, it is too fast.
- Check text contrast against the brightest area of the field, not the average.
- Provide a CSS fallback: plain `--bg`. The page must look finished without the canvas.

## Don't

- Do not add blurred purple or teal orbs behind the hero (BG-01, COL-01).
- Do not use a near-black page with a single neon accent that glows (COL-03).
- Do not follow the cursor with the whole field. A small parallax at most.
- Do not run a full-screen shader at 60fps on a login page that someone passes through in ten seconds.
- Do not use colored points that cycle hue.
- Do not put it under a form field area. Form legibility wins.

## Swap recipe

The slop version is a pile of blurred blobs with a glow.

```html
<!-- before: aurora blobs, neon accent, always animating (BG-01, COL-01, COL-03) -->
<div class="absolute inset-0 -z-10 bg-[#0b0b0b]">
  <div class="absolute -left-20 top-0 h-[40rem] w-[40rem] animate-pulse rounded-full bg-violet-600/40 blur-[120px]"></div>
  <div class="absolute right-0 top-40 h-[32rem] w-[32rem] rounded-full bg-fuchsia-500/30 blur-[140px]"></div>
</div>
```

```tsx
// after: neutral point field, paused offscreen, still under reduced motion
export function PointField({ count = 900 }: { count?: number }) {
  const ref = React.useRef<HTMLCanvasElement>(null)
  React.useEffect(() => {
    const c = ref.current!
    const ctx = c.getContext('2d')!
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const pts = Array.from({ length: count }, () => ({ x: Math.random(), y: Math.random(), p: Math.random() * 6.28 }))
    let w = 0, h = 0, raf = 0, onScreen = true
    const size = () => { w = c.clientWidth; h = c.clientHeight; c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0) }
    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = getComputedStyle(c).color
      ctx.globalAlpha = 0.35
      for (const p of pts) ctx.fillRect((p.x + Math.sin(t / 9000 + p.p) * 0.01) * w, (p.y + Math.cos(t / 11000 + p.p) * 0.01) * h, 1.2, 1.2)
      if (!reduce && onScreen && !document.hidden) raf = requestAnimationFrame(draw)
    }
    const start = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw) }
    size(); draw(0)
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen && !reduce) start() })
    io.observe(c)
    document.addEventListener('visibilitychange', start)
    window.addEventListener('resize', size)
    return () => { cancelAnimationFrame(raf); io.disconnect(); document.removeEventListener('visibilitychange', start); window.removeEventListener('resize', size) }
  }, [count])
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full text-[var(--text-subtle)]" />
}
```

Place it as the first child of a `relative` section whose background is `var(--bg)`. For tens of thousands of points, use the GPU particle technique credited above and keep the same contract: neutral color, paused offscreen, one still frame under reduced motion.

## Tokens

- Surface: `--bg`. Point color: `currentColor` set from `--text-subtle`, opacity 0.35. Lines: `--border`.
- If you need a second tone, use `--chart-4` or `--chart-5`, which are gray steps.
- Duration of any shape transition is a per-component property, for example `--field-morph: 12s`. The shared `--dur-*` tokens stop at 400ms, so do not reuse them for ambient loops.
- Reduced motion: draw once and stop. No `--ease-*` tokens apply because there is no easing.
- Contrast: foreground text `--text` on `--bg`, check at least 4.5:1 against the brightest dot cluster.
