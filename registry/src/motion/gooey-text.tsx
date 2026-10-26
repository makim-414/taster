import * as React from 'react'
import { cn } from '../blocks/_cn'
import { useReducedMotion } from './_motion'

// Gooey text: cycles through words, melting one into the next with an SVG threshold filter.
// Source: "Gooey Text Morphing" by Victor Welander on 21st.dev
// (https://21st.dev/@victorwelander/components/gooey-text-morphing).
// Changes: each instance gets its own filter id (two on one page no longer share a filter), the size
// comes from className instead of a fixed display size, the box reserves the longest word, text color
// is the --text token, reduced motion shows the first word still, and screen readers get the word list
// once instead of every frame.
// Upstream license: MIT as stated on the 21st.dev listing (no LICENSE file published),
// Copyright (c) Victor Welander. Full text in THIRD_PARTY_NOTICES.md.

export interface GooeyTextProps {
  texts: string[]
  /** Seconds one word takes to melt into the next. */
  morphTime?: number
  /** Seconds a word stays before the next melt. */
  cooldownTime?: number
  /** Wrapper classes. The wrapper takes the size of the longest word, so no height is needed. */
  className?: string
  /** Classes for the two word layers, for example a text size. */
  textClassName?: string
}

export function GooeyText({ texts, morphTime = 1, cooldownTime = 0.25, className, textClassName }: GooeyTextProps) {
  const filterId = `dsg-gooey-${React.useId().replace(/:/g, '')}`
  const reduced = useReducedMotion()
  const a = React.useRef<HTMLSpanElement>(null)
  const b = React.useRef<HTMLSpanElement>(null)

  React.useEffect(() => {
    const t1 = a.current
    const t2 = b.current
    if (!t1 || !t2 || !texts.length) return
    if (reduced) {
      t1.textContent = ''
      t2.textContent = texts[0]
      t1.style.filter = t2.style.filter = ''
      t1.style.opacity = '0%'
      t2.style.opacity = '100%'
      return
    }
    let index = texts.length - 1
    let last = performance.now()
    let morph = 0
    let cooldown = cooldownTime
    let raf = 0

    const setMorph = (fraction: number) => {
      t2.style.filter = `blur(${Math.min(8 / fraction - 8, 100)}px)`
      t2.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`
      const rest = 1 - fraction
      t1.style.filter = `blur(${Math.min(8 / rest - 8, 100)}px)`
      t1.style.opacity = `${Math.pow(rest, 0.4) * 100}%`
    }
    const settle = () => {
      morph = 0
      t2.style.filter = ''
      t2.style.opacity = '100%'
      t1.style.filter = ''
      t1.style.opacity = '0%'
    }
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const next = cooldown > 0
      const dt = (now - last) / 1000
      last = now
      cooldown -= dt
      if (cooldown <= 0) {
        if (next) {
          index = (index + 1) % texts.length
          t1.textContent = texts[index % texts.length]
          t2.textContent = texts[(index + 1) % texts.length]
        }
        morph -= cooldown
        cooldown = 0
        let fraction = morph / morphTime
        if (fraction > 1) {
          cooldown = cooldownTime
          fraction = 1
        }
        setMorph(fraction)
      } else {
        settle()
      }
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [texts, morphTime, cooldownTime, reduced])

  const layer = cn('absolute inline-block select-none text-center text-text', textClassName)
  const longest = texts.reduce((a, t) => (t.length > a.length ? t : a), '')
  return (
    <div className={cn('relative inline-block', className)} aria-label={texts.join(', ')} role="img">
      {/* Invisible sizer: reserves the width and height of the longest word. */}
      <span aria-hidden className={cn('invisible inline-block select-none', textClassName)}>
        {longest}
      </span>
      <svg className="absolute h-0 w-0" aria-hidden focusable="false">
        <defs>
          <filter id={filterId}>
            <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 255 -140" />
          </filter>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center" style={{ filter: `url(#${filterId})` }} aria-hidden>
        <span ref={a} className={layer} />
        <span ref={b} className={layer}>
          {texts[0]}
        </span>
      </div>
    </div>
  )
}
