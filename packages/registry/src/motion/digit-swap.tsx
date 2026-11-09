import * as React from 'react'
import { cn } from '../blocks/_cn'
import { useReducedMotion, useStyleOnce } from './_motion'

// Digit swap: a number or a masked value in fixed character slots. When a slot's character changes,
// the old glyph rolls out and the new one rolls in, staggered a few milliseconds per slot. Good for
// revealing a masked card number, a price that updates, a one-time code. Width never jumps.
// Source: "Number" (DigitSwap) from beUI (https://beui.dev/components/motion/number,
// https://github.com/starc007/ui-components) by Saurabh Chauhan.
// Changes: no motion dependency (CSS keyframes keyed per slot), easing is the --ease-out token,
// and reduced motion swaps with a short fade and no travel.
// Upstream license: MIT, Copyright (c) 2026 Saurabh Chauhan. Full text in THIRD_PARTY_NOTICES.md.
//
// For a count that climbs to a final figure once, use motion/number-ticker instead.

export type DigitSwapDirection = 'up' | 'down'

export interface DigitSwapProps {
  /** Digits or a mask, rendered one character per slot. */
  value: string | number
  /** Change it to replay every slot even when the characters stay the same. */
  animationKey?: string | number
  /** The side the new glyph enters from. Default up. */
  direction?: DigitSwapDirection
  /** Per-glyph duration in ms. Default 180. */
  duration?: number
  /** Delay between neighboring slots in ms. Default 6. */
  stagger?: number
  /** How many trailing characters get suffixClassName (the visible last four of a card). */
  suffixLength?: number
  className?: string
  glyphClassName?: string
  suffixClassName?: string
}

const CSS = `
@keyframes ds-dg-in-up { from { opacity: 0; transform: translateY(45%) } to { opacity: 1; transform: none } }
@keyframes ds-dg-out-up { from { opacity: 1; transform: none } to { opacity: 0; transform: translateY(-45%) } }
@keyframes ds-dg-in-down { from { opacity: 0; transform: translateY(-45%) } to { opacity: 1; transform: none } }
@keyframes ds-dg-out-down { from { opacity: 1; transform: none } to { opacity: 0; transform: translateY(45%) } }
@keyframes ds-dg-fade-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes ds-dg-fade-out { from { opacity: 1 } to { opacity: 0 } }
`

export function DigitSwap({
  value,
  animationKey,
  direction = 'up',
  duration = 180,
  stagger = 6,
  suffixLength = 0,
  className,
  glyphClassName,
  suffixClassName,
}: DigitSwapProps) {
  useStyleOnce('ds-digit-swap', CSS)
  const reduced = useReducedMotion()
  const text = String(value)
  const stamp = `${text}|${animationKey ?? ''}`
  // What was on screen before this value, so the old glyph can leave while the new one arrives.
  const shown = React.useRef({ stamp, text })
  const prev = React.useRef({ text, key: animationKey })
  if (shown.current.stamp !== stamp) {
    prev.current = { text: shown.current.text, key: animationKey }
    shown.current = { stamp, text }
  }
  const before = prev.current.text
  const first = before === text && prev.current.key === animationKey
  const suffixStart = Math.max(0, text.length - Math.max(0, suffixLength))
  const kind = reduced ? 'fade' : direction
  const ms = reduced ? Math.min(duration, 120) : duration

  return (
    <span data-slot="digit-swap" className={cn('inline-flex items-center whitespace-nowrap', className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="inline-flex items-center">
        {Array.from(text, (ch, i) => {
          if (ch === ' ') return <span key={`s${i}`} className="inline-block w-[0.7ch]" />
          const old = before[i]
          const changed = !first && (old !== ch || animationKey !== undefined)
          const delay = reduced ? 0 : i * stagger
          const anim = (dir: 'in' | 'out') =>
            changed
              ? {
                  animation: `${kind === 'fade' ? `ds-dg-fade-${dir}` : `ds-dg-${dir}-${kind}`} ${ms}ms var(--ease-out) ${delay}ms both`,
                }
              : undefined
          const tone = cn(glyphClassName, i >= suffixStart && suffixClassName)
          return (
            <span key={`g${i}`} className="relative inline-block h-[1.1em] w-[1ch] flex-none overflow-hidden align-bottom">
              {changed && old && old !== ' ' ? (
                <span key={`o${i}-${stamp}`} className={cn('absolute inset-0 flex items-center justify-center leading-none', tone)} style={anim('out')}>
                  {old}
                </span>
              ) : null}
              <span key={`n${i}-${stamp}`} className={cn('absolute inset-0 flex items-center justify-center leading-none', tone)} style={anim('in')}>
                {ch}
              </span>
            </span>
          )
        })}
      </span>
    </span>
  )
}
