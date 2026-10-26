---
id: in-hero-form-flow
name: In-hero form flow
category: hero
uses: [introduce-the-product, capture-contact, ask-for-action]
surfaces: [landing]
replaces: [AC-12, CMP-10]
components: [blocks/input, blocks/button]
inspiration: []
status: draft
---

## When to use

Use it when the product can give a visitor something useful from one input: a URL to analyze, a company name to look up, a file to check. The input sits in the hero, and the page responds to it. If the next step needs more information, a short form takes the hero's place on the same screen, so nobody lands on a form page, and the long inquiry form in the footer disappears.

Do not use it when the first action is "talk to sales" with no sample result to offer. Then use `closing-contact-link`.

## Anatomy

A hero with three states in one container, which keeps its height.

1. Idle: the lockup on the left, and under it a single input with an inline button ("Analyze"). One line of helper text: what happens next and how long it takes.
2. Form: the lockup slides left and fades; a short form takes its place with at most three fields (the value already entered, an email, one optional choice) and a submit button. A back link returns to idle.
3. Result or confirmation: either a sample result in the right column or a plain confirmation that states the next step and a date or time.

Rules for the container: fixed min-height so the page below does not jump, `aria-live="polite"` on the region that changes, focus moved to the first field of the new state, and a real `<form>` with a real endpoint. The transition is a 200ms translate and fade using the motion tokens.

## Do

- Keep the first input to one field. Validate it inline and say what is wrong in plain words.
- Ask for the email only after the visitor has seen value, or at the moment the result needs a destination.
- Say exactly what happens on submit: "We email the report in about 10 minutes".
- Make the whole flow work without JavaScript as a plain form post. Enhance it afterwards.
- Disable the submit button only while a request is in flight, and show a text state ("Analyzing") with a neutral spinner.
- Log the submit server side. A success message must follow a stored record.

## Don't

- Do not put a heavy form with name, company, phone and a message box in the page body (AC-12). If more detail is needed, link out or open a dialog.
- Do not add an email-subscribe field above the footer on every page, with a thank-you message that is not backed by a mailing list (CMP-10).
- Do not mask a fake success. If the endpoint is not wired, say "Not connected yet" or remove the field.
- Do not trap focus in the hero or scroll the page away when the state changes.
- Do not add a second competing button next to the input.

## Swap recipe

Slop version: a hero with two buttons and a long inquiry form near the end.

```html
<!-- before: AC-12, CMP-10 -->
<section class="hero"><h1>...</h1><button>Get started</button><button class="ghost">Book a demo</button></section>
<!-- 900px lower -->
<form class="contact">
  <input name="name"><input name="company"><input name="phone"><textarea name="message"></textarea>
  <button>Send</button>
</form>
<form class="subscribe"><input type="email"><button>Subscribe</button></form>
```

Fixed version: one input in the hero that moves into a short form on the same screen.

```tsx
type Step = 'idle' | 'form' | 'done'

function HeroFlow() {
  const [step, setStep] = React.useState<Step>('idle')
  const [url, setUrl] = React.useState('')
  return (
    <section className="mx-auto min-h-[480px] max-w-[1200px] px-6 py-16">
      <div aria-live="polite" className="max-w-[520px]">
        {step === 'idle' && (
          <form onSubmit={(e) => { e.preventDefault(); setStep('form') }} className="grid gap-3">
            <h1 className="text-display font-semibold">Check how AI answers describe your site</h1>
            <div className="flex gap-2">
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="yourdomain.com" required />
              <Button type="submit">Analyze</Button>
            </div>
            <p className="text-label text-text-subtle">Takes about two minutes. No account needed.</p>
          </form>
        )}
        {step === 'form' && (
          <form action="/api/report" method="post" className="grid gap-3">
            <input type="hidden" name="url" value={url} />
            <Input name="email" type="email" placeholder="Where should we send it?" required autoFocus />
            <Button type="submit">Send the report</Button>
            <button type="button" onClick={() => setStep('idle')} className="text-label text-text-muted">Back</button>
          </form>
        )}
      </div>
    </section>
  )
}
```

The long form and the subscribe box are deleted; the page keeps one mail link in the footer.

## Tokens

- Type: `--t-display` headline, `--t-sm` for helper text in `--text-subtle`.
- Field: the registry `Input` uses `--input` for its border and `--ring` for focus. Keep the button at `--r-md`.
- Space: `--sp-3` between stacked fields, `--sp-2` between input and button, `--sp-16` vertical padding.
- Motion: state change uses `--dur-dropdown` (200ms) with `--ease-out`; offset uses `--enter-offset` which becomes 0 under reduced motion.
- Color: no tinted success band. Confirmation is text in `--text` on `--bg`.
