---
id: plain-honest-copy
name: Plain and specific copy
category: typography
uses: [introduce-the-product]
surfaces: [landing, app]
replaces: [AC-02, CPY-01]
components: []
inspiration: []
status: stable
---

## When to use

Use it on every line of UI text before it ships: hero lines, button labels, empty states, error messages, release notes. The test is whether the sentence could sit on any other product's page. If it could, it is not yet copy, it is filler.

It also covers punctuation. Long dashes are the most recognizable mark of generated text, so clauses are joined with a comma, colon, period or middle dot, and numeric ranges use a tilde or the word "to".

## Anatomy

- Claim: one concrete fact that only this product can state (a number with a unit, a named thing it connects to, a thing it refuses to do).
- Shape: a short sentence, active voice, the subject first. No pair of matched clauses ("faster, smarter, simpler").
- Punctuation: comma, colon, period, middle dot (U+00B7), tilde for ranges (`9~18`), the word "to" in prose.
- Labels: noun or verb plus object. "Export CSV", not "Get started". Headings and buttons never contain a dash.
- Proof: if a number is used, it has a source or a date next to it.

## Do

- Replace adjectives with measurements: "imports 40,000 rows in about a minute" instead of "blazing fast".
- Name the real thing: the file type, the integration, the plan limit.
- Write the empty state and the error as you would say them across a desk.
- Search the text for U+2014 and U+2013 before release, and rewrite the sentence rather than swapping the character.
- Read the copy aloud. If you run out of breath or smile, cut it.

## Don't

- Do not join clauses with long dashes (AC-02). Use a comma, colon or period.
- Do not write "Build faster, ship smarter" or "not just X, but Y" (CPY-01). They have the rhythm of a claim and no content.
- Do not open with "Welcome to the future of" or "Experience the power of".
- Do not use stock verbs that say nothing: empower, supercharge, revolutionize, game-changing.
- Do not invent a statistic to fill a slot. An empty slot is better than a fake number.

## Swap recipe

Slop: long dashes and stock parallelism.

```html
<!-- before: AC-02, CPY-01 -->
<h1>Build faster &mdash; ship smarter</h1>
<p>Our seamless platform empowers teams to unlock their full potential &mdash; not just manage tasks, but master them.</p>
<a class="btn">Get started</a>
```

Fixed: one fact, plain punctuation, a button that says the result.

```html
<!-- after -->
<h1>Plan a week of posts in ten minutes</h1>
<p>Paste a product URL. You get seven captions, three image crops and a posting calendar, as a CSV or a direct export to your scheduler.</p>
<a class="btn">Generate my week</a>
```

```js
// release gate: no long dashes in shipped text
const bad = /[\u2013\u2014]/;
if (bad.test(document.body.innerText)) throw new Error('long dash in visible text');
```

## Tokens

This pattern is about words, so few tokens apply. Text roles stay on `--text` for headings and `--text-muted` for support lines, sizes from `--t-h1` and `--t-body`. The check for AC-02 is a string test on visible text, and numeric ranges such as 9~18 or "9 to 18" avoid the en dash while staying tabular with `tabular-nums`.
