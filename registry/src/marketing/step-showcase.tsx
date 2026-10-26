import * as React from 'react'
import { cn } from '../blocks/_cn'
import { useReducedMotion, useStyleOnce } from '../motion/_motion'

// Step showcase: one card with a row of numbered step buttons on top, the step's title and
// text at the top left, and the product's screens below, cut off by the card's bottom edge. The step
// advances by itself every few seconds and wraps; a step button jumps to its step and restarts the count.
// Source: "Feature Carousel" from cult-ui by Jordan Gilliam (https://github.com/nolly-studio/cult-ui,
// MIT), by way of a token rewrite first made for a template marketplace landing (written from a
// description of the original, not from its code).
// Changes: no motion/react, react-wrap-balancer or Tailwind animation plugins; enter and leave are CSS
// transitions on the motion tokens, all steps share one grid cell so the card never changes height,
// the step list is real buttons with aria-current="step" and no live region, and the count pauses
// while hovered, while keyboard focus is inside, while off screen, while the tab is hidden, and never
// runs under reduced motion. The original's frame around a panel around the card is now one card (CMP-02),
// and its click-anywhere-to-advance, mouse-follow glow and lime and purple colors are gone. The edge and
// shadow sit on the screenshot itself; a step with no screenshot draws a plain neutral fill of the same size.
// Upstream license: MIT, Copyright (c) 2023 Jordan-Gilliam. Full text in THIRD_PARTY_NOTICES.md.

const CSS = [
  '.dsg-step-card{background:linear-gradient(to bottom, var(--bg-elev), var(--bg) calc(var(--sp-16) * 3));background-color:var(--bg)}',
  '.dsg-step-slide{grid-area:1/1;visibility:hidden;transition:visibility 0s linear var(--dur-dropdown)}',
  '.dsg-step-slide[data-active="true"]{visibility:visible;transition:visibility 0s}',
  '.dsg-step-text{opacity:0;transform:translateY(var(--enter-offset));transition:opacity var(--dur-dropdown) var(--ease-out),transform var(--dur-dropdown) var(--ease-out)}',
  '.dsg-step-slide[data-active="true"] .dsg-step-text{opacity:1;transform:none;transition-delay:var(--dur-dropdown)}',
  '.dsg-step-stage{position:relative;aspect-ratio:1.25/1;min-width:0}',
  '.dsg-step-shot{position:absolute;opacity:0;transform:var(--from, scale(var(--enter-scale)));transition:opacity var(--dur-dropdown) var(--ease-out),transform calc(var(--dur-dropdown) * 1.5) var(--ease-out)}',
  '.dsg-step-shot img{display:block;width:100%;height:auto}',
  '.dsg-step-slide[data-active="true"] .dsg-step-shot{opacity:1;transform:none;transition-delay:var(--dur-dropdown)}',
  '.dsg-step-slide[data-active="true"] .dsg-step-shot:nth-child(2){transition-delay:calc(var(--dur-dropdown) + var(--stagger-step))}',
  '.dsg-step-slide[data-step="1"] .dsg-step-shot:nth-child(1){--from:translateX(calc(var(--enter-offset) * -2.5));top:8%;left:3%;width:66%}',
  '.dsg-step-slide[data-step="1"] .dsg-step-shot:nth-child(2){--from:translateX(calc(var(--enter-offset) * 2.5));top:0;right:4%;width:28%}',
  '.dsg-step-slide[data-step="2"] .dsg-step-shot:nth-child(1){top:4%;left:5%;width:28%}',
  '.dsg-step-slide[data-step="2"] .dsg-step-shot:nth-child(2){top:14%;right:3%;width:60%}',
  '.dsg-step-slide[data-step="3"] .dsg-step-shot:nth-child(1),.dsg-step-slide[data-step="4"] .dsg-step-shot:nth-child(1){top:6%;left:7%;width:86%}',
  '@media (min-width:640px){.dsg-step-stage{aspect-ratio:2/1}}',
  '@media (min-width:1024px){.dsg-step-stage{aspect-ratio:2.3/1}}',
].join('')

export interface ShowcasePicture {
  /** Screenshot URL. Leave empty to draw a neutral panel. */
  src?: string
  alt: string
  /** Width divided by height, used for the box before the image loads and for the empty panel. */
  aspect: number
}

