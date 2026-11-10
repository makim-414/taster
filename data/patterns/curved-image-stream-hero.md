---
id: curved-image-stream-hero
name: Curved image stream hero
category: hero
uses: [introduce-the-product, browse-media]
surfaces: [landing, commerce, editorial]
replaces: [BG-01, LAY-02]
components: [blocks/curved-stream-hero]
inspiration: [https://21st.dev/@ruixen.ui/components/tilted-grid-hero]
status: stable
---

## When to use

Use it when the work itself is the argument and there is plenty of it: a portfolio, a media or creative tool, a collection, a gallery. A short headline sits above one endless row of real pictures that flatten in the middle and bend toward the viewer at the edges.

Do not use it with fewer than four strong pictures, or when the product is a screen that needs reading. For that, use `asymmetric-product-hero`. For one great picture, use `photo-led-hero`.

## Anatomy

- A short headline, one line of support and at most two actions, centered above the row.
- One row of cards with the same size and ratio. The middle is flat, the edges turn toward the viewer and fade into the page.
- The fade is a mask, so it works on any background and adds no color.
- A visible pause button under the row. Hover and keyboard focus also pause it.

## Do

- Use your own pictures, in one consistent treatment.
- Give each picture an alt once. The repeats that fill the row are hidden from screen readers.
- Keep it slow. People should be able to look at one picture as it passes.
- Check the phone width, where the cards grow to about 40% of the screen.

## Don't

- Do not fill it with stock photos or generated images (AC-19).
- Do not put text or buttons on the cards. They move.
- Do not remove the pause button: motion longer than five seconds needs one.
- Do not add a second moving background behind it.

## Swap recipe

Slop: a gradient background and three icon cards under the headline.

```tsx
<section className="bg-gradient-to-b from-violet-950 to-black text-center">
  <h1>Build something beautiful</h1>
  <div className="grid grid-cols-3">{/* three icon cards */}</div>
</section>
```

Fixed: the work in motion on a plain surface.

```tsx
import { CurvedStreamHero } from './blocks/curved-stream-hero'

<CurvedStreamHero
  title="Every frame, brought into focus."
  description="Six years of campaign work, shot and graded in house."
  images={work.map((w) => ({ src: w.src, alt: w.caption }))}
/>
```

## Tokens

`--text`, `--text-muted`, `--bg-sunken`, `--ring`, `--r-card`, `--sp-1` to `--sp-16`, `--t-h1`, `--t-display`, `--t-title`, `--t-sm`, `--w-semi`, `--lh-tight`, `--lh-normal`.
