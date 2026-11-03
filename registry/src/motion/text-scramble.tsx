import * as React from 'react'
import { cn } from '../blocks/_cn'
import { useReducedMotion } from './_motion'

// Text scramble: on hover or keyboard focus the letters shuffle, then settle left to right, and an
// underline draws in.
// Source: the "Text Scramble" pattern from motion-primitives by ibelick
// (https://motion-primitives.com/docs/text-scramble, MIT), as pasted through 21st.dev.
// Changes: the monospace face, wide tracking and forced capitals of the original are gone (sans with
// tabular figures keeps the width steady), the hover glow is gone, keyboard focus on the link or button
// that holds it triggers it too (the text itself is not a tab stop), reduced motion only draws the
// underline, and screen readers always get the real text.
// Upstream license: MIT, Copyright (c) 2024 ibelick. Full text in THIRD_PARTY_NOTICES.md.

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export interface TextScrambleProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  text: string
  /** Milliseconds between frames. */
  speed?: number
}

export function TextScramble({ text, speed = 30, className, onMouseEnter, onMouseLeave, ...props }: TextScrambleProps) {
  const reduced = useReducedMotion()
  const ref = React.useRef<HTMLSpanElement>(null)
  const [shown, setShown] = React.useState(text)
  const [active, setActive] = React.useState(false)
  const timer = React.useRef<number | null>(null)

  React.useEffect(() => setShown(text), [text])
  React.useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current)
  }, [])

  const run = React.useCallback(() => {
    if (reduced) return
    if (timer.current) window.clearInterval(timer.current)
    const total = text.length * 3
    let frame = 0
    timer.current = window.setInterval(() => {
      frame++
      const settled = Math.floor((frame / total) * text.length)
      setShown(
        [...text]
          .map((ch, i) => (ch === ' ' || i < settled ? ch : CHARS[Math.floor(Math.random() * CHARS.length)]))
          .join(''),
      )
      if (frame >= total) {
        if (timer.current) window.clearInterval(timer.current)
        timer.current = null
        setShown(text)
      }
    }, speed)
  }, [text, speed, reduced])

  const start = React.useCallback(() => {
    setActive(true)
    run()
  }, [run])
  const stop = () => setActive(false)

  // Keyboard focus on the link or button around the text replays it, as hover does.
  React.useEffect(() => {
    const host = ref.current?.closest<HTMLElement>('a[href],button,[tabindex]')
    if (!host) return
    const off = () => setActive(false)
    host.addEventListener('focus', start)
    host.addEventListener('blur', off)
    return () => {
      host.removeEventListener('focus', start)
      host.removeEventListener('blur', off)
    }
  }, [start])

  return (
    <span
      ref={ref}
      className={cn('relative inline-flex flex-col', className)}
      onMouseEnter={(e) => {
        start()
        onMouseEnter?.(e)
      }}
      onMouseLeave={(e) => {
        stop()
        onMouseLeave?.(e)
      }}
      {...props}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden className="tabular-nums">
        {shown}
      </span>
      <span aria-hidden className="relative mt-1 block h-px w-full overflow-hidden">
        <span className="absolute inset-0 bg-current opacity-20" />
        <span
          className="absolute inset-0 origin-left bg-current transition-transform duration-modal ease-out"
          style={{ transform: active ? 'scaleX(1)' : 'scaleX(0)' }}
        />
      </span>
    </span>
  )
}
