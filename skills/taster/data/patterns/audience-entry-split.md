---
id: audience-entry-split
name: Audience entry split
category: cta
uses: [ask-for-action, navigate-the-site]
surfaces: [landing]
replaces: [LAY-02]
components: [blocks/card]
inspiration: []
status: stable
---

## When to use

Use it when the same site serves two or three clearly different visitors and their next step differs: buyers and sellers, brands and agencies, patients and clinics, students and teachers. Instead of a feature row that makes everyone read everything, the section asks one question and sends each person to the page that was written for them.

Do not use it when the audiences are the same people at different moments, or when you have only one real path. A single call to action is better than a fake choice.

## Anatomy

A heading line, then two or three entry cards of equal width.

- Heading: a question or an instruction in sentence case: "Which describes you?" or "Start where you are". `--t-h2`.
- Entry card: a title naming the audience ("I run a brand"), one sentence on what they get (12 to 20 words), and a text link or arrow that goes to their page. The whole card is the link target (`<a>` wrapping the content, with a visible focus ring).
- Optional: a line under the cards for people who fit none: "Not sure? Talk to us" with a link.

Cards are hairline bordered, with the same height and a hover state that lightens the border. No icons, no photos unless they show that audience for real. Order the cards by traffic share, largest first.

## Do

- Name the visitor, not the product tier ("I run a brand", not "Enterprise").
- Make each card lead to a page that actually differs: different example, price and sign-up flow.
- Use a real anchor with `href`. The arrow is part of the text ("For brands →" is a text glyph; use a drawn chevron icon if the arrow is not in your font).
- Keep copy parallel in length so the cards align.
- Track which card people choose. If 95% pick one, the split is not earning its space.
- On mobile, stack the cards in the same order, with a full-width tap target of at least 44px high.

## Don't

- Do not turn it into three icon cards that describe features (LAY-02). The cards are doors, not benefits.
- Do not add a hover lift, glow or scale animation. A border change is enough.
- Do not put the choice behind a modal or an auto-redirect.
- Do not hide pricing or the sign-up on the destination pages so the choice becomes a trap.
- Do not label audiences with jargon that only the company uses.

## Swap recipe

Slop version: a three-up feature row that everyone has to read.

```tsx
// before: LAY-02
<div className="grid grid-cols-3 gap-6">
  {[['Zap', 'Lightning fast'], ['Shield', 'Secure by design'], ['Sparkles', 'AI powered']].map(([i, t]) => (
    <div className="rounded-2xl bg-white/5 p-6 text-center">
      <Icon name={i} /><h3>{t}</h3><p>Everything you need, all in one place.</p>
    </div>
  ))}
</div>
```

Fixed version: two doors, each to its own page.

```tsx
import { Card, CardContent } from './blocks/card'

const doors = [
  { href: '/brands', title: 'I run a brand', text: 'Track how AI answers describe your products and fix the pages they skip.' },
  { href: '/agencies', title: 'I work at an agency', text: 'One workspace for all your clients, with reports under your own name.' },
]

export function AudienceEntry() {
  return (
    <section className="mx-auto max-w-[900px] px-6 py-16">
      <h2 className="text-h2 font-semibold text-text">Which describes you?</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {doors.map((d) => (
          <a key={d.href} href={d.href} className="group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card className="h-full transition-colors duration-dropdown group-hover:border-text-subtle">
              <CardContent className="grid gap-2">
                <div className="text-title font-semibold text-text">{d.title}</div>
                <p className="text-body text-text-muted">{d.text}</p>
                <span className="mt-2 text-body text-text">Start here</span>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
      <p className="mt-6 text-body text-text-muted">Not sure? <a className="text-text underline" href="/contact">Talk to us</a>.</p>
    </section>
  )
}
```

## Tokens

- Card: `--bg-elev`, `--border` resting, `--text-subtle` on hover; radius `--r-card`; padding `--sp-5`.
- Type: heading `--t-h2`; card title `--t-title` at `--w-semi`; sentence `--t-body` in `--text-muted`.
- Space: grid gap `--sp-4`, heading to grid `--sp-6`, inside the card `--sp-2`.
- Focus: `--ring` through `focus-visible:ring-2`.
- Motion: border color only, `--dur-dropdown` with `--ease-out`.
