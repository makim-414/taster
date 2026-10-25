---
id: korean-line-breaking
name: Korean line breaking and alignment
category: typography
uses: [read-long-text]
surfaces: [landing, editorial]
replaces: [KO-01, KO-10]
components: []
inspiration: []
status: stable
---

## When to use

Use it on every page that contains Korean paragraphs or headings. Browsers treat each Hangul syllable as a break opportunity by default, so a line can end in the middle of a word and leave a single stray syllable at the start of the next. The fix is two lines of CSS, and it applies to the whole document, not only to long articles.

Also use it to stop justified Korean text. Hangul has spaces between phrases, not between every word as Latin has between letters, and justification stretches those spaces unevenly.

## Anatomy

- Break rule: `word-break: keep-all` so lines break at spaces, never inside a word.
- Safety valve: `overflow-wrap: anywhere` so a long URL, an email or a product code can still wrap instead of overflowing.
- Alignment: `text-align: left` (or `start`) for paragraphs. Centered text is acceptable for one- or two-line headings only.
- Scope: set it on `:lang(ko)` or on `html[lang="ko"]` so Latin text elsewhere on the page is unaffected.
- Headings: add `text-wrap: balance` to avoid a one-word last line.
- Paragraphs: `text-wrap: pretty` where supported, as a progressive enhancement.

## Do

- Put the rules in the base stylesheet once, not per component.
- Check the narrowest layout (360px). `keep-all` makes lines ragged when a word is long, which is correct, but a container narrower than 12em can overflow, so keep `overflow-wrap: anywhere`.
- Insert `<wbr>` or `&nbsp;` for names, numbers with units and short phrases that must stay together ("3개월", "월 9,900원").
- Left align and let the right edge be ragged.
- Review headings in Korean separately from the English version. Line lengths differ.

## Don't

- Do not leave `word-break: normal` or `break-all` on Korean text (KO-01).
- Do not use `word-break: break-word` as a fix. It is a legacy alias with different behavior across engines.
- Do not apply `text-align: justify` to Korean paragraphs (KO-10).
- Do not rely on `keep-all` without `overflow-wrap`, which causes horizontal scroll on long strings.
- Do not hard-break lines with `<br>` to fit one viewport. It breaks on every other width.

## Swap recipe

Slop: default breaking and justified paragraphs.

```css
/* before: KO-01, KO-10 */
p { text-align: justify; }                 /* uneven gaps between words */
h1, p { word-break: normal; }              /* "서비스" can split as "서비" / "스" */
```

Fixed: keep words whole, wrap long strings, align left.

```css
/* after */
:lang(ko) {
  word-break: keep-all;
  overflow-wrap: anywhere;
}
:lang(ko) p, :lang(ko) li { text-align: left; text-wrap: pretty; }
:lang(ko) h1, :lang(ko) h2, :lang(ko) h3 { text-wrap: balance; }
```

```html
<html lang="ko">
<p>이번 달부터 <span style="white-space: nowrap">월 9,900원</span>으로 모든 리포트를 내려받을 수 있습니다.</p>
```

## Tokens

No color or space token is involved. The rules attach to the `lang` attribute, so they depend on korean-type-setup (`<html lang="ko">`). Related type tokens: `--lh-normal` is too tight for Hangul body, use 1.6 to 1.8 as set in korean-type-setup. The detection signal for KO-01 is a measured line ending between two syllables of one word.
