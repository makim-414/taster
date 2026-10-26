---
id: product-first-section-order
name: Product-first section order
category: layout-shell
uses: [organize-the-page, introduce-the-product]
surfaces: [landing]
replaces: [LAY-04]
components: []
inspiration: []
status: draft
---

## When to use

Use it when you plan a landing page, before any section is built. The default sequence (hero, logo strip, three feature cards, three price tiers, testimonials, footer) is the sequence of every template, so it tells the visitor nothing about this product. Order the sections by what only this product has, and let that decide what comes second.

Start by finishing this sentence: "The one thing here that a visitor cannot get elsewhere is ...". That thing goes in the first screen, as the real product, not as a description of it.

## Anatomy

- Zone 1, identity: a short heading, one support line, one primary action, and the real product screen or photo in the same view.
- Zone 2, the unique part: the feature, data or process only this product has, shown with a real capture, a table or a diagram. This is the longest section.
- Zone 3, evidence: real numbers with sources, real customers, or a worked example. Omit the zone if none exist.
- Zone 4, fit: who it is for and what it costs, in a list or a table, with as many plans as exist.
- Zone 5, next step: one action and a footer with contact.
- Widths: fixed container per zone, for example 1200px for visual zones, 900px for tables, 760px for reading text. The same three widths across the page.

## Do

- Write the section order as a list before designing. Each item names the visitor's question it answers.
- Lead with the screen. Show the product in the first viewport at its real state.
- Make section lengths unequal. The zone that matters most is the tallest.
- Cut any section that exists only because templates have it (logo strip, newsletter, FAQ with generic questions).
- Keep one primary action and repeat it, instead of adding secondary actions per section.

## Don't

- Do not default to hero, logo strip, three cards, pricing, quotes, footer in that order (LAY-04).
- Do not give every section the same height, the same padding and the same centered heading.
- Do not put proof sections (logos, quotes) before the visitor has seen the product.
- Do not add a section to fill a gap in the layout.
- Do not invent customers or numbers to keep the template complete.

## Swap recipe

Slop: the template order.

```html
<!-- before: LAY-04 -->
<section class="hero">...</section>
<section class="logos">...</section>
<section class="features grid-3">...</section>
<section class="pricing grid-3">...</section>
<section class="testimonials">...</section>
<footer>...</footer>
```

Fixed: the order follows the product, widths come from a small set.

```html
<!-- after -->
<section class="zone zone--wide hero">  <!-- heading, one line, one action, real product screen -->
<section class="zone zone--wide only-us"> <!-- the thing no one else has, in a real capture -->
<section class="zone zone--table evidence"> <!-- sourced numbers, or removed -->
<section class="zone zone--table fit">      <!-- who it is for, plans as they really are -->
<section class="zone zone--text next">      <!-- one action -->
<footer>...</footer>
```

```css
.zone { margin-inline: auto; padding-inline: var(--sp-4); padding-block: var(--sp-16); }
.zone--wide { max-width: 1200px; }
.zone--table { max-width: 900px; }
.zone--text { max-width: 760px; }
.only-us { padding-block: var(--sp-16) calc(var(--sp-16) * 1.5); }  /* the main section gets more room */
```

## Tokens

`--sp-4` (gutter), `--sp-12`, `--sp-16` (zone padding, vary per zone), `--bg`, `--bg-elev`, `--border`, `--t-display`, `--t-h2`, `--t-body`. Container widths (1200, 900, 760) are layout constants, kept in one place and reused. Combine with spacing-and-dividers for the rhythm between zones.
