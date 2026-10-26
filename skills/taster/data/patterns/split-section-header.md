---
id: split-section-header
name: Split section header
category: feature-section
uses: [explain-features, emphasize-text]
surfaces: [landing]
replaces: [AC-01, LAY-01, TYP-03, TYP-04]
components: []
inspiration: []
status: stable
---

## When to use

Use it as the header of every content section below the hero: features, how it works, results, pricing. It replaces the centered stack of tracked uppercase kicker, giant title and gray subtitle, which every generated page repeats. The header is split: title on the left, supporting text on the right, so the section opens with a clear left edge and a short line of context.

Skip it for the hero (use `hero-headline-lockup`) and for sections whose content already carries its own heading, such as an FAQ with a split title (`split-title-faq`).

## Anatomy

A two-column grid at `lg`, `minmax(0, 1fr) minmax(0, 1fr)`, with `align-items: end` so the baselines of the last lines meet.

- Left: an optional lowercase eyebrow in `--text-subtle` at `--t-sm` (normal case, normal tracking), and the section title at `--t-h1` or `--t-h2`. The title is 2 to 8 words.
- Right: one to three sentences at `--t-body` in `--text-muted`, max 45ch, optionally with a text link. The right column is `justify-self: end`.
- Below: `--sp-12` before the section content.

On mobile the columns stack: eyebrow, title, supporting text, each `--sp-3` apart, all left aligned. The eyebrow is a regular sentence-case word or phrase. If you cannot say what it adds, delete it.

## Do

- Left align everything. The section's content below should share the same left edge.
- Keep the title short and concrete: "Reports", "How a report is made", "What teams measured".
- Put what the section means to the reader in the right column, not another slogan.
- Align the right column to the end of the container so it forms a clear second axis.
- Use a heading level that matches the page outline (`h2`), and make the eyebrow a `<p>`.
- Set the title in the heading font only, one weight, one color.

## Don't

- Do not set the kicker in uppercase with wide letter-spacing (AC-01), even at 12px.
- Do not center a giant title with a centered subtitle under it (LAY-01).
- Do not switch one word of the title into an italic serif or a gradient color (TYP-03).
- Do not use a long sentence at display size (TYP-04). If the title has more than 8 words, cut it and move the rest to the right column.
- Do not repeat the same header layout with different words for ten sections in a row; some sections need no header at all.

## Swap recipe

Slop version: centered stack, tracked kicker, italic serif word.

```html
<!-- before: AC-01, LAY-01, TYP-03, TYP-04 -->
<header style="text-align:center">
  <div style="text-transform:uppercase;letter-spacing:.22em;font-size:12px;color:#8b5cf6">WHY IT WORKS</div>
  <h2 style="font-size:64px">Everything you need to <em style="font-family:'Instrument Serif'">scale</em> your content engine without the busywork</h2>
  <p style="max-width:640px;margin:0 auto">A platform built for modern teams.</p>
</header>
```

Fixed version: left title, right context, plain case.

```tsx
<header className="grid items-end gap-6 lg:grid-cols-2 lg:gap-12">
  <div>
    <p className="text-label text-text-subtle">How it works</p>
    <h2 className="mt-2 text-h1 font-semibold tracking-[-0.02em] text-text">From domain to fix list</h2>
  </div>
  <p className="max-w-[45ch] text-body text-text-muted lg:justify-self-end">
    We fetch your pages, ask the same ten questions a buyer would ask, and list every page the answers cite and every one they skip.
  </p>
</header>
<div className="mt-12">{/* section content */}</div>
```

Check: no `text-transform`, no `letter-spacing` above 0, one font on the `h2`, left column at least twice as wide in characters as the eyebrow.

## Tokens

- Type: title `--t-h1` (30px) or `--t-h2` (24px), `--w-semi`, `--lh-snug`; eyebrow `--t-sm` in `--text-subtle`; supporting text `--t-body` in `--text-muted`.
- Tracking: title default or -0.02em; eyebrow default.
- Space: `--sp-12` column gap on desktop, `--sp-6` row gap on mobile, `--sp-12` below the header.
- Color: `--text`, `--text-muted`, `--text-subtle`. No accent on the header.
- Motion: none. If you reveal the title by scroll, do it once per page, not per section.
