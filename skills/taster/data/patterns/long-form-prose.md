---
id: long-form-prose
name: Long-form prose
category: typography
uses: [read-long-text]
surfaces: [editorial]
replaces: [KO-03, KO-11]
components: []
inspiration: []
status: stable
---

## When to use

Use it for anything people read in paragraphs: articles, documentation, changelogs, privacy and terms pages, essays. These pages need a reading column, not a layout. Legal and policy pages in particular should render as plain prose with clear headings, not as a card grid with icons.

Pair it with korean-type-setup when the text is Korean, since the numbers below (size, line height) shift for Hangul.

## Anatomy

- Column: `max-width: 65ch` for Latin, about 34 to 40 full-width characters per line for Korean. Centered, or left aligned beside a table of contents on wide screens.
- Body: 16 to 18px, line height 1.65 to 1.8, color `--text`, paragraph spacing 1em to 1.25em, no first-line indent.
- Headings: h2 at 24px, h3 at 18px, weight 600, line height 1.3, with space above larger than below (2em above, 0.5em below).
- Quotes: a `blockquote` set off with indentation and a muted color or italic Latin; no thick colored side bar.
- Lists and code: bullets with 0.5em gaps, inline code in the mono face at 0.9em, code blocks on `--bg-sunken`.
- Meta: author, date and reading time in one muted line under the title.

## Do

- Set the measure first. A column wider than 80 characters tires the reader.
- Make anchors for each heading and show a short table of contents for pages over 1,500 words.
- Use real HTML structure: `article`, `h1` to `h3`, `ul`, `blockquote`, `time`.
- Render policy documents as the same prose styles, with numbered clauses if the text numbers them.
- Test at 360px and at 1440px. The column should shrink to the viewport minus 16px gutters.

## Don't

- Do not set Korean body text with a Latin line height of 1.2 to 1.4 (KO-03). Use 1.6 to 1.8.
- Do not set Korean body or captions at 12px or smaller (KO-11). 15 to 16px for body, 13px minimum for captions.
- Do not mark a quote with a 4px colored border on the left.
- Do not break a policy page into cards with icons per clause.
- Do not justify the text. See korean-line-breaking for why.

## Swap recipe

Slop: cramped, narrow type on a full-width page.

```css
/* before: KO-03, KO-11 */
.article { width: 100%; font-size: 12px; line-height: 1.3; }
blockquote { border-left: 4px solid #6366f1; background: #eef2ff; padding: 12px; }
```

Fixed: a reading column.

```css
/* after */
.prose { max-width: 65ch; margin-inline: auto; padding-inline: var(--sp-4);
         font-size: 16px; line-height: 1.7; color: var(--text); }
.prose[lang="ko"] { max-width: 38em; line-height: 1.75; }
.prose h2 { font-size: var(--t-h2); line-height: var(--lh-snug); margin: 2em 0 0.5em; }
.prose p { margin: 0 0 1.1em; }
.prose blockquote { margin: 1.5em 0; padding-left: var(--sp-4); color: var(--text-muted); }
.prose code { font-family: var(--font-mono); font-size: 0.9em; background: var(--bg-sunken); padding: 0.1em 0.35em; border-radius: var(--r-sm); }
```

```html
<article class="prose" lang="en"><h1>Title</h1><p class="meta"><time>2026-10-01</time> · 6 min read</p>...</article>
```

## Tokens

`--sp-4` (gutter), `--t-h2`, `--lh-snug`, `--text`, `--text-muted`, `--bg-sunken` (code), `--r-sm`, `--font`, `--font-mono`. Reading size (16 to 18px) and line height (1.65 to 1.8) are set on the prose class itself because the app scale `--t-body` (14px) is tuned for UI, not for reading.
