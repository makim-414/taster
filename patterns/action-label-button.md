---
id: action-label-button
name: Specific action label
category: button
uses: [start-an-action]
surfaces: [landing, app]
replaces: [CPY-01, KO-09]
components: [blocks/button]
inspiration: []
status: stable
---

## When to use

Any button or link that starts an action, especially on pages in a language other than English and on landing pages where the label is the last thing read before a click. Use it when the current label would fit on any product ("Get started", "Learn more", "Unlock insights") or when the page language and the button language differ.

## Anatomy

- Verb first, then the object that changes: "Request a quote", "Download the price list", "Book a 20 minute call".
- Same language as the surrounding page. Brand names and units can stay as they are.
- One sentence of context above or beside the button says what happens next and what it costs, if it costs anything. The label does not carry that.
- Label length: 2 to 4 words in English, up to about 8 syllables in Korean or Japanese. Longer labels wrap on phones and lose the verb.
- Secondary link names the destination, not the act of reading: "Pricing", "Case: warehouse routing".

## Do

- Write the label after you know the result of the click, not before. If you cannot name the result, the screen does not know what it wants.
- Match the verb to the step. "Continue" is fine inside a flow, wrong as the first button of a landing page.
- Use the same label in the nav, the hero and the footer when they lead to the same place.
- On Korean pages use a natural polite form: "견적 요청하기", "무료 상담 신청". Check the label at 360px width with the real font.
- Keep an accessible name that stays unique when several "Details" buttons sit in one list (`aria-label="Details for order 1042"`).

## Don't

- Don't ship "Get started", "Learn more", "Explore", "Discover", "Unlock" as the only copy on a button.
- Don't leave an English call to action on a page whose body is another language. Readers notice the join.
- Don't pair a paired slogan with the button ("Build faster. Ship smarter.") and call it a label. A label is an instruction, not a mood.
- Don't use a question as a label ("Ready to grow?"). It makes the person answer instead of act.
- Don't use ALL CAPS with letter spacing to make a weak label feel strong.

## Swap recipe

Slop: generic English label on a Korean page, wide-tracked caps. Fixes CPY-01 (AI copy voice) and KO-09 (English button labels on a Korean page).

```tsx
// before
<a className="cta" style={{ textTransform: 'uppercase', letterSpacing: '0.2em' }}>
  Get started
</a>
<a className="link">Learn more</a>

// after
import { Button } from './blocks/button'

<Button size="lg" asChild>
  <a href="/quote">견적 요청하기</a>
</Button>
<a className="text-sm text-text-muted hover:text-text" href="/pricing">
  요금 보기
</a>
<p className="mt-2 text-xs text-text-muted">2영업일 안에 담당자가 연락드립니다. 비용은 없습니다.</p>
```

If your `Button` has no `asChild`, put the button inside the anchor or style the anchor with the same classes. The point is the text: one verb, one object, the page language, and a line under it that says what happens next.

## Tokens

- `--t-body`, `--w-med`: label size and weight, sentence case, default tracking.
- `--text-muted`, `--t-sm`: the line under the button.
- `--accent`, `--accent-fg`: the one filled button, see flat-solid-button.
- `--sp-2`, `--sp-3`: gap between the button, the secondary link and the helper line.
