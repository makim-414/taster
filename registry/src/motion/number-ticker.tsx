import * as React from 'react'
import { cn } from '../blocks/_cn'
import { useInViewOnce, useReducedMotion } from './_motion'

// Number ticker: counts from a start value to the target once, when the number scrolls into view.
// Source: the Magic UI "Number Ticker" pattern (https://magicui.design/docs/components/number-ticker, MIT).
// Changes: the spring from motion/react became a requestAnimationFrame ease-out with no overshoot and no
// dependency; the final value sits in an invisible sizing layer in the same grid cell, so the width is
// reserved from the first frame and nothing reflows; screen readers and the server HTML get the final
// value only; reduced motion shows it at once; digits keep tabular figures. See patterns/count-up-number.
// Use it for one figure in view at a time, not a row of them.

export interface NumberTickerProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  value: number
  startValue?: number
  /** 'down' counts from value to startValue. */
  direction?: 'up' | 'down'
  /** Seconds to wait after the number comes into view. */
  delay?: number
  /** Seconds the count takes, 0.8 to 1.4 reads best. */
  duration?: number
  decimalPlaces?: number
  /** Intl locale for grouping and decimals. */
  locale?: string
}

export function NumberTicker({
  value,
  startValue = 0,
  direction = 'up',
  delay = 0,
  duration = 1.2,
  decimalPlaces = 0,
  locale = 'en-US',
  className,
  ...props
}: NumberTickerProps) {
  const wrap = React.useRef<HTMLSpanElement>(null)
  const live = React.useRef<HTMLSpanElement>(null)
  const inView = useInViewOnce(wrap, '0px', 0.4)
  const reduced = useReducedMotion()
  const from = direction === 'down' ? value : startValue
  const to = direction === 'down' ? startValue : value

  const format = React.useMemo(() => {
    const f = new Intl.NumberFormat(locale, { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces })
    return (n: number) => f.format(Number(n.toFixed(decimalPlaces)))
  }, [locale, decimalPlaces])
  const final = format(to)
  const widest = format(Math.abs(from) > Math.abs(to) ? from : to)

  React.useEffect(() => {
    const el = live.current
    if (!el || !inView) return
    if (reduced) {
      el.textContent = final
      return
    }
    el.textContent = format(from)
    let raf = 0
    let start = 0
    const timer = window.setTimeout(() => {
      const step = (t: number) => {
        if (!start) start = t
        const p = Math.min((t - start) / (duration * 1000), 1)
        el.textContent = p < 1 ? format(from + (to - from) * (1 - Math.pow(1 - p, 4))) : final
        if (p < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }, delay * 1000)
    return () => {
      window.clearTimeout(timer)
      cancelAnimationFrame(raf)
    }
  }, [inView, reduced, from, to, delay, duration, format, final])

  return (
    <span ref={wrap} className={cn('inline-grid tabular-nums', className)} aria-label={final} {...props}>
      <span aria-hidden className="invisible [grid-area:1/1]">
        {widest}
      </span>
      <span ref={live} aria-hidden className="[grid-area:1/1]">
        {final}
      </span>
    </span>
  )
}
