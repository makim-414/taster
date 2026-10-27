import * as React from 'react'
import { cn } from '../blocks/_cn'
import { useReducedMotion, useStyleOnce } from './_motion'

// Typewriter: types a word, waits, deletes it and types the next, with a thin line caret. By default
// it goes through the list once and stays on the last word with the caret at rest.
// Source: a common typing pattern, first written for this kit; no single upstream.
// Changes: no endless loop unless asked (patterns/animated-text: do not loop a typewriter forever);
// the caret blinks only while typing; reduced motion shows the last word with no typing; screen readers
// get the words once instead of every keystroke.

const CSS = '@keyframes dsg-caret{50%{opacity:0}}'

export interface TypewriterProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  words: string[]
  /** Keep cycling forever. Off by default. */
  loop?: boolean
  /** Milliseconds per typed character. */
  typingSpeed?: number
  /** Milliseconds per deleted character. */
  deletingSpeed?: number
  /** Milliseconds a finished word stays before it is deleted. */
  pause?: number
}

export function Typewriter({ words, loop = false, typingSpeed = 90, deletingSpeed = 45, pause = 1400, className, ...props }: TypewriterProps) {
  useStyleOnce('dsg-typewriter-css', CSS)
  const reduced = useReducedMotion()
  const [index, setIndex] = React.useState(0)
  const [sub, setSub] = React.useState(0)
  const [deleting, setDeleting] = React.useState(false)
  const count = words.length
  const word = words[index % Math.max(count, 1)] || ''
  const last = !loop && index === count - 1
  const done = reduced || (last && sub === word.length)

  React.useEffect(() => {
    if (done || !count) return
    if (!deleting && sub === word.length) {
      const t = window.setTimeout(() => setDeleting(true), pause)
      return () => window.clearTimeout(t)
    }
    if (deleting && sub === 0) {
      setDeleting(false)
      setIndex((i) => (i + 1) % count)
      return
    }
    const t = window.setTimeout(() => setSub((s) => s + (deleting ? -1 : 1)), deleting ? deletingSpeed : typingSpeed)
    return () => window.clearTimeout(t)
  }, [done, sub, deleting, word, count, typingSpeed, deletingSpeed, pause])

  const shown = reduced ? words[count - 1] || '' : word.slice(0, sub)
  return (
    <span className={cn('inline-flex items-baseline', className)} aria-label={loop ? words.join(', ') : words[count - 1]} {...props}>
      <span aria-hidden>{shown}</span>
      <span
        aria-hidden
        className="ml-[0.08em] inline-block w-[0.08em] self-stretch bg-text"
        style={{ animation: done ? 'none' : 'dsg-caret 1s steps(1) infinite', opacity: done ? 0.4 : undefined }}
      />
    </span>
  )
}
