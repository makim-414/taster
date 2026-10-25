---
id: cart-and-checkout
name: Cart and checkout
category: commerce
uses: [sell-a-product]
surfaces: [commerce]
replaces: []
components: []
inspiration: []
status: draft
---

## When to use

Use it for the last mile of a store: the cart, and the steps from the cart to a paid order. The goal is that nobody asks "how much will I pay" or "where am I in this".

Do not use a long multi-page wizard for a store whose customers buy one item. A single page checkout with three clear groups is faster. Do not add a newsletter field to the checkout form (CMP-10).

## Anatomy

The cart is a list of line items on the left and an order summary on the right (stacked on mobile). A line item has: image at 72px square, name, option text ("30 ml"), quantity stepper, line price, and a plain "Remove" text button. Above the list, a free-shipping line: a thin progress bar and one sentence, "You are 14.00 away from free shipping."

The order summary has: subtotal, discount (only if applied), shipping, tax, total. The total is the largest number on the page. A promo code field is collapsed under a text link. The checkout button is the one solid button.

Checkout is stepped: Contact, Delivery, Payment, each an expandable section with a completed summary line when closed ("Delivery: Standard, Thu 6 to Mon 10"). The summary stays visible on the side the whole time.

## Do

- Show the final total with shipping and tax before payment. Estimate shipping from the postal code as soon as it is known.
- Make the stepper a real control: minus, number input, plus, each 44px, with a minimum of 1 and a clear remove path.
- Update totals in place with an `aria-live="polite"` region so screen readers hear the new total.
- Keep guest checkout the default. Offer an account after the order, not before.
- Mark required fields in the label, validate on blur, and put the error under the field in text, not only in red.
- Disable the pay button while the request is in flight and show a spinner inside it, so double submits cannot happen.
- Say what will happen next: confirmation email, the delivery date, how to change the order.

## Don't

- Do not hide a fee until the last step. It is the number one reason for abandoned carts.
- Do not add upsell popups between cart and payment.
- Do not use a green circle with a check for each completed step (AC-11). Use a text summary and an edit link.
- Do not use a glass card on a gradient behind the payment form (CMP-05, COL-01). Payment is not the place for atmosphere.
- Do not render a fake secure-payment badge strip with logos you did not sign up for (CMP-08).
- Do not make the free-shipping bar a rainbow or a pulsing glow. One neutral bar is enough.

## Swap recipe

The slop version dresses the cart like a fintech dashboard: glass panels, gradient button, invented urgency.

```html
<!-- before: glass cart with urgency and a gradient button -->
<div class="rounded-3xl bg-white/10 p-6 backdrop-blur-xl">
  <p class="text-amber-400">Only 3 left! Order within 02:14:09</p>
  <div class="h-3 rounded-full bg-white/10"><div class="h-3 w-2/3 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 shadow-[0_0_20px_#8b5cf6]"></div></div>
  <button class="w-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 py-4">Checkout now</button>
</div>
```

```tsx
// after: flat summary, honest progress line, one solid button
// progress is a number from 0 to 100
export function OrderSummary({ subtotal, shipping, tax, total, freeShippingGap, progress }: Summary) {
  return (
    <aside className="rounded-[var(--r-card)] border border-[var(--border)] bg-[var(--bg-elev)] p-[var(--sp-5)]">
      {freeShippingGap > 0 && (
        <div className="mb-[var(--sp-4)]">
          <p className="text-[length:var(--t-sm)] text-[var(--text-muted)]">You are {freeShippingGap} away from free shipping.</p>
          <div className="mt-[var(--sp-2)] h-1 rounded-full bg-[var(--bg-sunken)]">
            <div className="h-1 rounded-full bg-[var(--text)]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      <dl className="grid grid-cols-[1fr_auto] gap-y-[var(--sp-2)] tabular-nums" aria-live="polite">
        <dt>Subtotal</dt><dd>{subtotal}</dd>
        <dt>Shipping</dt><dd>{shipping}</dd>
        <dt>Tax</dt><dd>{tax}</dd>
        <dt className="font-semibold">Total</dt><dd className="text-[length:var(--t-h2)] font-semibold">{total}</dd>
      </dl>
      <Button className="mt-[var(--sp-5)] w-full">Continue to delivery</Button>
    </aside>
  )
}
```

The urgency line, the glowing bar and the gradient button correspond to COL-07 and COL-01. The bar track and fill now use two neutral tokens.

## Tokens

- Summary surface: `--bg-elev`, `--border`, `--r-card`, padding `--sp-5`.
- Progress bar: height 4px, track `--bg-sunken`, fill `--text`. When the threshold is reached, change the sentence, not the color.
- Totals: `tabular-nums`, total at `--t-h2`, others at `--t-body`.
- Errors: `--danger` text plus `--danger-soft` field background. Success notes: `--success` text only.
- Motion: step sections open with `--dur-dropdown` and `--ease-out`. The pay button press uses `--press-scale` and `--dur-press`. Both collapse under reduced motion.
