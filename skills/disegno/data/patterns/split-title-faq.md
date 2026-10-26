---
id: split-title-faq
name: Split title FAQ
category: faq
uses: [answer-questions, explain-features]
surfaces: [landing]
replaces: [TYP-04]
components: [blocks/accordion, marketing/reveal-faq]
inspiration: []
status: draft
---

## When to use

Use it for a FAQ that is also a place to explain: onboarding questions, product setup, how a service works in practice. The title sits on the left and stays visible while the accordion scrolls on the right, so the section feels like a short page of its own. An optional image on the left changes with the open question.

Use `hairline-accordion-faq` when the FAQ is a short list before the footer. Use this one when you have eight or more questions or when an image per answer makes the answer clearer (a photo of the room, a screenshot of the setting).

## Anatomy

A two-column layout at `lg`: `minmax(0, 4fr) minmax(0, 7fr)`, gap `--sp-12`.

- Left column (sticky, `top: --sp-12`): a short title at `--t-h1`, one supporting sentence in `--text-muted`, and a contact link ("Still have a question? Write to us"). If you use images, a framed image slot below, with the image tied to the open item.
- Right column: the accordion, hairline-separated rows, one open at a time. Answers fade in over 200ms.
- Image slot (optional): 4:3 or 1:1, `--r-card`, crossfades when the open item changes; if an item has no image, the slot shows the default image or hides.

Mobile: single column. Title first, accordion next; images appear inline inside the open answer instead of in a separate slot.

## Do

- Keep the title short enough to fit on two lines at the left column width. A phrase, not a sentence.
- Make the sticky column stop when the section ends, and check it does not cover the footer.
- Give the contact link a real destination and a stated reply time.
- Use native `<details name="faq">` or a Radix accordion so one-open-at-a-time works without extra code.
- Lazy load images and give them explicit dimensions to avoid layout shift.
- Use word-boundary line breaking (`word-break: keep-all` for Korean) in both columns.

## Don't

- Do not set a long sentence in the left column at display size (TYP-04). The title is a label for the list.
- Do not put a decorative image next to the list that never changes. It should either explain or be removed.
- Do not auto-play a reveal of the answer text letter by letter on every open. A short fade is enough.
- Do not stack more than 10 questions in one accordion; group them with small subheads or split into two sections.
- Do not reuse the same background tint for left and right columns.

## Swap recipe

Slop version: a centered giant sentence over a boxed accordion.

```html
<!-- before: TYP-04 -->
<section style="text-align:center">
  <h2 style="font-size:72px">Frequently asked questions that every curious customer might want to ask us</h2>
  <div class="boxed-accordion" style="border-radius:24px;box-shadow:0 20px 60px rgba(0,0,0,.3)">...</div>
</section>
```

Fixed version: short sticky title on the left, accordion on the right.

```tsx
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './blocks/accordion'

export function SplitFaq({ items }: { items: { q: string; a: string; img?: string }[] }) {
  const [open, setOpen] = React.useState<string>('')
  const current = items.find((_, i) => `q${i}` === open)?.img ?? items[0].img
  return (
    <section className="mx-auto grid max-w-[1100px] gap-12 px-6 py-16 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]">
      <div className="lg:sticky lg:top-12 lg:self-start">
        <h2 className="text-h1 font-semibold tracking-[-0.02em] text-text">Setup questions</h2>
        <p className="mt-3 text-body text-text-muted">The ones we answer most in the first week.</p>
        <a className="mt-4 inline-block text-body text-text underline" href="/contact">Write to us</a>
        {current && (
          <img src={current} alt="" width={640} height={480}
               className="mt-8 hidden aspect-[4/3] w-full rounded-lg border border-border object-cover lg:block" />
        )}
      </div>
      <Accordion type="single" collapsible value={open} onValueChange={setOpen} className="border-t border-border">
        {items.map((f, i) => (
          <AccordionItem key={f.q} value={`q${i}`}>
            <AccordionTrigger>{f.q}</AccordionTrigger>
            <AccordionContent>{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}
```

The sticky column lives on the left; delete the box and the shadow on the list.

## Tokens

- Layout: columns `minmax(0, 4fr) minmax(0, 7fr)`, gap `--sp-12`, section padding `--sp-16`.
- Type: title `--t-h1` at `--w-semi`; sentence `--t-body` in `--text-muted`; question `--t-body` at `--w-med`.
- Lines and frames: `--border` for rows and image; radius `--r-card` on the image.
- Motion: answer fade `--dur-dropdown` with `--ease-out`; image crossfade the same. Both collapse under reduced motion.
- Sticky offset: `--sp-12` from the top.
