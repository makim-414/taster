---
id: editorial-paper-sheet
name: Editorial paper sheet
category: layout-shell
uses: [organize-the-page, read-long-text]
surfaces: [editorial]
replaces: [CMP-04, COL-01]
components: []
inspiration: []
status: draft
---

## When to use

Use it for documents that are read like print: proposals, reports, briefs, rate sheets, one-page summaries, decks that will also be exported to PDF. A sheet is a fixed-size page on a warm paper tone with a narrow title column, numbered sections and evidence next to the text.

Use it when the reader will scroll or page through a finished document. Do not use it for an interactive app screen, and do not use it for a marketing hero.

## Anatomy

- Sheet: a fixed aspect ratio (A4 portrait or 16:9 landscape), a warm neutral background, generous margins (about 8% of width), centered on a darker desk surface on screen.
- Cover: a narrow left column carrying the title, a short subtitle and meta (date, version, author), the right side mostly empty or holding one image.
- Content page: a section number, a heading, then body and one evidence element (table, figure or short list). Hairline rules instead of boxes.
- Spread: two columns, lead-in text on the left and evidence metrics on the right, sources in a small caption.
- Type: a serif or a refined sans for headings, a legible sans for body, 11 to 12pt equivalent, tabular figures in tables.
- Furniture: running header with the document name, footer with the page number and the date.

## Do

- Number only what the reader will cite: sections, tables, figures. The numbers are navigation.
- Draw tables with hairline row rules and no vertical lines. Right align figures.
- Let whitespace carry structure. A section break is a larger margin and a rule.
- Give every figure a caption with a source and date.
- Export to PDF and look at the actual pages. Check breaks, orphans and widows before sending.

## Don't

- Do not give every content block the same large radius and soft shadow (CMP-04). Paper has square corners and no shadow inside the sheet.
- Do not use a purple gradient for the cover or the section bands (COL-01).
- Do not fill pages edge to edge. A sheet without margins reads as a web page.
- Do not mix more than two type families.
- Do not place a decorative illustration in place of evidence.

## Swap recipe

Slop: a document made of rounded cards with gradients.

```css
/* before: CMP-04, COL-01 */
.page { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 24px; }
.block { background: #fff; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,.15); padding: 24px; margin: 16px 0; }
```

Fixed: a paper sheet with margins and hairlines.

```css
/* after */
.desk { background: var(--bg-sunken); padding: var(--sp-8) var(--sp-4); }
.sheet {
  aspect-ratio: 210 / 297; width: min(100%, 794px); margin: 0 auto var(--sp-8);
  background: var(--paper, oklch(0.985 0.004 85)); color: var(--text);
  padding: 8% 9%; border: 1px solid var(--border);
}
.sheet .num { font-size: var(--t-sm); color: var(--text-muted); }
.sheet h2 { font-size: var(--t-h2); line-height: var(--lh-snug); margin: var(--sp-2) 0 var(--sp-4); }
.sheet table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.sheet td { padding: var(--sp-2) 0; border-bottom: 1px solid var(--border-soft); }
```

```html
<section class="sheet"><span class="num">02</span><h2>Scope and schedule</h2>...</section>
```

## Tokens

`--bg-sunken` (desk), `--border`, `--border-soft`, `--text`, `--text-muted`, `--sp-2`, `--sp-4`, `--sp-8`, `--t-h2`, `--t-sm`, `--lh-snug`, `--font`. `--paper` is a theme-level token you define once (a warm off-white, around `oklch(0.985 0.004 85)`); keep it out of the app theme. For print, set `@page` margins and `break-inside: avoid` on figures.
