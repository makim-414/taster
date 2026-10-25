---
id: korean-natural-copy
name: Korean-first copy
category: typography
uses: [introduce-the-product]
surfaces: [landing]
replaces: [CPY-01, KO-07, KO-09]
components: []
inspiration: []
status: draft
---

## When to use

Use it whenever Korean text on a page was written in English first and then translated, by a person or by a model. The tell is a sentence that is grammatical and means nothing: a literal "experience the future of X", "a new dimension of Y", "your journey starts here". Korean readers notice immediately, and so does search.

Write the Korean from the product fact up, as if no English version existed. Then check buttons and menu labels, which are the parts most often left in English.

## Anatomy

- Sentence: short, one idea, the subject often dropped as Korean does. Endings are consistent (formal 합니다 or friendly 해요), chosen once for the whole page.
- Claim: one concrete fact: a number with a unit, a named object, a time. "견적은 24시간 안에 메일로 보냅니다."
- Nouns over borrowed abstractions: prefer the plain Korean or established Sino-Korean word over a transliterated English one, unless the English word is what users really say.
- Buttons: a verb phrase that says the result: "견적 받기", "샘플 신청", "내려받기". Not "시작하기" when nothing starts.
- Menus and labels: Korean throughout, with Latin only for product names and units.
- Numbers: Korean grouping and units: 9,900원, 3개월, 1만 2천 건.

## Do

- Read it aloud as a person would say it across a table. If it sounds like a slogan, rewrite.
- Keep one politeness level on the page. Switching between 합니다 and 해요 is noticeable.
- Translate button text and placeholders, and keep a Latin brand name only where it is the name.
- Prefer the verb the user knows from the task ("받기", "보내기", "신청") over generic "시작하기" and "더 알아보기".
- Have a Korean speaker review the final text. A machine pass is a draft.

## Don't

- Do not leave "Get started" and "Learn more" on a Korean page (KO-09).
- Do not ship literal renderings such as "미래를 경험하세요" or "새로운 차원의 경험" (KO-07).
- Do not write "빠르게 만들고 똑똑하게 출시하세요" style parallel slogans (CPY-01).
- Do not mix honorific levels or stack three nominalizations in one sentence.
- Do not keep every English term in Latin letters when a natural Korean word exists.

## Swap recipe

Slop: translated slogan with English buttons.

```html
<!-- before: KO-07, KO-09, CPY-01 -->
<h1>미래의 업무 방식을 경험하세요</h1>
<p>새로운 차원의 워크플로우로 더 빠르게, 더 스마트하게.</p>
<button>Get started</button> <a>Learn more</a>
```

Fixed: a fact, plain sentence, concrete buttons.

```html
<!-- after -->
<h1>주문서를 올리면 견적서가 나옵니다</h1>
<p>엑셀이나 PDF 주문서를 올리면 품목별 단가를 맞춰 견적서를 만들고, 24시간 안에 메일로 보냅니다.</p>
<button>견적서 받기</button> <a href="/samples">샘플 보기</a>
```

```css
:lang(ko) .btn { font-size: 15px; letter-spacing: 0; text-transform: none; }
```

## Tokens

Copy is not tokenized, but the surrounding type is: `--t-h1` for the headline, `--t-body` at 15 to 16px for Korean, `--text` and `--text-muted`. Set `lang="ko"` and use korean-type-setup so Hangul renders in the intended face. Reuse plain-honest-copy for the discipline of one fact per sentence.
