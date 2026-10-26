---
id: count-up-number
name: Count-up number
category: motion-particle
uses: [show-one-number]
surfaces: [landing, dashboard]
replaces: [MOT-01]
components: [blocks/kpi]
inspiration: [https://magicui.design/docs/components/number-ticker]
status: stable
---

## When to use

Use it for one headline figure that earns a moment: the main result on a report, the total on a summary screen, a metric on a landing page that you can source. The figure rolls to its value once when it comes into view, which tells the reader "this is computed" and draws the eye to it.

Do not use it for a row of numbers that all animate together (MOT-01, and often CMP-06). Do not use it on a table or live dashboard that updates every few seconds, where it becomes noise. Do not use it for numbers people compare across a page; they need to stay still.

## Anatomy

A single `<span>` pair in a stacked grid cell:

- A sizing layer: the final formatted value, rendered invisibly (`visibility: hidden`), so the container takes its final width from the first frame.
- A visible layer: the animated value, `aria-hidden="true"`, in the same grid cell, `tabular-nums` so digits do not shift.

Assistive technology gets the end value only, either from the sizing layer made available through `.sr-only` text or from an `aria-label` on the wrapper. It never hears the intermediate steps.

An `IntersectionObserver` starts the animation once, at roughly 40 percent visibility. Duration is 800 to 1400ms with an ease-out curve. The final value is set exactly at the end, so rounding cannot leave 99.8 instead of 100.

## Do

- Reserve the final width by rendering the end value in the sizing layer. The layout must not move.
- Format with `Intl.NumberFormat` using the same options for the sizing and the animated layers.
- Animate once per page view. Do not replay on scroll or on re-render.
- Under `prefers-reduced-motion: reduce`, render the final value immediately.
- Use `tabular-nums` on the number and a fixed decimals count while counting.
- Count from a sensible start, 0 for a total, not from 0 for a percentage that lives near 98.
- Pair the number with its label, period and source, as `blocks/kpi` does. The motion is not the message.

## Don't

- Do not animate more than one number in view at a time.
- Do not use a bouncy spring that overshoots the target, so a "100" is briefly "104" (MOT-01).
- Do not count up a figure you cannot source. A moving fake is still fake (CMP-06).
- Do not use scroll-linked counting where the number follows the scrollbar.
- Do not wrap the number in a glow, gradient fill or a color flash (COL-04, COL-07).
- Do not let the number reflow its parent while it counts. If you see layout shift, the width was not reserved.

## Swap recipe

The slop version counts three numbers from zero with a spring, each in a glowing tile, with the number width changing as it counts.

```html
<!-- before: three animated tiles, gradient text, glow, width jumps -->
<div class="grid grid-cols-3 gap-6">
  <div class="rounded-2xl bg-white/5 p-8 shadow-[0_0_40px_rgba(139,92,246,.35)]">
    <b class="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-6xl text-transparent" data-count="10000">0</b>+
  </div>
  <!-- two more, all start together -->
</div>
```

```tsx
// after: one number, reserved width (pass a stable `format` object, define it outside the component), screen reader gets the end value, no motion for reduced-motion users
export function CountUp({ value, duration = 1100, format }: { value: number; duration?: number; format?: Intl.NumberFormatOptions }) {
  const fmt = React.useMemo(() => new Intl.NumberFormat('en-US', format), [format])
  const wrap = React.useRef<HTMLSpanElement>(null)
  const live = React.useRef<HTMLSpanElement>(null)
  React.useEffect(() => {
    const out = live.current!
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { out.textContent = fmt.format(value); return }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const t0 = performance.now()
      const tick = (t: number) => {
        const p = Math.min((t - t0) / duration, 1)
        const eased = 1 - Math.pow(1 - p, 3)
        out.textContent = fmt.format(p === 1 ? value : value * eased)
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.4 })
    io.observe(wrap.current!)
    return () => io.disconnect()
  }, [value, duration, fmt])
  return (
    <span ref={wrap} className="inline-grid tabular-nums">
      <span className="sr-only">{fmt.format(value)}</span>
      <span className="invisible col-start-1 row-start-1" aria-hidden>{fmt.format(value)}</span>
      <span ref={live} className="col-start-1 row-start-1" aria-hidden>{fmt.format(0)}</span>
    </span>
  )
}
```

Use it inside a stat tile. The registry `Stat` types `value` as `string | number`, so widen that prop to `React.ReactNode` in your copy, then pass `<CountUp value={31.4} format={{ maximumFractionDigits: 1 }} />` and keep the label, delta and period around it.

## Tokens

- Number: `--t-h2` in a tile (as `blocks/kpi` does) or `--t-display` for a single hero figure, `--w-semi`, `tabular-nums`.
- Delta: `--delta-up` and `--delta-down` only on the delta, not the number.
- Duration is local (`--count-duration: 1100ms`) because it is longer than the UI tokens, which stop at 400ms. Easing is ease-out cubic, matching `--ease-out`.
- Reduced motion: skip the animation and write the final value. No fallback color or position changes are needed.
