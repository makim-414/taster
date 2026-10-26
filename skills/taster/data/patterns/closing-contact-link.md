---
id: closing-contact-link
name: Closing contact link
category: cta
uses: [ask-for-action, capture-contact]
surfaces: [landing]
replaces: [AC-12]
components: [blocks/button, blocks/dialog]
inspiration: []
status: stable
---

## When to use

Use it on sites where the goal is a conversation: services, agencies, B2B tools sold through a call, studios, consultants. The page ends with one sentence and one button. The button goes to a contact page, or opens a short dialog with three fields at most. The mail address also appears in the footer.

Do not use it for self-serve products where the real action is "sign up" or "buy". There the closing action is the sign-up button, and `neutral-cta-band` is the pattern.

## Anatomy

- Closing section: one sentence at `--t-h2` that states what happens when they get in touch ("Tell us what you are trying to do. We reply within a working day."), then one solid button ("Contact us").
- Behavior option A: the button is a link to `/contact`. That page owns the full form, hours, and address.
- Behavior option B: the button opens a `Dialog` with name, email and a single textarea ("What should we know?"), a submit button, and a line saying where the message goes and when to expect a reply.
- Footer: the mail address as a plain `mailto:` link, a phone number if people actually call, and a line for response time.

Whichever you choose, the form posts to a real endpoint and shows the true result: sent, or failed with the mail link as a fallback.

## Do

- Ask only what you need to reply: email and a message. Name is optional.
- State the response time you actually keep.
- Close the dialog with Escape, return focus to the button, and make the first field autofocus.
- Show a visible confirmation with the next step ("We will write from hello@yourdomain.com").
- Keep the mail link in the footer even with the dialog, because some people prefer to write directly.
- Log every submission server side and test the failure path.

## Don't

- Do not put a long inquiry form with name, company, phone, budget and a message into the page body (AC-12). It breaks the flow of the page and most visitors skip it.
- Do not ask for a phone number unless you will call.
- Do not show a thank-you message when the request failed or was never sent.
- Do not add a captcha puzzle before the first keystroke. Use a honeypot field and server rate limits.
- Do not stack a newsletter box next to the contact button.

## Swap recipe

Slop version: the inquiry form sits in the middle of the page.

```html
<!-- before: AC-12 -->
<section id="contact">
  <h2>Let's build something great together</h2>
  <form>
    <input name="name"><input name="company"><input name="phone"><input name="budget">
    <textarea name="message" rows="6"></textarea>
    <button>Send message</button>
  </form>
</section>
```

Fixed version: a sentence, a button and a three-field dialog.

```tsx
import { Button } from './blocks/button'
import { Input } from './blocks/input'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './blocks/dialog'

export function ClosingContact() {
  return (
    <section className="mx-auto max-w-[900px] px-6 py-16">
      <h2 className="max-w-[24ch] text-h2 font-semibold text-text">Tell us what you are trying to do.</h2>
      <p className="mt-2 text-body text-text-muted">We reply within one working day.</p>
      <Dialog>
        <DialogTrigger asChild><Button size="lg" className="mt-6">Contact us</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact us</DialogTitle>
            <DialogDescription>Goes to hello@yourdomain.com. Replies come from the same address.</DialogDescription>
          </DialogHeader>
          <form action="/api/contact" method="post" className="grid gap-3">
            <Input name="email" type="email" placeholder="Your email" required autoFocus />
            <textarea name="message" rows={5} required placeholder="What should we know?"
              className="rounded-md border border-border-input bg-transparent p-3 text-body outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            <Button type="submit">Send</Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}
```

Footer: `<a href="mailto:hello@yourdomain.com">hello@yourdomain.com</a>`.

## Tokens

- Type: sentence `--t-h2`; support `--t-body` in `--text-muted`.
- Dialog: `--popover` surface, `--border`, radius `--r-xl`; overlay `--scrim`. Enter with `--dur-modal` and `--ease-drawer`.
- Fields: `--input` border, `--ring` focus, radius `--r-md`, gap `--sp-3`.
- Space: section padding `--sp-16`, sentence to button `--sp-6`.
- Reduced motion: dialog duration tokens collapse to 1ms automatically.
