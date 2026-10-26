---
id: type-system
name: Type system
category: typography
uses: [set-the-visual-foundation, organize-the-page]
surfaces: [landing, app, editorial]
replaces: [AC-15, TYP-01, TYP-02, TYP-04]
components: []
inspiration: []
status: stable
---

## When to use

Use it at the start of any project, before the first heading is styled. A type system is four decisions: which face for headings, which for body, how they load, and which sizes exist. Written down in a dozen lines of CSS, it stops the two common failures: everything in the default font because nothing loaded, and everything in the font every other generated page uses.

Revisit it when a new language or a new surface (print, email, dashboard) joins the project.

## Anatomy

- Faces: one heading face and one body face, or one family doing both. Be able to say in one line why they were chosen ("a humanist sans for long reading, a tighter grotesk for headings").
- Loading: real files via `@font-face` or a font service, `font-display: swap`, subset to the languages in use, preloaded for the heading weight.
- Stack: an explicit fallback order ending in a generic family: `'Brand Sans', 'Pretendard', system-ui, sans-serif`. The first name is the one you chose.
- Scale: a short fixed set. Title, subtitle and body cover most pages; add display, h1, h2, label, caption only when needed.
- Roles: heading weight 600, body 400, labels 500. Numbers in tables use `tabular-nums`.
- Page header: a title and a one-line subtitle beneath it, left aligned, with an optional right slot for actions.

## Do

- Verify the font loaded. Open the Network panel or run `document.fonts.check('600 24px "Brand Sans"')` before declaring done.
- Keep the scale to six to eight sizes and use only those. A new size needs a reason.
- Pair by contrast of role, not decoration: a sturdy sans for UI, a serif only if the content is editorial.
- Choose from the brand context, then write the reason in the CSS comment next to the stack.
- Keep body text at 14 to 16px, with line height 1.5 for UI and 1.6 or more for reading.

## Don't

- Do not leave h1 to h3 and body falling back to Times, Arial or `system-ui` because a named font silently failed (AC-15).
- Do not default to Inter for headings, body and buttons without a reason (TYP-01).
- Do not swap Inter for the next favorite (a geometric grotesk, a display serif) just because Inter was banned (TYP-02). The substitute is the same habit.
- Do not set a sentence of eight words or more as a giant 64px-plus headline (TYP-04). Shorten it and move the explanation to body size.
- Do not use five weights and ten sizes in one view.

## Swap recipe

Slop: a named font that never loads, the default favorite, and a sentence-length display heading.

```css
/* before: AC-15, TYP-01, TYP-04 */
body { font-family: 'Inter'; }                       /* no @font-face, falls to Times or system-ui */
h1 { font-size: 72px; }                              /* "The all-in-one platform that helps teams ship faster" */
```

Fixed: chosen faces, real loading, explicit fallback, token scale.

```css
/* after: a humanist sans for body, a tighter grotesk for headings. Chosen for long reading and compact UI. */
@font-face {
  font-family: 'Brand Sans'; font-weight: 400 600; font-display: swap;
  src: url('/fonts/brand-sans.woff2') format('woff2');
}
:root {
  --font: 'Brand Sans', 'Pretendard', -apple-system, system-ui, sans-serif;
  --font-display: 'Brand Display', var(--font);
}
body { font-family: var(--font); font-size: var(--t-body); line-height: var(--lh-normal); }
h1 { font-family: var(--font-display); font-size: var(--t-h1); line-height: var(--lh-tight); font-weight: var(--w-semi); }
```

```html
<h1>Plans that scale with the team</h1>
<p class="subtitle">Pay per seat, change anytime, keep every export.</p>
```

## Tokens

`--font`, `--font-mono`, `--font-display` (optional, Tailwind `font-display`), `--t-display` (36), `--t-h1` (30), `--t-h2` (24), `--t-title` (16), `--t-body` (14), `--t-sm` (12), `--t-xs` (11), `--t-micro` (10), `--w-reg`, `--w-med`, `--w-semi`, `--lh-tight`, `--lh-snug`, `--lh-normal`. Tailwind: `text-display`, `text-h1`, `text-title`, `text-body`, `text-label`, `font-semi`.
