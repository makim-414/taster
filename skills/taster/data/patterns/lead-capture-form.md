---
id: lead-capture-form
name: Lead capture form
category: form-input
uses: [capture-contact]
surfaces: [landing]
replaces: [AC-12, CMP-10]
components: [blocks/input, blocks/button]
inspiration: []
status: stable
---

## When to use

A landing page whose goal is to get someone talking to you or on a list, and where you will really follow up. One email field if a real mailing list exists. Up to three fields (name, email, one qualifier) for a contact request. Anything longer belongs on its own contact page, linked from a button.

## Anatomy

- Single-row layout for email capture: input and button side by side at 36 or 44px high, button label states the result ("Send me the price list").
- Contact layout: stacked fields, labels above in sentence case, optional message as a short textarea, one submit button.
- Under the button: one line saying what happens next and when ("We reply within 2 business days"), and a link to the privacy text.
- Success state replaces the form, in place, with a plain sentence and what to expect. No confetti.
- Error state under the field. Network failure keeps the typed values and offers retry.
- Honeypot field or server-side rate limit for spam; no CAPTCHA unless abused.
- Position: once, near the end of the page content, or in the hero if it is the only goal.

## Do

- Send the data somewhere that a human reads. Test the whole path before launch, including the email that arrives.
- Ask only for what you need to reply. Phone number only if you will call.
- Use `autocomplete="email"` and the correct input type.
- Keep a mail address visible in the footer as the fallback.
- Tell the person if there will be a confirmation email.

## Don't

- Don't put a five-field form with company, phone, budget and message in the middle of a landing page.
- Don't add a subscribe box to the end of every page when no newsletter exists.
- Don't show "Thanks, you're on the list!" when nothing was sent. Handle failure honestly.
- Don't pre-check a consent box or hide it under the button.
- Don't gate a plain price list behind a form.

## Swap recipe

Slop: heavy contact form mid-page plus a decorative newsletter box at every page end. Fixes AC-12 (heavy contact form on a landing page) and CMP-10 (subscribe form at the end of every page).

```tsx
// before
<section className="rounded-3xl bg-zinc-900 p-10 shadow-2xl">
  <h2>Let's build something great together</h2>
  <input placeholder="Name" /><input placeholder="Company" /><input placeholder="Phone" />
  <textarea placeholder="Tell us about your project" />
  <button className="bg-gradient-to-r from-violet-500 to-pink-500">Send message</button>
</section>
<footer><input type="email" placeholder="Join our newsletter" /></footer>

// after: option A, one button to the contact page
<Button size="lg" asChild><a href="/contact">Request a quote</a></Button>
<p className="mt-2 text-sm text-text-muted">Or write to <a className="underline" href="mailto:hello@example.com">hello@example.com</a></p>

// after: option B, a real list with one field
import { Input } from './blocks/input'
import { Button } from './blocks/button'

<form onSubmit={subscribe} className="flex max-w-md gap-2">
  <label htmlFor="em" className="sr-only">Email</label>
  <Input id="em" type="email" required autoComplete="email" placeholder="you@company.com" />
  <Button type="submit">Send me the price list</Button>
</form>
<p className="mt-2 text-xs text-text-muted">One email now, then one a month. Unsubscribe in one click.</p>
```

Remove the footer box on pages where it is not a promise you keep.

## Tokens

- `--input`, `--ring`: field border and focus.
- `--accent`, `--accent-fg`: submit button.
- `--text`, `--text-muted`: labels, helper line.
- `--danger`: field errors.
- `--r-md`: field and button corners.
- `--sp-2`, `--sp-4`: gap between field and button; between fields.
- `--t-body`, `--t-sm`: input and helper text.
