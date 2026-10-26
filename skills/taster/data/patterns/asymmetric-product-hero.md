---
id: asymmetric-product-hero
name: Asymmetric product hero
category: hero
uses: [introduce-the-product, show-one-number]
surfaces: [landing, dashboard]
replaces: [AC-17, CMP-06, CMP-07, LAY-01]
components: [blocks/button]
inspiration: []
status: stable
---

## When to use

Use it when the product has something worth looking at: a score, a report, a dashboard, a before and after. The visitor should see the actual thing in the first viewport, not a promise about it. It also works inside an app as the top of a result page, where the first thing a person wants is their number.

Do not use it for products with nothing to show yet. A left-weighted layout with an empty right half looks broken. If you only have words, use `hero-headline-lockup`. If you have photography, use `photo-led-hero`.

## Anatomy

Two columns on desktop, one stack on mobile. The grid is `minmax(0, 5fr) minmax(0, 7fr)`, so the visual gets the larger share.

- Left column: headline (one line to three short lines), one sentence of support at body size, one primary button and at most one text link. Left aligned, top aligned to the visual, not vertically centered in a huge empty box.
- Right column: a real product screen, a result card or a single large figure with its label and source. It bleeds off the right edge or the bottom of the hero; it does not float in a padded box with a glow behind it.
- Optional proof line under the buttons: one fact in `text-muted`, such as the number of items analyzed this week, with a date.

The big number, if you use one, is a real measured value rendered in tabular numerals with a label and an as-of date. It is one number, not a row of three.

## Do

- Put the product visual above the fold on a 1280 by 720 viewport. Crop it instead of shrinking it, so text inside stays readable.
- Keep the headline under 12 words and the support sentence under 25. Left align both.
- Use a real screenshot, a real export or a real data card. If the data is sample data, label it "Sample data" in the corner.
- Give the primary button the solid variant. The secondary action is a text link, not a ghost button.
- On mobile, put the visual below the text and let it run to the screen edge. Do not hide it.
- Mark the numeric figure with `font-variant-numeric: tabular-nums` and state what it measures.

## Don't

- Do not center the headline over a gradient and add a pill above it (LAY-01).
- Do not draw the product in CSS: nested rounded rectangles, gray skeleton bars and a fake chart are a mockup, not a product (AC-17).
- Do not wrap the visual in a window with three colored dots and monospace commands (CMP-07).
- Do not add a strip of "10K+ users, 99.9% uptime, 3x faster" under the buttons (CMP-06). Invented round numbers read as filler.
- Do not make the visual a different, brighter style than the product it shows. If the app is flat and gray, the hero is too.

## Swap recipe

Slop version: centered stack, pill, two buttons, drawn dashboard, number strip.

```html
<!-- before: LAY-01, AC-17, CMP-06 -->
<section class="hero" style="text-align:center">
  <span class="pill">New: AI reports</span>
  <h1 style="font-size:72px;letter-spacing:-0.05em">Ship smarter, grow faster</h1>
  <div class="buttons"><button class="solid">Get started</button><button class="ghost">Book a demo</button></div>
  <div class="fake-dashboard"><!-- 14 divs drawn with CSS --></div>
  <div class="stats"><b>10K+</b><b>99.9%</b><b>3x</b></div>
</section>
```

Fixed version: left-weighted grid, real capture, one number with a source.

```tsx
import { Button } from './blocks/button'

export function Hero() {
  return (
    <section className="mx-auto grid max-w-[1200px] items-center gap-12 px-6 py-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="max-w-[460px]">
        <h1 className="text-h1 lg:text-display font-semibold text-text">
          See which pages AI answers cite, and which it ignores
        </h1>
        <p className="mt-4 text-body text-text-muted">
          Paste a domain. You get a report of every cited URL and a fix list in about two minutes.
        </p>
        <div className="mt-8 flex items-center gap-4">
          <Button size="lg">Run a free report</Button>
          <a href="/sample" className="text-body text-text-muted hover:text-text">See a sample</a>
        </div>
        <p className="mt-6 text-label text-text-subtle tabular-nums">
          412 reports run in the last 7 days. Updated 24 Oct.
        </p>
      </div>
      <img
        src="/shots/report.png"
        alt="Citation report with a ranked list of cited pages"
        className="rounded-lg border border-border lg:-mr-24"
        width={1280}
        height={800}
      />
    </section>
  )
}
```

The `-mr-24` crop is what makes it asymmetric. Remove the pill, the second ghost button and the stat strip; that fixes LAY-01 and CMP-06 together.

## Tokens

- Type: `--t-display` (36px) at `lg`, `--t-h1` (30px) on mobile, `--t-body` for the support line, `--t-sm` and `--text-subtle` for the proof line. Weight `--w-semi`, line height `--lh-tight` for the headline.
- Space: `--sp-12` between columns, `--sp-16` vertical padding, `--sp-8` above the buttons.
- Surface: image border `--border`, radius `--r-card`. No `--sh-pop` here; nothing floats.
- Color: `--text`, `--text-muted`, `--text-subtle`. The solid button uses `--accent` and `--accent-fg`.
- Motion: none on load. If the visual slides in, use `--ease-out` and `--dur-modal` once.
