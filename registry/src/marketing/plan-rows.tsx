import * as React from 'react'
import { cn } from '../blocks/_cn'

// Plan rows: each plan is one full-width row (name and who it is for, price, what is included, one action)
// under a monthly and yearly switch that updates every price and billing note at once.
// A variant of patterns/plan-cards for two to four plans, where a row of equal cards would fill the width
// with boxes (AC-14) or invite a raised middle card (CMP-09). Rows share the same slots in the same columns,
// the recommended plan gets a word and a stronger top rule, and the yearly saving is stated in words that
// the caller supplies, so nothing here computes or claims a discount.
// Original code, MIT.

export type BillingPeriod = 'monthly' | 'yearly'

export interface PlanRowPlan {
  id: string
  name: string
  /** Who the plan is for, one sentence. */
  blurb: string
  price: Record<BillingPeriod, string>
  /** Line under the price, per period, for example "Billed $190 yearly". */
  note?: Partial<Record<BillingPeriod, string>>
  features: string[]
  cta: { label: string; href: string }
  recommended?: boolean
}

export interface PlanRowsProps extends React.HTMLAttributes<HTMLDivElement> {
  plans: PlanRowPlan[]
  /** Labels of the switch, for example { monthly: 'Monthly', yearly: 'Yearly, 2 months free' }. */
  periods?: Record<BillingPeriod, string>
  defaultPeriod?: BillingPeriod
  /** Unit beside the price, per period. */
  unit?: Record<BillingPeriod, string>
  recommendedLabel?: string
  as?: 'h3' | 'h4'
}

const KEEP = 'break-keep [overflow-wrap:break-word]'

export function PlanRows({
  plans,
  periods = { monthly: 'Monthly', yearly: 'Yearly' },
  defaultPeriod = 'monthly',
  unit = { monthly: 'per month', yearly: 'per month, billed yearly' },
  recommendedLabel = 'Recommended',
  as: Heading = 'h3',
  className,
  ...props
}: PlanRowsProps) {
  const [period, setPeriod] = React.useState<BillingPeriod>(defaultPeriod)
  const name = React.useId()
  return (
    <div className={cn('min-w-0', className)} {...props}>
      <fieldset className="m-0 inline-flex rounded-md border border-border p-1">
        <legend className="sr-only">Billing period</legend>
        {(['monthly', 'yearly'] as const).map((p) => (
          <label
            key={p}
            className={cn(
              'relative inline-flex h-11 cursor-pointer items-center rounded-sm px-4 text-body font-medium transition-colors duration-press ease-out desk:h-9',
              'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
              period === p ? 'bg-bg-sunken text-text' : 'text-text-muted hover:text-text',
            )}
          >
            <input type="radio" name={name} value={p} checked={period === p} onChange={() => setPeriod(p)} className="sr-only" />
            {periods[p]}
          </label>
        ))}
      </fieldset>

      <ul className="m-0 mt-8 list-none p-0">
        {plans.map((pl) => (
          <li
            key={pl.id}
            className={cn(
              'grid gap-6 border-t py-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,3fr)_minmax(0,4fr)_minmax(0,2fr)] lg:items-start lg:gap-8',
              pl.recommended ? 'border-text' : 'border-border',
            )}
          >
            <div>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Heading className={cn('text-h2 font-semibold leading-[var(--lh-snug)] text-text', KEEP)}>{pl.name}</Heading>
                {pl.recommended ? <span className="text-label text-text-muted">{recommendedLabel}</span> : null}
              </div>
              <p className={cn('mt-2 max-w-[40ch] text-body text-text-muted', KEEP)}>{pl.blurb}</p>
            </div>
            <div>
              <p className="text-h2 font-semibold tabular-nums text-text">
                {pl.price[period]} <span className="text-body font-reg text-text-muted">{unit[period]}</span>
              </p>
              <p className="mt-1 min-h-[1.5em] text-label text-text-subtle">{pl.note?.[period] ?? ''}</p>
            </div>
            <ul className="m-0 grid list-none gap-2 p-0">
              {pl.features.map((f) => (
                <li key={f} className={cn('flex gap-3 text-body text-text-muted', KEEP)}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-0.5 shrink-0 text-text">
                    <path d="M5 13l4 4 10-10" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <a
              href={pl.cta.href}
              className={cn(
                'inline-flex h-11 w-full items-center justify-center whitespace-nowrap rounded-md px-5 sm:w-auto lg:w-full text-body font-medium outline-none transition-[opacity,colors,transform] duration-press ease-out active:scale-press focus-visible:ring-2 focus-visible:ring-ring',
                pl.recommended ? 'bg-accent text-accent-fg hover:opacity-90' : 'border border-border text-text hover:border-text-subtle',
              )}
            >
              {pl.cta.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
