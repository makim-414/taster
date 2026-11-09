import * as React from 'react'
import { cn } from '../blocks/_cn'

// Buy box: the right column of a product page. Name, one descriptor line, price, one radio group per
// option (size, color, pack), a quantity stepper, the one solid button, and one line about delivery or
// returns. Options are real radio inputs in a fieldset, so arrow keys move within a group and the
// choice is announced; a sold out value stays visible, disabled, with the reason in text.
// The button names what it does and the price moves with the quantity. Nothing is added until the caller's
// onAdd resolves, and the result is said in a live line next to the button, not in a toast that hides it.
// Follows patterns/product-detail-page and patterns/cart-and-checkout: no countdown, no fake stock
// pressure, no tinted badge, no second competing button.
// Original code, MIT.

export interface BuyOption {
  id: string
  label: string
  values: { value: string; label: string; soldOut?: boolean }[]
}

export interface BuyBoxProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onChange'> {
  name: string
  descriptor?: string
  /** Unit price as a number, formatted with `format`. */
  price: number
  format?: (n: number) => string
  options?: BuyOption[]
  maxQuantity?: number
  addLabel?: string
  /** Resolves when the item is in the cart. Throw to show the error line. */
  onAdd?: (choice: { options: Record<string, string>; quantity: number }) => Promise<void> | void
  /** One line, for example "Ships in 2 business days. Free returns within 30 days." */
  note?: string
  as?: 'h1' | 'h2'
}

const KEEP = 'break-keep [overflow-wrap:break-word]'
const usd = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
const STEPPER_BTN =
  'inline-flex h-11 w-11 items-center justify-center text-text outline-none transition-colors duration-press ease-out hover:bg-bg-sunken focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40'

export function BuyBox({
  name,
  descriptor,
  price,
  format = usd,
  options = [],
  maxQuantity = 10,
  addLabel = 'Add to cart',
  onAdd,
  note,
  as: Heading = 'h1',
  className,
  ...props
}: BuyBoxProps) {
  const [choice, setChoice] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(options.map((o) => [o.id, o.values.find((v) => !v.soldOut)?.value ?? ''])),
  )
  const [qty, setQty] = React.useState(1)
  const [status, setStatus] = React.useState<'idle' | 'adding' | 'added' | 'error'>('idle')
  const uid = React.useId()

  async function add() {
    if (!onAdd) return
    setStatus('adding')
    try {
      await onAdd({ options: choice, quantity: qty })
      setStatus('added')
    } catch {
      setStatus('error')
    }
  }

  return (
    <section aria-labelledby={`${uid}-name`} className={cn('min-w-0 max-w-[440px]', className)} {...props}>
      <Heading id={`${uid}-name`} className={cn('text-h2 font-semibold leading-[var(--lh-snug)] text-text', KEEP)}>
        {name}
      </Heading>
      {descriptor ? <p className={cn('mt-1 text-body text-text-muted', KEEP)}>{descriptor}</p> : null}
      <p className="mt-4 text-title font-medium tabular-nums text-text">{format(price)}</p>

      <div className="mt-6 grid gap-6">
        {options.map((o) => (
          <fieldset key={o.id} className="m-0 min-w-0 border-0 p-0">
            <legend className="mb-2 text-label font-medium text-text-muted">
              {o.label}: <span className="text-text">{o.values.find((v) => v.value === choice[o.id])?.label}</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {o.values.map((v) => (
                <label
                  key={v.value}
                  className={cn(
                    'relative inline-flex h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border px-4 text-body transition-colors duration-press ease-out',
                    'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                    choice[o.id] === v.value ? 'border-text text-text' : 'border-border text-text-muted hover:border-text-subtle',
                    v.soldOut && 'cursor-not-allowed text-text-subtle line-through hover:border-border',
                  )}
                >
                  <input
                    type="radio"
                    name={`${uid}-${o.id}`}
                    value={v.value}
                    checked={choice[o.id] === v.value}
                    disabled={v.soldOut}
                    onChange={() => {
                      setChoice((c) => ({ ...c, [o.id]: v.value }))
                      setStatus('idle')
                    }}
                    className="sr-only"
                  />
                  {v.label}
                  {v.soldOut ? <span className="sr-only">, sold out</span> : null}
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        <div>
          <p id={`${uid}-qty`} className="mb-2 text-label font-medium text-text-muted">
            Quantity
          </p>
          <div role="group" aria-labelledby={`${uid}-qty`} className="inline-flex items-center rounded-md border border-border">
            <button type="button" className={cn(STEPPER_BTN, 'rounded-l-md')} onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Decrease quantity">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M5 12h14" />
              </svg>
            </button>
            <output aria-live="polite" className="w-10 text-center text-body tabular-nums text-text">
              {qty}
            </output>
            <button type="button" className={cn(STEPPER_BTN, 'rounded-r-md')} onClick={() => setQty((q) => Math.min(maxQuantity, q + 1))} disabled={qty >= maxQuantity} aria-label="Increase quantity">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={add}
        disabled={!onAdd || status === 'adding'}
        className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-accent px-6 text-title font-medium text-accent-fg outline-none transition-[opacity,transform] duration-press ease-out hover:opacity-90 active:scale-press focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
      >
        {status === 'adding' ? 'Adding' : addLabel}
        <span aria-hidden className="opacity-70">
          &middot;
        </span>
        <span className="tabular-nums">{format(price * qty)}</span>
      </button>
      <p aria-live="polite" className={cn('mt-3 min-h-[1.5em] text-label', KEEP, status === 'error' ? 'text-text' : 'text-text-muted')}>
        {status === 'added'
          ? `Added ${qty} to your cart.`
          : status === 'error'
            ? 'Could not add it. Try again.'
            : !onAdd
              ? 'Not connected yet.'
              : note ?? ''}
      </p>
    </section>
  )
}
