---
id: plain-headline-and-eyebrow
name: Plain headline and eyebrow
category: typography
uses: [emphasize-text]
surfaces: [landing]
replaces: [AC-01, COL-04, TYP-03, TYP-05]
components: []
inspiration: []
status: stable
---

## When to use

Use it for every section and hero headline. One typeface, one color, one weight change at most. A small eyebrow above it is allowed when it carries information (a category, a date, a step), set in normal case at default tracking.

It replaces three habits that now mark a page as generated: a gradient filled headline, one word swapped to an italic serif or another color, and a wide-tracked all-caps label above everything.

## Anatomy

- Eyebrow: `text-label` (12px), weight 500, sentence case, `letter-spacing: 0`, color `--text-muted`. One short phrase, no trailing dash.
- Headline: `h1` or `h2`, size from the type scale, weight 600, line height `--lh-tight` to `--lh-snug`, color `--text`. Tracking between 0 and -0.02em.
- Support line: `text-body` or `text-title` in `--text-muted`, under 70 characters per line.
- Spacing: `--sp-2` between eyebrow and headline, `--sp-4` between headline and support line.
- Emphasis: rewrite the sentence so the key word lands at the end, or step weight from 500 to 600 on a phrase. The color stays the same.

## Do

- Say the thing in a short heading, then explain it in body size. Under eight words is a good test.
- Use sentence case everywhere. Reserve capitals for proper nouns.
- Keep tracking at the font's default, or a mild -0.01em at display sizes.
- Test the heading in plain `color: var(--text)` first. Add nothing until it is clearly missing.
- Keep the eyebrow only if deleting it would lose a fact.

## Don't

- Do not fill heading glyphs with a gradient using `background-clip: text` (COL-04).
- Do not switch one word to an italic serif or an accent color inside a sans heading (TYP-03).
- Do not tighten large headings to -0.04em or more, where letters begin to touch (TYP-05).
- Do not set labels in uppercase with 0.1em or wider tracking (AC-01).
- Do not add a pill badge around the eyebrow. See plain-honest-copy for what to write instead.

## Swap recipe

Slop: tracked uppercase eyebrow, gradient headline, italic serif accent word.

```html
<!-- before: AC-01, COL-04, TYP-03, TYP-05 -->
<span class="eyebrow">THE FUTURE OF WORK</span>
<h1>Ship <em>faster</em> with AI</h1>
```
```css
.eyebrow { text-transform: uppercase; letter-spacing: 0.2em; font-size: 11px; }
h1 { letter-spacing: -0.06em; font-size: 72px;
     background: linear-gradient(90deg, #a78bfa, #ec4899); -webkit-background-clip: text; color: transparent; }
h1 em { font-family: 'Instrument Serif', serif; font-style: italic; }
```

Fixed: one face, one color, default tracking, emphasis through the sentence.

```css
/* after */
.eyebrow { font-size: var(--t-sm); font-weight: var(--w-med); color: var(--text-muted); letter-spacing: 0; }
h1 { font-size: var(--t-display); font-weight: var(--w-semi); line-height: var(--lh-tight);
     letter-spacing: -0.01em; color: var(--text); }
```
```html
<p class="eyebrow">Release notes, October</p>
<h1>Reports that update themselves</h1>
```

## Tokens

`--t-display`, `--t-h1`, `--t-h2`, `--t-sm`, `--w-med`, `--w-semi`, `--lh-tight`, `--lh-snug`, `--text`, `--text-muted`, `--sp-2`, `--sp-4`. Tailwind: `text-display`, `text-h1`, `text-label`, `font-semi`, `text-text-muted`. Tracking is a plain value (0 to -0.02em), not a token.
