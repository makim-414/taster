---
id: korean-type-setup
name: Korean type setup
category: typography
uses: [read-long-text]
surfaces: [landing, editorial, app]
replaces: [KO-02, KO-03, KO-04, KO-05, KO-06, KO-08, KO-11]
components: []
inspiration: []
status: stable
---

## When to use

Use it as the base layer of any Korean or bilingual page. Latin-first defaults fail Hangul in small, predictable ways: the font stack names only Latin faces so Hangul falls to the system default, line height is too tight, tracking designed for Latin headings is applied to Hangul, and the document is not marked as Korean at all.

Put these rules in once, at the root, and every component inherits them.

## Anatomy

- Language: `<html lang="ko">` for Korean pages. In mixed content, mark the Korean parts with `lang="ko"`.
- Face: name a Hangul-capable family on purpose, such as Pretendard or a Noto Sans KR family, ahead of the generic fallback. Load it with `@font-face` or a font service, with `font-display: swap`.
- Size: body 15 to 16px, captions and labels at 13px or larger. Never 12px for running text.
- Line height: body 1.6 to 1.8, headings around 1.3.
- Tracking: 0 for body, between 0 and -0.02em for display headings. Never wide, never tighter than -0.03em.
- Case: no `text-transform: uppercase` on Hangul. It has no effect on the letters but it still alters any Latin in the string.
- Emphasis: weight or color. No synthetic italics.
- Breaking: see korean-line-breaking.

## Do

- Declare the Latin face first and the Hangul face right after, so Latin glyphs keep the brand design: `'Brand Sans', 'Pretendard', system-ui, sans-serif`.
- Check that the Hangul font really loaded by rendering a sample and comparing it with the fallback.
- Scale the UI body up one step for Korean (14px to 15px) because Hangul strokes are denser.
- Use semibold 600 for emphasis. Check that the chosen family ships that weight for Hangul, not only for Latin.
- Keep footers and legal lines at 13px minimum.

## Don't

- Do not list only Latin fonts such as Inter in a Korean page and let Hangul fall to the OS default (KO-02).
- Do not use Latin line heights of 1.2 to 1.4 for Hangul body (KO-03).
- Do not apply `text-transform: uppercase` to Korean labels (KO-04).
- Do not carry `letter-spacing: 0.1em` or `-0.04em` from Latin headings onto Hangul (KO-05).
- Do not use `font-style: italic` on Hangul (KO-06), do not omit `lang` or leave it as `en` (KO-08), do not set body text at 12px or less (KO-11).

## Swap recipe

Slop: a Latin-only setup applied to Korean content.

```html
<!-- before: KO-08 -->
<html lang="en">
```
```css
/* before: KO-02, KO-03, KO-04, KO-05, KO-06, KO-11 */
body { font-family: 'Inter', sans-serif; font-size: 12px; line-height: 1.3; }
.label { text-transform: uppercase; letter-spacing: 0.12em; font-style: italic; }
h1 { letter-spacing: -0.05em; }
```

Fixed:

```html
<!-- after -->
<html lang="ko">
```
```css
:root { --font: 'Brand Sans', 'Pretendard', 'Noto Sans KR', system-ui, sans-serif; }
:lang(ko) body, body:lang(ko) { font-family: var(--font); font-size: 15px; line-height: 1.7; letter-spacing: 0; }
:lang(ko) h1, :lang(ko) h2 { line-height: 1.3; letter-spacing: -0.01em; }
:lang(ko) .label { text-transform: none; font-size: 13px; font-weight: var(--w-med); font-style: normal; }
:lang(ko) em { font-style: normal; font-weight: var(--w-semi); }
```

## Tokens

`--font` (with the Hangul family inside the stack), `--t-body` (use 15 to 16px for Korean), `--t-sm` (13px minimum for captions in Korean), `--lh-snug` (1.3, headings), `--lh-normal` (1.5, raise to 1.7 for Hangul body), `--w-med`, `--w-semi`. Letter spacing is a plain value (0 to -0.02em). Pair with korean-line-breaking and long-form-prose.
