---
id: brand-wire-form
name: Brand wire form
category: motion-particle
uses: [set-the-mood]
surfaces: [landing, auth-onboarding]
replaces: [BG-01, COL-01, COL-03]
components: [motion/wireframe-form]
inspiration: [https://21st.dev/@mengto/components/wireframe-forms]
status: stable
---

## When to use

Use it behind a short hero or a sign-in screen when the page needs a presence, and you want that presence to belong to this brand. It is a thin line figure turning slowly in one color. Unlike a blurred glow, it can carry something of the brand: its color, a figure built from its name, or its own mark.

For a neutral field with no brand in it, use `ambient-background`. Do not use it behind dense text, tables or long forms.

## Anatomy

- One canvas in an absolutely positioned layer, with `pointer-events: none`, `aria-hidden="true"` and the page surface behind it.
- Thin lines (1px by default) with small dots on the corners. Far lines are fainter, so one color still reads as depth.
- Three ways to fit the brand, from least to most specific:
  - Color: `var(--brand)` by default, so a theme from `brand_theme` changes it with no edit.
  - Name: `form="generated"` with `seed="Brand name"`. The same text always gives the same figure.
  - Mark: `mark` takes the `d` of the brand's SVG path and extrudes it into the figure.
- Built-in figures for when none of that applies: `star`, `cube`, `cylinder`, `icosphere`.

## Do

- Keep the headline at full contrast. Lower `opacity` until the figure sits behind the words.
- Place it off center or size it to the free side when the copy is left aligned.
- Use the mark only with the original path from the brand's own file, and keep the real logo elsewhere on the page.
- Stop the loop off screen and when the tab is hidden. Reduced motion draws one still frame. The component does all of this.

## Don't

- Do not use the extruded mark in place of the logo. It is a background, and the logo stays the original file (AC-18).
- Do not add a glow, a blur or a colored shadow to the lines (COL-07).
- Do not stack it with another moving background.
- Do not raise the speed until people watch it. It should turn slower than reading speed.

## Swap recipe

Slop: blurred blobs that could belong to any product.

```html
<div class="absolute -left-20 top-0 h-[40rem] w-[40rem] rounded-full bg-violet-600/40 blur-[120px]"></div>
```

Fixed: one line figure in the brand color, built from the brand name.

```tsx
import { WireframeForm } from './motion/wireframe-form'

<section className="relative overflow-hidden">
  <WireframeForm form="generated" seed="Acme" opacity={0.5} />
  <div className="relative">{/* headline */}</div>
</section>
```

## Tokens

`--brand` by default, or any color passed to `color`. The figure reads it again when the theme changes.
