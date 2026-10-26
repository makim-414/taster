---
id: plain-section-surface
name: Plain section surface
category: layout-shell
uses: [organize-the-page]
surfaces: [landing]
replaces: [BG-01, CMP-05, COL-03]
components: []
inspiration: []
status: stable
---

## When to use

Use it as the default for every section background on a marketing page: a solid token surface and nothing behind the content. Soft color blobs, aurora gradients, radial halos and permanent frosted glass panels are the generated-page look, and they cost paint time and contrast.

Add atmosphere only after the layout works without it, and only in one place (a hero, a closing section). If the section looks empty, add content or spacing, not a glow.

## Anatomy

- Surface: `--bg` for the page, `--bg-elev` or `--bg-sunken` for an alternate band. Two surfaces alternate at most.
- Edge: sections meet at a hairline (`--border`) or at a change of surface, not at a gradient fade.
- Content: sits directly on the surface. Panels inside use opaque `--bg-elev` with a hairline.
- Blur: `backdrop-filter` appears only on layers that really overlap content: a sticky nav over scrolling text, a modal over the page.
- Reduced transparency: `prefers-reduced-transparency` swaps translucent surfaces for opaque ones, as the tokens already do.

## Do

- Start with a flat surface and judge the section by its typography and spacing.
- If a visual accent is needed, use one real image or one pattern that is part of the brand, placed deliberately.
- Alternate `--bg` and `--bg-sunken` to mark rhythm on long pages.
- Use blur at 8 to 16px on the sticky nav with a 70 to 85% opaque surface and a bottom hairline.
- Check contrast against the actual surface, not against an assumed one.

## Don't

- Do not place blurred color orbs behind the hero or in the corners of sections (BG-01).
- Do not wrap every card in `backdrop-filter: blur(20px)` with a translucent fill (CMP-05).
- Do not put a near-black background under a glowing accent to make a section feel premium (COL-03).
- Do not animate background blobs. They run the GPU for nothing.
- Do not add a noise or grid overlay to hide a weak layout.

## Swap recipe

Slop: aurora blobs and glass cards.

```css
/* before: BG-01, CMP-05, COL-03 */
.hero::before { content: ""; position: absolute; width: 600px; height: 600px; border-radius: 50%;
  background: #7c3aed; filter: blur(120px); opacity: .5; top: -200px; left: 20%; }
.card { background: rgba(255,255,255,.06); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,.12); }
body { background: #050505; }
```

Fixed: flat surface, opaque panels, blur only on the sticky nav.

```css
/* after */
.section { background: var(--bg); }
.section--alt { background: var(--bg-sunken); border-block: 1px solid var(--border); }
.card { background: var(--bg-elev); border: 1px solid var(--border); border-radius: var(--r-card); }
.nav {
  position: sticky; top: 0;
  background: color-mix(in oklch, var(--bg) 80%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
}
@media (prefers-reduced-transparency: reduce) { .nav { background: var(--bg); backdrop-filter: none; } }
```

```html
<section class="section"> ... </section>
<section class="section section--alt"> ... </section>
```

## Tokens

`--bg`, `--bg-elev`, `--bg-sunken`, `--border`, `--r-card`, `--scrim` (behind modals only). The `prefers-reduced-transparency` block in `tokens.css` already makes `--bg-elev` opaque and the scrim darker. No gradient or blur token exists on purpose; blur is a local decision for overlapping layers.
