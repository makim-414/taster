import * as React from 'react'
import { cn } from '../blocks/_cn'
import { useInViewOnce } from './_motion'

// Text reveal: once the line scrolls into view, its words rise in one after another.
// Source: a common scroll-reveal pattern, first written for this kit on top of motion/react; no single upstream.
// Changes: plain CSS transitions on the motion tokens (--enter-offset, --stagger-step, --ease-out),
// so reduced motion keeps the fade and drops the movement through the tokens. Words are split on
// spaces, so Korean breaks between words. The full sentence stays readable to screen readers.

export interface TextRevealProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  text: string
  /** Element to render, for example 'h2' or 'p'. */
  as?: 'p' | 'h1' | 'h2' | 'h3' | 'div' | 'span'
  /** Seconds before the first word moves. */
  delay?: number
}

export function TextReveal({ text, as: Tag = 'p', delay = 0, className, ...props }: TextRevealProps) {
  const ref = React.useRef<HTMLElement>(null)
  const shown = useInViewOnce(ref)
  const words = text.split(' ').filter(Boolean)
  return (
    <Tag ref={ref as never} className={className} aria-label={text} {...props}>
      {words.map((w, i) => (
        <React.Fragment key={i}>
          <span
            aria-hidden
            className="inline-block transition-[opacity,transform] ease-out"
            style={{
              opacity: shown ? 1 : 0,
              transform: shown ? 'none' : 'translateY(calc(var(--enter-offset) * 1.5))',
              transitionDuration: 'var(--dur-modal)',
              transitionDelay: `calc(${delay}s + var(--stagger-step) * ${i})`,
            }}
          >
            {w}
          </span>
          {i < words.length - 1 ? ' ' : null}
        </React.Fragment>
      ))}
    </Tag>
  )
}
