---
id: real-product-frame
name: Real product frame
category: feature-section
uses: [explain-features]
surfaces: [landing]
replaces: [AC-17, CMP-07]
components: []
inspiration: [https://21st.dev/@meschacirung/components/content-7]
status: draft
---

## When to use

Use it whenever a section needs to show the product. A rounded frame holds a true screenshot or a short recording of the actual screen. It is the plain, honest alternative to boxes drawn in CSS and to a terminal window with three colored dots and made-up commands.

Use it in feature sections, below heroes and inside tabbed showcases. Do not use it to hide an unfinished product: if the screen does not exist yet, show a photo of the problem or write the section as text.

## Anatomy

- Frame: a single element with a 1px hairline border, radius `--r-xl`, and `overflow: hidden`. No window chrome, no traffic-light dots, no fake address bar unless the product is a browser extension and the bar is real.
- Content: a screenshot at 2x resolution, or a muted, looping recording of 5 to 10 seconds with a poster image. Crop to the part that matters; trimming the sidebar is allowed, redrawing it is not.
- Backing: a flat surface behind the frame (`--bg-sunken`) with padding of `--sp-6`, optional, so the screenshot reads as an object.
- Caption: one sentence under the frame saying what the viewer is looking at and which data is shown.

If the screen contains real customer data, replace it with sample data and label it as such.

## Do

- Capture the real app at its normal density and at the theme the page uses. A light app on a dark page gets its own light frame; do not invert it.
- Export at 2x and serve WebP or AVIF with an explicit width and height.
- Write alt text that states what the screen shows ("Report listing the 12 pages most cited by AI answers").
- Add `loading="lazy"` for frames below the fold.
- For recordings use `autoplay muted loop playsinline` with a poster and a static fallback for reduced motion.
- Keep the frame the same radius as the cards around it, one step larger at most.

## Don't

- Do not build the product screen out of divs, gray bars and fake charts (AC-17). It always looks like a wireframe.
- Do not draw a terminal with red, yellow and green dots and a typed command (CMP-07). If your product is a CLI, show a real session as text in a code block.
- Do not add a drop shadow or colored glow behind the frame.
- Do not tilt it at 20 degrees in perspective unless the page is about motion.
- Do not blur the screenshot to fake depth, and do not crop so tight the content cannot be read.

## Swap recipe

Slop version: CSS skeleton inside a window with three dots.

```html
<!-- before: AC-17, CMP-07 -->
<div class="window">
  <div class="dots"><i style="background:#ff5f56"></i><i style="background:#ffbd2e"></i><i style="background:#27c93f"></i></div>
  <div class="skeleton"><div class="bar w-60"></div><div class="bar w-40"></div><div class="chart"></div></div>
</div>
<style>.window { box-shadow: 0 30px 80px rgba(124, 92, 255, .35); border-radius: 20px; }</style>
```

Fixed version: a real capture in a hairline frame.

```tsx
<figure className="m-0">
  <div className="rounded-xl bg-bg-sunken p-6 max-sm:p-0">
    <img
      src="/shots/report@2x.webp"
      width={1600}
      height={1000}
      alt="Report listing the 12 pages most cited by AI answers, with a share-of-citations column"
      loading="lazy"
      className="block w-full rounded-lg border border-border"
    />
  </div>
  <figcaption className="mt-3 max-w-[60ch] text-label text-text-subtle">
    Sample data. The ranking updates every Monday.
  </figcaption>
</figure>
```

The shadow, the dots and the skeleton are all gone. If the capture looks dull, improve the product screen or choose a better state to capture (a full table, a real chart), do not decorate the frame.

## Tokens

- Frame: border `--border`, radius `--r-xl` (0.875rem) outside and `--r-card` inside; backing `--bg-sunken`.
- Type: caption `--t-sm` in `--text-subtle`.
- Space: backing padding `--sp-6`, caption margin `--sp-3`.
- Shadow: none. If a hairline is not enough, use `--sh-card` once; never `--sh-pop` for a static image.
- Motion: no entrance animation. Video autoplay stops under `prefers-reduced-motion: reduce`.
