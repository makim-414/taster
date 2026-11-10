import * as React from 'react'
import { cn } from '../blocks/_cn'
import { useStyleOnce } from './_motion'

// Scroll enter: a wrapper that lets one block arrive the first time it scrolls into view, a short rise of
// --enter-offset and a fade over --dur-dropdown with --ease-out, then never again. It renders its children
// visible and only arms the effect once script runs and the block is still below the fold, so content
// above the fold, content without script and content for crawlers are never hidden. Under reduced motion
// it never arms. `stagger` lets up to four direct children follow one another by --stagger-step.
// Follows patterns/scroll-reveal-wrapper: one element per screen at most, no overshooting spring, no replay
// on scroll up, nothing hidden from focus or selection while it waits (MOT-01).
// Original code, MIT.

export interface ScrollEnterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Let up to four direct children follow one another. */
  stagger?: boolean
}

const CSS =
  '.dsg-enter[data-armed="true"]{opacity:0;transform:translateY(var(--enter-offset))}' +
  '.dsg-enter[data-armed="true"][data-in="true"]{opacity:1;transform:none;transition:opacity var(--dur-dropdown) var(--ease-out),transform var(--dur-dropdown) var(--ease-out)}' +
  '.dsg-enter[data-stagger="true"][data-armed="true"]{opacity:1;transform:none}' +
  '.dsg-enter[data-stagger="true"][data-armed="true"]>*{opacity:0;transform:translateY(var(--enter-offset))}' +
  '.dsg-enter[data-stagger="true"][data-armed="true"][data-in="true"]>*{opacity:1;transform:none;transition:opacity var(--dur-dropdown) var(--ease-out),transform var(--dur-dropdown) var(--ease-out)}' +
  '.dsg-enter[data-stagger="true"][data-in="true"]>:nth-child(2){transition-delay:var(--stagger-step)}' +
  '.dsg-enter[data-stagger="true"][data-in="true"]>:nth-child(3){transition-delay:calc(var(--stagger-step) * 2)}' +
  '.dsg-enter[data-stagger="true"][data-in="true"]>:nth-child(n+4){transition-delay:calc(var(--stagger-step) * 3)}' +
  '@media (prefers-reduced-motion: reduce){.dsg-enter[data-armed="true"],.dsg-enter[data-armed="true"]>*{opacity:1!important;transform:none!important}}'

export function ScrollEnter({ stagger = false, className, children, ...props }: ScrollEnterProps) {
  useStyleOnce('dsg-enter-css', CSS)
  const ref = React.useRef<HTMLDivElement>(null)
  const [armed, setArmed] = React.useState(false)
  const [entered, setEntered] = React.useState(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    // Already on screen when script runs: leave it alone.
    if (el.getBoundingClientRect().top < window.innerHeight) return
    setArmed(true)
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setEntered(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.15 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      data-armed={armed ? 'true' : undefined}
      data-in={entered ? 'true' : undefined}
      data-stagger={stagger ? 'true' : undefined}
      className={cn('dsg-enter', className)}
      {...props}
    >
      {children}
    </div>
  )
}
