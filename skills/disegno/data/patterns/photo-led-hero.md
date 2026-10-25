---
id: photo-led-hero
name: Photo-led hero
category: hero
uses: [introduce-the-product]
surfaces: [landing, commerce, editorial]
replaces: [AC-19, BG-01, COL-03, LAY-01]
components: [blocks/button]
inspiration: [https://21st.dev/@felipemenezes098/components/hero-04, https://21st.dev/@ravikatiyar162/components/modern-hero-section]
status: draft
---

## When to use

Use it when the product is physical, spatial or visual: a hotel, a garment, a gallery, a restaurant, a piece of furniture, a place. The photograph is the argument and the text only names it. It is the right hero for commerce and editorial pages, where a gradient would say nothing and a photo says everything.

Do not use it when you do not own good photographs. A stock image of a laptop on a desk is worse than no image. Fall back to `hero-headline-lockup` plus a quiet neutral surface.

## Anatomy

Two accepted forms.

- Full-bleed: one photograph fills the hero, with a bottom scrim so the headline reads. The text block sits bottom left. Nothing is centered.
- Collage: a serif or display headline on one side, two or three overlapping photographs on the other. Photos differ in size and crop; one is tall, one is small, none has a card frame or drop shadow.

Layers from back to front: photo, scrim (a linear gradient from transparent at 40% height to 55% black at the bottom), text block, action. The scrim is a plain dark gradient, not a colored one. Add a very fine grain overlay (2 to 4% opacity) over the photo to take off the glossy edge.

## Do

- Use real photographs from a real shoot or from the client's own archive. Keep file size under 300 KB at 1600px wide with `srcset` and an explicit `width` and `height`.
- Brief the photographer, or the generator, with a real reference photo. Ask for film grain, slightly lowered saturation and a slightly darker exposure.
- Test contrast of the headline on the scrim at its lightest point. Aim for 4.5:1.
- Crop for the focal point on mobile with `object-position`. Check the 360px crop separately.
- Keep the text block to the lockup: headline, one sentence, one button.
- Add a text alternative that describes the photo, not the brand.

## Don't

- Do not use glossy, over-saturated generated images with golden-hour light and waxy skin (AC-19).
- Do not put an aurora blob or a mesh gradient behind the photo to "add depth" (BG-01).
- Do not darken the whole page to near black and add a neon accent that glows (COL-03).
- Do not center a title and two buttons on top of the photo with a pill above (LAY-01).
- Do not run a five-slide auto carousel. One hero, one photo.
- Do not use a colored scrim. A purple or teal tint on the photo is the same gradient problem moved.

## Swap recipe

Slop version: glossy generated photo, tinted overlay, centered text, glowing button.

```css
/* before: AC-19, BG-01, COL-03, LAY-01 */
.hero { background: radial-gradient(60% 50% at 50% 0%, #7c5cff55, transparent), #0b0b0b; text-align: center; }
.hero img { filter: saturate(1.4) brightness(1.1); }
.hero .cta { box-shadow: 0 0 40px #39ff88; }
```

Fixed version: real photo, neutral bottom scrim, bottom-left text, flat button.

```tsx
<section className="relative isolate min-h-[640px] overflow-hidden">
  <img
    src="/photos/studio-1600.jpg"
    srcSet="/photos/studio-800.jpg 800w, /photos/studio-1600.jpg 1600w"
    sizes="100vw"
    width={1600}
    height={1000}
    alt="Ceramic studio with shelves of unglazed bowls"
    className="absolute inset-0 -z-10 h-full w-full object-cover object-[60%_40%] saturate-[0.9]"
  />
  <div
    className="absolute inset-0 -z-10"
    style={{ background: 'linear-gradient(to top, oklch(0 0 0 / 55%) 0%, transparent 60%)' }}
  />
  <div className="mx-auto flex min-h-[640px] max-w-[1200px] flex-col justify-end px-6 pb-16">
    <h1 className="max-w-[16ch] text-h1 lg:text-display font-semibold text-white">Hand-thrown bowls, fired in small batches</h1>
    <p className="mt-4 max-w-[48ch] text-title text-white/80">Twelve pieces a week from one studio in the hills.</p>
    <Button size="lg" className="mt-8 w-fit">Shop this week</Button>
  </div>
</section>
```

Grain overlay, if wanted: a 200px tiled noise PNG at `opacity-[0.03]` with `mix-blend-mode: overlay`, placed above the photo and below the scrim.

## Tokens

- Scrim: use `--scrim` (oklch 0 0 0 at 55%) as the dark end of the gradient instead of an arbitrary black.
- Type: `--t-display` and `--t-h1` for the headline, `--t-title` for the sentence. Text color is the one place white on photo is correct; use `--foreground` in the dark theme.
- Space: `--sp-16` bottom padding, `--sp-8` before the button, `--sp-4` between headline and sentence.
- Radius: none on a full-bleed photo; `--r-card` on collage tiles.
- Motion: at most a slow opacity fade of the photo with `--ease-out` and `--dur-modal`. Respect reduced motion; the tokens already collapse to 1ms.