export interface ShowcaseStep {
  id: string
  /** Short name on the step button. */
  name: string
  title: string
  body: string
  /** One or two pictures. Step 1 slides two in from the sides, step 2 fades two in, steps 3 and 4 show one wide. */
  pictures: ShowcasePicture[]
}

export interface StepShowcaseProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: ShowcaseStep[]
  /** Milliseconds between automatic steps. */
  interval?: number
  /** Accessible name of the step list. */
  label?: string
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

export function StepShowcase({ steps, interval = 4000, label = 'Steps', className, ...props }: StepShowcaseProps) {
  useStyleOnce('dsg-step-css', CSS)
  const [index, setIndex] = React.useState(0)
  const [restart, setRestart] = React.useState(0)
  const [hover, setHover] = React.useState(false)
  const [focused, setFocused] = React.useState(false)
  const [onScreen, setOnScreen] = React.useState(false)
  const [tabHidden, setTabHidden] = React.useState(false)
  const reduced = useReducedMotion()
  const card = React.useRef<HTMLDivElement>(null)
  const paused = hover || focused || !onScreen || tabHidden || reduced

  React.useEffect(() => {
    if (paused || steps.length < 2) return
    const t = window.setTimeout(() => setIndex((n) => (n + 1) % steps.length), interval)
    return () => window.clearTimeout(t)
  }, [paused, index, restart, steps.length, interval])

  React.useEffect(() => {
    const el = card.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setOnScreen(true)
      return
    }
    const io = new IntersectionObserver(([e]) => setOnScreen(Boolean(e?.isIntersecting)), { threshold: 0.25 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  React.useEffect(() => {
    const sync = () => setTabHidden(document.hidden)
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])

  const jump = (n: number) => {
    setIndex(n)
    setRestart((r) => r + 1)
  }

  return (
    <div {...props} className={className}>
      <div
        ref={card}
        className="dsg-step-card grid gap-6 overflow-hidden rounded-3xl border border-border px-4 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8"
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        onFocus={(e) => {
          // Only keyboard focus holds the count; a mouse press also focuses the button.
          if ((e.target as HTMLElement).matches(':focus-visible')) setFocused(true)
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false)
        }}
      >
        <nav aria-label={label}>
          <ol className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:flex sm:justify-center">
            {steps.map((step, n) => (
              <li key={step.id}>
                <button
                  type="button"
                  aria-current={n === index ? 'step' : undefined}
                  onClick={() => jump(n)}
                  className={cn(
                    'flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-pill border px-3 text-body font-medium outline-none sm:w-auto',
                    'min-h-11 transition-[colors,transform] duration-dropdown ease-out active:scale-press focus-visible:ring-2 focus-visible:ring-ring',
                    n === index
                      ? 'border-transparent bg-accent text-accent-fg'
                      : cn('border-border-soft bg-bg-elev hover:text-text', n < index ? 'text-text-muted' : 'text-text-subtle'),
                  )}
                >
                  <span aria-hidden className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-pill border border-current text-label font-semibold tabular-nums">
                    {n < index ? <Check /> : n + 1}
                  </span>
                  <span>{step.name}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className="grid min-w-0">
          {steps.map((step, n) => {
            const active = n === index
            return (
              <div
                key={step.id}
                className="dsg-step-slide grid min-w-0 grid-rows-[auto_1fr] gap-5"
                data-step={n + 1}
                data-active={active}
                aria-hidden={active ? undefined : true}
                {...(active ? {} : { inert: '' })}
              >
                <div className="dsg-step-text grid content-start gap-2" style={{ maxWidth: 'calc(var(--sp-16) * 8)' }}>
                  <h3 className="m-0 text-h2 font-semibold text-text [word-break:keep-all]">{step.title}</h3>
                  <p className="m-0 text-body text-text-muted [word-break:keep-all]">{step.body}</p>
                </div>
                <div className="dsg-step-stage">
                  {step.pictures.slice(0, 2).map((p, k) => (
                    <div key={k} className="dsg-step-shot" style={{ aspectRatio: String(p.aspect) }}>
                      {p.src ? (
                        <img src={p.src} alt={p.alt} loading="lazy" decoding="async" draggable={false} className="rounded-xl border border-border shadow-pop" />
                      ) : (
                        <div role="img" aria-label={p.alt} className="h-full w-full rounded-xl bg-bg-sunken" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
