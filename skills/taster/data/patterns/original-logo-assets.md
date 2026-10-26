---
id: original-logo-assets
name: Original logo assets
category: icon
uses: [set-the-visual-foundation]
surfaces: [landing, app]
replaces: [AC-18]
components: []
inspiration: []
status: draft
---

## When to use

Use it every time a logo, wordmark, app icon or partner mark appears on a page. The rule is simple: use the file you were given, unchanged. If a coding agent is asked to "add the logo" and no file exists, the correct output is a placeholder and a request for the asset, not a redrawn approximation.

This also covers third-party marks such as payment, platform or integration logos: take the official asset from the owner's brand page and respect its clear space and colorways.

## Anatomy

- Source: an SVG exported from the design tool with text converted to outlines, so the wordmark does not depend on an installed font.
- Variants: full lockup, compact mark, and single-color versions for light and dark backgrounds, as separate files.
- Placement: an `<img>` or inline `<svg>` with `width` and `height` set, a minimum clear space of half the mark height on every side.
- Color: single-color logos take `currentColor` only when the brand allows it; otherwise ship both colorways and switch with the theme.
- Alt text: the brand name for a stand-alone logo, empty alt when the name is printed beside it.

## Do

- Ask for the vector file and export with outlined text. Keep the original in `/assets/logo/` untouched.
- Scale proportionally only. Lock the aspect ratio.
- Supply a dark-mode and a light-mode version rather than inverting with CSS filters.
- Keep a minimum size (often 16 to 24px tall for a compact mark) and switch to the compact mark below it.
- Mark placeholder slots clearly in code (`TODO: logo asset`) so they are not forgotten.

## Don't

- Do not re-trace a logo from a screenshot, or redraw it with "similar" shapes (AC-18).
- Do not replace the wordmark's typeface with a system or web font because the original font is not installed.
- Do not stretch, rotate, outline, add shadows or put it in a gradient.
- Do not crop a logo into a circle or round square unless the brand supplies that variant.
- Do not build a fake logo cloud from names invented for the demo.

## Swap recipe

Slop: a wordmark typed in a lookalike font.

```html
<!-- before: AC-18 -->
<a class="logo" style="font-family: 'Inter', sans-serif; font-weight: 800; letter-spacing: -0.04em;">
  Brandname
</a>
```

Fixed: the supplied outlined SVG, with a themed pair.

```html
<!-- after -->
<a href="/" class="logo">
  <img class="logo-light" src="/assets/logo/wordmark-dark.svg" alt="Brandname" width="132" height="28" />
  <img class="logo-dark"  src="/assets/logo/wordmark-light.svg" alt="" width="132" height="28" aria-hidden="true" />
</a>
```

```css
.logo-dark { display: none; }
:root[data-theme="dark"] .logo-light { display: none; }
:root[data-theme="dark"] .logo-dark  { display: inline; }
.logo img { height: 28px; width: auto; }   /* proportional scale only */
```

## Tokens

Logos carry their own colors and are not tokenized. Only the surroundings use tokens: `--sp-4` clear space, `--bg` and `--bg-elev` for the surface behind the mark, and the `data-theme` attribute from token-themes to switch colorways. Do not map a brand color onto `--brand` by sampling a logo screenshot.
