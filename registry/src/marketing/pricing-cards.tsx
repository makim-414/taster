import * as React from 'react'
import { cn } from '../blocks/_cn'
import { useInViewOnce, useStyleOnce } from '../motion/_motion'

// Pricing cards: one card per plan with the same slots in the same places, sliding in one after
// another when the row scrolls into view.
// Source: "pricing-02" by Shadcn Space (https://github.com/shadcnspace/shadcnspace, MIT,
// https://21st.dev/@shadcnspace/components/pricing-02), by way of a token rewrite first made for a
// template marketplace landing.
// Changes against the original: no motion/react, shadcn or lucide (an IntersectionObserver and one
// keyframe). The featured card is no longer scaled up, ringed with a spinning gradient or given a
// pill badge, because that is the CMP-09 tell this kit flags; the recommended plan gets a text label
// and a border one step stronger, as the plan-cards pattern says. All cards are the same size.
// Cards are hidden until they slide in, so an unrevealed card is neither focusable nor read.
// Upstream license: MIT, Copyright (c) 2026 Shadcn Space. Full text in THIRD_PARTY_NOTICES.md.

const CSS =
  '@keyframes dsg-plan-in{from{opacity:0;transform:translateX(calc(var(--sp-16) * -1))}to{opacity:1;transform:none}}' +
  '.dsg-plan{visibility:hidden}' +
  '.dsg-plans[data-shown="true"] .dsg-plan{visibility:visible;animation:dsg-plan-in 600ms var(--ease-in-out) both;animation-delay:calc(var(--n) * 250ms)}' +
  '@media (prefers-reduced-motion: reduce){.dsg-plan,.dsg-plans[data-shown="true"] .dsg-plan{visibility:visible;animation:none}}' +
  '@media (scripting: none){.dsg-plan{visibility:visible}}'

export interface PricingPlan {
  id: string
  name: string
  blurb: string
  /** Display price, already formatted, for example "$19". */
  price: string
  /** The unit and period beside the price, for example "per month". */
  period?: string
  /** One line under the price, for example "Billed $228 yearly". */
  note?: string
  features: string[]
  cta: { label: string; href: string }
  recommended?: boolean
}

export interface PricingCardsProps extends React.HTMLAttributes<HTMLDivElement> {
  plans: PricingPlan[]
  /** Text shown on the recommended plan. */
  recommendedLabel?: string
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-0.5 shrink-0 text-text">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

const LINK = 'inline-flex h-11 w-full items-center justify-center rounded-md px-6 text-title font-medium outline-none transition-[colors,transform] duration-press ease-out active:scale-press focus-visible:ring-2 focus-visible:ring-ring'

export function PricingCards({ plans, recommendedLabel = 'Recommended', className, ...props }: PricingCardsProps) {
  useStyleOnce('dsg-pricing-css', CSS)
  const ref = React.useRef<HTMLDivElement>(null)
  const shown = useInViewOnce(ref, '0px', 0.15)

  return (
    <div ref={ref} data-shown={shown ? 'true' : 'false'} className={cn('dsg-plans grid gap-6 lg:grid-flow-col lg:auto-cols-fr', className)} {...props}>
      {plans.map((p, i) => (
        <div
          key={p.id}
          className={cn(
            'dsg-plan flex flex-col gap-8 rounded-3xl border bg-bg-elev p-8',
            p.recommended ? 'border-text-subtle' : 'border-border',
          )}
          style={{ ['--n' as string]: i }}
        >
          <div className="grid gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-h2 font-medium text-text">{p.name}</h3>
              {p.recommended ? <span className="text-sm text-text-muted">{recommendedLabel}</span> : null}
            </div>
            <p className="text-body text-text-muted [word-break:keep-all]">{p.blurb}</p>
          </div>
          <div className="flex flex-1 flex-col gap-6">
            <div>
              <span className="text-display font-medium tabular-nums text-text">{p.price}</span>
              {p.period ? <span className="ml-2 text-body text-text-muted">{p.period}</span> : null}
              {p.note ? <p className="mt-1 text-body text-text-muted">{p.note}</p> : null}
            </div>
            <hr className="m-0 w-full border-0 border-t border-border" />
            <ul className="m-0 grid flex-1 list-none content-start gap-4 p-0">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-body text-text-muted [word-break:keep-all]">
                  <Check />
                  {f}
                </li>
              ))}
            </ul>
            <a
              href={p.cta.href}
              className={cn(
                LINK,
                p.recommended
                  ? 'border border-transparent bg-accent text-accent-fg hover:opacity-90'
                  : 'border border-border bg-bg-elev text-text hover:border-text-subtle',
              )}
            >
              {p.cta.label}
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}
