---
id: product-detail-page
name: Product detail page
category: commerce
uses: [sell-a-product]
surfaces: [commerce]
replaces: []
components: [blocks/accordion]
inspiration: [https://21st.dev/@hedevelope/components/estimated-arrival]
status: stable
---

## When to use

Use it for the page where someone decides to buy one thing. The job is to answer, in this order: what is it, what does it look like, what are my options, what is in it, can I trust it, when will it arrive. Everything else is secondary.

Do not use it as a brand story page. Long narrative belongs on its own page that this one links to. Do not use it for subscriptions that need a plan comparison; use a pricing layout.

## Anatomy

Two columns on desktop, one on mobile. Left: the image set, a main image at four by five with a column or row of thumbnails. Right, in a sticky column: name, one-line descriptor, rating summary (stars plus count, linking to reviews), price, option selector, quantity, the buy button, and an expandable delivery estimate.

Below the fold, in this order:

1. Ingredient or material story, a short paragraph and one image, with the three to five items that matter.
2. The full list in an accordion: ingredients, specifications, care. Closed by default except the first.
3. Reviews: the average, a distribution bar, then individual reviews with date and verified mark.
4. Cross-sell: four related products using the same card as the home page.

The delivery estimate is a small row ("Arrives Thu 6 to Mon 10") that opens into a card with a postal code field and the cost.

## Do

- Put the price and the buy button inside the first viewport on a 700px tall screen. The sticky column makes that hold while images scroll.
- Make option selectors real controls: a radio group for size and color with visible labels, disabled and sold-out states that say why.
- Use `blocks/accordion` for the long lists. It is a Radix accordion, so keyboard and `aria-expanded` come for free.
- Show an honest rating: the count next to the stars, and the distribution in the reviews block.
- Put shipping cost and return terms near the button, in text, not hidden in a modal.
- Keep the image gallery fast: the main image at the correct `sizes`, thumbnails lazy.

## Don't

- Do not use a triple number strip of "98 percent say it works" statistics without a source (CMP-06).
- Do not set the benefits as three icon cards (LAY-02). Write them as a list the reader can scan.
- Do not use a rounded-square icon tile above every benefit (CMP-03).
- Do not show a testimonial carousel with invented names (CMP-08). Reviews must come from buyers.
- Do not trap the page in a sticky bottom bar and a sticky top bar and a chat bubble at once.
- Do not use a countdown timer or a fake "7 people are looking at this".

## Swap recipe

The slop version is a landing page glued onto a product: big gradient headline, three icon benefits, a metrics strip, a testimonial.

```html
<!-- before: landing-page skeleton on a PDP -->
<h1 class="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Glow like never before</h1>
<div class="grid grid-cols-3 gap-6">
  <div class="rounded-2xl p-6"><span class="icon-tile"></span><h3>Hydrates</h3><p>Filler text.</p></div>
  <!-- two more -->
</div>
<div class="flex gap-12"><b>98%</b><b>10K+</b><b>4.9</b></div>
```

```tsx
// after: two columns, real options, facts in an accordion, reviews with a distribution
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './blocks/accordion'

export function Pdp({ product }: { product: Product }) {
  return (
    <div className="mx-auto grid max-w-6xl gap-[var(--sp-8)] px-[var(--sp-4)] md:grid-cols-[1.2fr_1fr]">
      <Gallery images={product.images} />
      <aside className="md:sticky md:top-[var(--sp-8)] md:self-start">
        <h1 className="text-[length:var(--t-h2)]">{product.name}</h1>
        <p className="text-[var(--text-muted)]">{product.descriptor}</p>
        <a href="#reviews" className="mt-[var(--sp-2)] inline-block tabular-nums">{product.rating.toFixed(1)} from {product.reviewCount} reviews</a>
        <div className="mt-[var(--sp-4)] text-[length:var(--t-h2)] tabular-nums">{product.price}</div>
        <OptionGroup legend="Size" options={product.sizes} />
        <Button className="mt-[var(--sp-4)] w-full">Add to bag</Button>
        <DeliveryEstimate />
      </aside>

      <section className="md:col-span-2">
        <Accordion type="single" collapsible defaultValue="ingredients">
          <AccordionItem value="ingredients">
            <AccordionTrigger>Full ingredient list</AccordionTrigger>
            <AccordionContent>{product.ingredients}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="care"><AccordionTrigger>How to use</AccordionTrigger><AccordionContent>{product.usage}</AccordionContent></AccordionItem>
        </Accordion>
      </section>
    </div>
  )
}
```

Delete the gradient headline (COL-04), the icon benefits (LAY-02, CMP-03) and the metrics strip (CMP-06). If there is a real clinical number, put it in the ingredient story with its source.

## Tokens

- Layout: container 1152px, gap `--sp-8`, sticky offset `--sp-8`.
- Type: name `--t-h2`, price `--t-h2` with `tabular-nums`, descriptor `--t-body` in `--text-muted`.
- Controls: option buttons use `--r-md`, `--border`, selected state `--accent` border plus `--text`. Buy button is the `solid` variant of `blocks/button`.
- Accordion: `--border-soft` dividers, content `--t-body`. Open and close at `--dur-dropdown` with `--ease-out`, collapsed to 1ms under reduced motion.
- Status: sold-out text `--text-subtle`, errors `--danger`.
