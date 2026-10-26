---
id: hairline-accordion-faq
name: Hairline accordion FAQ
category: faq
uses: [answer-questions]
surfaces: [landing]
replaces: [AC-03, CMP-04]
components: [blocks/accordion]
inspiration: []
status: stable
---

## When to use

Use it for the objections and practical questions a buyer has before the last button: price, cancellation, data handling, integration, support. It sits right before the final call to action and handles the "yes, but" in one place. Five to eight questions is plenty. Write the questions that real people have sent you.

Use `split-title-faq` if the section needs a title column and a quieter side image. Use plain headings and paragraphs if you have fewer than four questions; an accordion would hide too little to be worth it.

## Anatomy

A single column, 640 to 760px wide, left aligned.

- Rows: each question is a full-width button with the question text on the left and a chevron (or a plus that turns into a minus) on the right. Rows are separated by 1px hairlines, with no boxes, no radius and no backgrounds.
- Open row: the answer fades and slides in below the question (height transition in `--dur-dropdown`), with the chevron rotated 180 degrees. Only one row is open at a time (`type="single" collapsible`).
- Answer: body text in `--text-muted`, max 65 characters per line, with links underlined. Answers are 20 to 80 words.
- Title: the section title lives outside, in a `split-section-header` or a simple `h2`.

The registry `Accordion` is built on Radix (`@radix-ui/react-accordion`) so keyboard and ARIA work out of the box.

## Do

- Write questions in the customer's voice ("Can I cancel any time?"), and answers that begin with the answer.
- Put the most-asked question first. Keep the order stable.
- Make the whole row clickable and at least 44px tall.
- Give each item an anchor id so support can link to an answer.
- Include real numbers: price, trial length, refund window.
- Let the answers be indexable: render them in the HTML, with `hidden` removed by the component and not by CSS `display: none` on the server render.

## Don't

- Do not use emoji or colored icons as the leading mark on each question (AC-03).
- Do not wrap the whole list in a rounded card with the same big radius and soft shadow as every other card on the page (CMP-04); the hairline is the structure.
- Do not auto-open the first item when it hides the next ones below the fold on mobile.
- Do not put a CTA button in every answer.
- Do not use an accordion for content people must read in full, like terms.
- Do not animate with bounce or overshoot.

## Swap recipe

Slop version: emoji icons, boxed cards, same radius and shadow.

```html
<!-- before: AC-03, CMP-04 -->
<div class="faq-card" style="border-radius:20px;box-shadow:0 10px 40px rgba(0,0,0,.25);margin-bottom:16px;padding:20px">
  <h4><span class="emoji-icon"></span> How does it work?</h4>
  <p>(sparkle emoji) Magic!</p>
</div>
```

Fixed version: hairline-separated rows using the registry accordion.

```tsx
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './blocks/accordion'

const faqs = [
  { q: 'Can I cancel any time?', a: 'Yes. Cancel from the billing page and you keep access until the end of the paid period. We do not charge a fee.' },
  { q: 'Where is my data stored?', a: 'In the EU region of our cloud provider. You can export everything as CSV, and delete the workspace from settings.' },
  { q: 'Do you offer a trial?', a: 'The free plan covers one domain and 200 pages. Paid plans have a 14 day refund window.' },
]

export function Faq() {
  return (
    <section className="mx-auto max-w-[720px] px-6 py-16">
      <h2 className="text-h2 font-semibold text-text">Questions we get</h2>
      <Accordion type="single" collapsible className="mt-6 border-t border-border">
        {faqs.map((f, i) => (
          <AccordionItem key={f.q} value={`q${i}`} id={`faq-${i}`}>
            <AccordionTrigger>{f.q}</AccordionTrigger>
            <AccordionContent>{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}
```

The `AccordionItem` already renders a bottom hairline (`border-b border-border`), so the stack of rows is structure enough.

## Tokens

- Lines: `--border` (hairline) for item separators; hover on the question text lowers to `--text-muted` as in the registry component.
- Type: question `--t-body` at `--w-med` (or `--t-title` for a roomier list); answer `--t-body` in `--text-muted`, `--lh-normal`.
- Space: row padding `--sp-4` top and bottom, section padding `--sp-16`, title to list `--sp-6`.
- Radius: none on rows; only focus ring uses the system radius.
- Motion: chevron rotation 200ms with `--ease-out`; height with `--dur-dropdown`.
