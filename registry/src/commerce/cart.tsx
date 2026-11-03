import * as React from 'react'
import { cn } from '../blocks/_cn'
import { safeHref } from '../blocks/_url'

// Cart: line items on the left and the order summary on the right, stacked on phones. A line has a 72px
// image, the name, its option text, a quantity stepper, the line price and a plain "Remove" text button.
// The summary lists subtotal, discount (only when applied), shipping, tax and the total, which is the
// largest figure on the screen, then the one solid checkout button. Every fee the caller knows is shown
// here, before checkout. An optional line above the list says how far the cart is from free shipping.
// Controlled: the caller owns the lines and gets onQuantity and onRemove, so it works with any backend.
// Follows patterns/cart-and-checkout: no upsell popup, no fake secure-payment badges, no green circles.
// Original code, MIT.

export interface CartLine {
  id: string
  name: string
  /** For example "30 ml, Unscented". */
  options?: string
  unitPrice: number
  quantity: number
  image: { src: string; alt: string }
  href?: string
  /** Language of the name and options when it differs from the page. */
  lang?: string
}

export interface CartProps extends React.HTMLAttributes<HTMLDivElement> {
  lines: CartLine[]
  onQuantity: (id: string, quantity: number) => void
  onRemove: (id: string) => void
  /** Shipping cost, or null when it is calculated at the next step (say so in shippingNote). */
  shipping: number | null
  shippingNote?: string
  /** Tax amount, or null when it is included in prices (say so in taxNote). */
  tax?: number | null
  taxNote?: string
  discount?: { label: string; amount: number }
  freeShippingAt?: number
  format?: (n: number) => string
  checkout: { label: string; href: string }
  maxQuantity?: number
  emptyMessage?: React.ReactNode
}

const KEEP = 'break-keep [overflow-wrap:break-word]'
const usd = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
const STEP =
  'inline-flex h-11 w-11 items-center justify-center text-text outline-none transition-colors duration-press ease-out hover:bg-bg-sunken focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 desk:h-9 desk:w-9'

export function Cart({
  lines,
  onQuantity,
  onRemove,
  shipping,
  shippingNote,
  tax = null,
  taxNote,
  discount,
  freeShippingAt,
  format = usd,
  checkout,
  maxQuantity = 10,
  emptyMessage = 'Your cart is empty.',
  className,
  ...props
}: CartProps) {
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
  const total = subtotal - (discount?.amount ?? 0) + (shipping ?? 0) + (tax ?? 0)
  const left = freeShippingAt !== undefined ? Math.max(0, freeShippingAt - subtotal) : null
  const uid = React.useId()

  if (!lines.length) {
    return (
      <div className={cn('py-12', className)} {...props}>
        <p className={cn('text-body text-text-muted', KEEP)}>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={cn('grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:gap-12', className)} {...props}>
      <section aria-labelledby={`${uid}-items`} className="min-w-0">
        <h2 id={`${uid}-items`} className="sr-only">
          Items
        </h2>
        {left !== null && freeShippingAt ? (
          <div className="mb-6">
            <p className={cn('text-body text-text', KEEP)}>
              {left > 0 ? `${format(left)} more for free shipping.` : 'Shipping is free for this order.'}
            </p>
            <div
              role="progressbar"
              aria-label="Progress to free shipping"
              aria-valuemin={0}
              aria-valuemax={freeShippingAt}
              aria-valuenow={Math.min(subtotal, freeShippingAt)}
              className="mt-2 h-1 overflow-hidden rounded-pill bg-[color:var(--border)]"
            >
              <div className="h-full bg-text transition-[width] duration-modal ease-out" style={{ width: `${Math.min(100, (subtotal / freeShippingAt) * 100)}%` }} />
            </div>
          </div>
        ) : null}
        <ul className="m-0 list-none border-t border-border p-0">
          {lines.map((l) => (
            <li key={l.id} lang={l.lang} className="grid grid-cols-[72px_minmax(0,1fr)] gap-4 border-b border-border py-5">
              <img src={l.image.src} alt={l.image.alt} width={72} height={72} className="h-[72px] w-[72px] rounded-sm bg-bg-sunken object-cover" />
              <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div className="min-w-0">
                  <p className={cn('text-body font-medium text-text', KEEP)}>
                    {l.href ? (
                      <a href={safeHref(l.href)} className="rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
                        {l.name}
                      </a>
                    ) : (
                      l.name
                    )}
                  </p>
                  {l.options ? <p className={cn('mt-0.5 text-label text-text-muted', KEEP)}>{l.options}</p> : null}
                  <p className="mt-0.5 text-label tabular-nums text-text-subtle">{format(l.unitPrice)} each</p>
                </div>
                <p className="text-body font-medium tabular-nums text-text sm:text-right">{format(l.unitPrice * l.quantity)}</p>
                <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                  <div role="group" aria-label={`Quantity of ${l.name}`} className="inline-flex items-center rounded-md border border-border">
                    <button type="button" className={cn(STEP, 'rounded-l-md')} onClick={() => onQuantity(l.id, l.quantity - 1)} disabled={l.quantity <= 1} aria-label="Decrease">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                        <path d="M5 12h14" />
                      </svg>
                    </button>
                    <output className="w-9 text-center text-body tabular-nums text-text">{l.quantity}</output>
                    <button type="button" className={cn(STEP, 'rounded-r-md')} onClick={() => onQuantity(l.id, l.quantity + 1)} disabled={l.quantity >= maxQuantity} aria-label="Increase">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(l.id)}
                    className="inline-flex h-11 items-center rounded-sm text-label text-text-muted underline underline-offset-4 outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-ring desk:h-8"
                  >
                    Remove<span className="sr-only"> {l.name}</span>
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby={`${uid}-summary`} className="h-fit min-w-0 rounded-xl bg-bg-sunken p-6 lg:sticky lg:top-8">
        <h2 id={`${uid}-summary`} className="text-title font-semibold text-text">
          Order summary
        </h2>
        <dl className="m-0 mt-4 grid gap-2 text-body">
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">Subtotal</dt>
            <dd className="m-0 tabular-nums text-text">{format(subtotal)}</dd>
          </div>
          {discount ? (
            <div className="flex justify-between gap-4">
              <dt className={cn('text-text-muted', KEEP)}>{discount.label}</dt>
              <dd className="m-0 tabular-nums text-text">-{format(discount.amount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">Shipping</dt>
            <dd className={cn('m-0 text-right tabular-nums text-text', KEEP)}>{shipping === null ? shippingNote ?? 'At the next step' : shipping === 0 ? 'Free' : format(shipping)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">Tax</dt>
            <dd className={cn('m-0 text-right tabular-nums text-text', KEEP)}>{tax === null ? taxNote ?? 'Included' : format(tax)}</dd>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-border pt-4">
            <dt className="font-medium text-text">Total</dt>
            <dd className="m-0 text-h2 font-semibold tabular-nums text-text">{format(total)}</dd>
          </div>
        </dl>
        <a
          href={safeHref(checkout.href)}
          className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-md bg-accent px-6 text-title font-medium text-accent-fg outline-none transition-[opacity,transform] duration-press ease-out hover:opacity-90 active:scale-press focus-visible:ring-2 focus-visible:ring-ring"
        >
          {checkout.label}
        </a>
      </section>
    </div>
  )
}
