---
id: myth-vs-truth-pair
name: Myth versus truth pair
category: feature-section
uses: [explain-features]
surfaces: [landing, editorial]
replaces: [CPY-01, LAY-02]
components: []
inspiration: []
status: draft
---

## When to use

Use it when your product or your point of view corrects a common belief and the correction is the reason to buy or to read on. Two statements side by side: what people usually think, drawn faint and dashed, and what is actually true, drawn solid. The visual weight does the arguing, so the copy can be short.

Use it for two to four pairs at most. More than that becomes a quiz. Do not use it when the "myth" is a strawman no one holds; the section fails if a reader has never believed the left side.

## Anatomy

A two-column row per pair, with a shared label row on top.

- Column labels: "Common belief" and "What happens", in sentence case, `--t-sm`, `--text-subtle`.
- Myth cell: dashed 1px border, transparent background, text in `--text-muted`. A little smaller than the truth. No strikethrough.
- Truth cell: solid 1px border in `--text` at low alpha or a one step lighter surface, text in `--text`, weight 500.
- Between them: a small arrow or nothing. The visual difference is enough.
- Optional footnote under a pair: one source or one number that proves the right side.

On mobile the pair stacks: myth on top at reduced contrast, truth below. Keep the same dashed versus solid cue.

## Do

- Phrase the myth in the voice of the person who believes it, in the first person if possible ("More keywords means more AI citations").
- Phrase the truth as a specific, checkable statement. Add a number or a name where you can.
- Use line style, not hue, to separate the two: dashed against solid, faint against strong.
- Keep each cell under 25 words.
- Order the pairs from most common belief to least.
- Give the pair a semantic structure: a `<dl>` with `<dt>` for the belief and `<dd>` for the truth works.

## Don't

- Do not write "not X but Y" or "It's not about A, it's about B" in the cells. That is the empty template voice (CPY-01). State the true thing plainly.
- Do not cross out the myth or color it red, and do not color the truth green. Color is not the signal here.
- Do not turn the pairs into three equal icon cards (LAY-02).
- Do not use all-caps "MYTH" and "TRUTH" stamps.
- Do not invent a belief to knock it down. Quote a real forum thread or a real sales call line if you have one.

## Swap recipe

Slop version: weightless "not X but Y" parallels in matching cards.

```html
<!-- before: CPY-01, LAY-02 -->
<div class="cards three">
  <div class="card"><span class="icon">*</span><h3>It's not about keywords, it's about intent</h3></div>
  <div class="card"><span class="icon">*</span><h3>It's not a tool, it's a partner</h3></div>
  <div class="card"><span class="icon">*</span><h3>Not more content, but better content</h3></div>
</div>
```

Fixed version: one belief, one checkable claim, drawn at different weights.

```css
.pair { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-4); }
.pair dt {
  border: 1px dashed var(--border);
  border-radius: var(--r-card);
  padding: var(--sp-5);
  color: var(--text-muted);
  font-size: var(--t-body);
}
.pair dd {
  margin: 0;
  border: 1px solid var(--text-subtle);
  border-radius: var(--r-card);
  padding: var(--sp-5);
  color: var(--text);
  font-size: var(--t-title);
  font-weight: var(--w-med);
}
@media (max-width: 640px) { .pair { grid-template-columns: 1fr; } }
```

```html
<dl class="pair">
  <dt>More keywords on the page means more AI citations.</dt>
  <dd>In our sample of 1,200 cited pages, 71% had fewer than 5 repetitions of the target phrase and a dated source.</dd>
</dl>
```

Replace the sample numbers with your own and link the method. If you cannot back the right side with a fact, the pair is not ready.

## Tokens

- Border: dashed uses `--border`; solid uses `--text-subtle` (or `--text` at the strongest). Radius `--r-card` on both.
- Type: myth `--t-body` in `--text-muted`; truth `--t-title` in `--text` at `--w-med`. Column labels `--t-sm` in `--text-subtle`.
- Space: padding `--sp-5`, gap `--sp-4`, between pairs `--sp-8`.
- Surface: both on `--bg`; no fills, no shadow.
- Motion: none needed. If you reveal the truth on click, use `--dur-dropdown` with `--ease-out`.
