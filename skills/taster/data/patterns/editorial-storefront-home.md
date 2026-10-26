---
id: editorial-storefront-home
name: Editorial storefront home
category: commerce
uses: [sell-a-product]
surfaces: [commerce]
replaces: [LAY-04]
components: [blocks/card, blocks/button]
inspiration: []
status: stable
---

## When to use

Use it for the home page of a store that sells a small number of considered products: skincare, objects, clothing, food. The tone is a magazine, not a marketplace. The page tells the reader what kind of shop this is in the first screen, then lets them walk into a category or a best seller.

Do not use it for a catalog with thousands of SKUs and search-first behavior. Do not use it if you have no photography. Without real images this layout turns into gray boxes.

## Anatomy

From top to bottom, in this order, and each block earns its place:

1. One still hero image, full width, with a single line of text and one button. No slider, no video loop.
2. Category entries presented as worlds, not as filters: a large image per category with a name and a short line. Two to four of them, sized unequally if the products justify it.
3. A best-seller rail: a horizontal scroll or a four-column grid of product cards at a four by five image ratio, with name, one-line descriptor and price.
4. A consultation entry: a quiet band that offers a real service ("Talk to a person about your routine") with a button.
5. A short brand note and the footer. A newsletter field only if you actually send something.

The tone is light: a paper-white `--bg`, one text color, one accent used for the primary button.

## Do

- Start from what only this shop has: the product, the maker, the place. Lead with that image and that sentence (LAY-04).
- Keep the product card to image, name, descriptor, price. Add a second image on hover only if it is a real alternate view.
- Use four by five (`aspect-ratio: 4 / 5`) for product images so the grid has a calm rhythm.
- Make category entries large enough to read as places to go: at least 40 percent of the viewport width on desktop.
- Show a real price with currency and tax rule. If it varies by option, say "from".
- Let the best-seller rail scroll with snap points and show the start of the next card so the reader knows it moves.

## Don't

- Do not follow the template order of hero, logo strip, three feature cards, three pricing tiers, testimonials (LAY-04). A store has none of those sections.
- Do not use a carousel hero. The first image is a decision, make it.
- Do not use three icon cards for "Free shipping, Easy returns, Secure checkout" (LAY-02). Put those facts in the footer and on the cart.
- Do not add a countdown, a popup coupon or a spinning badge.
- Do not put a testimonial strip of invented names (CMP-08). Use real reviews on product pages.
- Do not fill space with an aurora blob behind products (BG-01).

## Swap recipe

The slop version is a SaaS landing page with a product name swapped in.

```html
<!-- before: SaaS skeleton on a store -->
<section class="hero text-center">
  <span class="pill">New: Summer collection</span>
  <h1>Elevate your everyday</h1>
  <div><button class="btn-gradient">Shop now</button><button class="btn-ghost">Learn more</button></div>
</section>
<section class="logos">...</section>
<section class="grid grid-cols-3">...icon cards: Fast shipping, Easy returns, Secure checkout...</section>
<section class="pricing grid grid-cols-3">...</section>
<section class="testimonials">...</section>
```

```tsx
// after: still hero, categories as worlds, a four by five rail, a consultation entry
export function StorefrontHome({ hero, worlds, bestSellers }: Props) {
  return (
    <main className="bg-[var(--bg)] text-[var(--text)]">
      <section className="relative">
        <img src={hero.src} alt={hero.alt} className="h-[78vh] w-full object-cover" />
        <div className="absolute bottom-10 left-10 max-w-md">
          <h1 className="text-[length:var(--t-h1)] leading-[var(--lh-snug)]">{hero.line}</h1>
          <Button className="mt-[var(--sp-4)]">{hero.cta}</Button>
        </div>
      </section>

      <section className="grid gap-[var(--sp-4)] p-[var(--sp-8)] md:grid-cols-[1.4fr_1fr]">
        {worlds.map((w) => (
          <a key={w.href} href={w.href} className="group relative block overflow-hidden rounded-[var(--r-card)]">
            <img src={w.src} alt="" className="aspect-[4/5] w-full object-cover" />
            <span className="absolute bottom-4 left-4 bg-[var(--bg)] px-3 py-2">{w.name}</span>
          </a>
        ))}
      </section>

      <section className="grid grid-cols-2 gap-x-[var(--sp-4)] gap-y-[var(--sp-8)] px-[var(--sp-8)] md:grid-cols-4">
        {bestSellers.map((p) => (
          <a key={p.id} href={p.href}>
            <img src={p.image} alt={p.name} className="aspect-[4/5] w-full rounded-[var(--r-md)] object-cover" />
            <div className="mt-[var(--sp-2)]">{p.name}</div>
            <div className="text-[var(--text-muted)]">{p.descriptor}</div>
            <div className="tabular-nums">{p.price}</div>
          </a>
        ))}
      </section>
    </main>
  )
}
```

Keep the rule short: if a section could be pasted onto a different shop unchanged, it is the LAY-04 skeleton and should go.

## Tokens

- Surfaces: `--bg` for the page, `--bg-elev` only for the consultation band. A store home can run on the light theme in `themes/light.css`.
- Type: `--t-h1` for the hero line, `--t-title` for names, `--t-body` for descriptors, `--t-sm` for prices' fine print. Use `--lh-snug` for headings.
- Space: sections separated by `--sp-12` to `--sp-16`, product grid gaps `--sp-4` and `--sp-8`.
- Radius: `--r-md` on product images, `--r-card` on category entries. Do not use `--r-pill` except on buttons.
- Motion: image hover scale 1.02 over `--dur-dropdown` with `--ease-out`; nothing else moves. Reduced motion removes the scale.
