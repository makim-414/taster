---
id: sign-in-form
name: Sign in form
category: form-input
uses: [sign-in-or-sign-up]
surfaces: [auth-onboarding]
replaces: []
components: [blocks/input, blocks/button]
inspiration: []
status: stable
---

## When to use

The entry to an account: sign in, sign up, reset password. Keep it to the minimum that proves who the person is. If a provider login (Google, Apple, SSO) covers most users, show it first and the email form second. If the product has no accounts, do not build this.

## Anatomy

- Narrow column, about 360 to 400px, centered or in a split layout with a quiet side panel. A plain heading: "Sign in" or "Create your account".
- Optional provider button at the top: outline style, provider mark at the left, label "Continue with Google". A divider with the word "or" below it.
- Email field, then password field with a show/hide control inside it. "Forgot password" link right-aligned above or below the password field.
- One solid submit button, full width. Label states the action, "Sign in" or "Create account".
- Sign up adds a strength meter under the password field: a thin segmented bar and a sentence ("Add a number or symbol"), not a color verdict.
- Below: one line to switch modes ("New here? Create an account").
- Errors in text under the relevant field, and one generic line for credential failures that does not say which part was wrong.

## Do

- Use `autocomplete="username"`, `current-password` and `new-password` so password managers work. Allow paste.
- Let Enter submit. Keep focus on the first field on load, except on phones where it opens the keyboard unasked.
- Disable the button during the request and show a spinner or "Signing in" text.
- Preserve the email value after a failed attempt.
- Offer magic link or passkey if the product supports it, as a text button below.

## Don't

- Don't ask for password confirmation twice when a show/hide control exists.
- Don't block paste, or force a rule like "one uppercase, one symbol" without saying it before typing.
- Don't put a marketing carousel or a testimonial wall next to the form.
- Don't use a gradient or glowing submit button. It is the one place people want to feel stability.
- Don't reveal which emails have accounts in error messages.

## Swap recipe

No catalog rule covers this yet. The slop version is a glass card with glow on a gradient backdrop and a placeholder-only form.

```tsx
// before
<div className="min-h-screen bg-gradient-to-br from-violet-900 via-indigo-900 to-black">
  <div className="mx-auto mt-24 w-96 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-[0_0_80px_rgba(139,92,246,0.4)]">
    <input placeholder="Email" /><input placeholder="Password" />
    <button className="bg-gradient-to-r from-violet-500 to-pink-500">Sign in</button>
  </div>
</div>

// after
import { Input } from './blocks/input'
import { Button } from './blocks/button'

<form onSubmit={submit} className="mx-auto w-full max-w-[380px] px-4 py-16">
  <h1 className="text-h2 font-semibold">Sign in</h1>
  <Button type="button" variant="outline" className="mt-6 w-full">Continue with Google</Button>
  <div className="my-5 flex items-center gap-3 text-xs text-text-subtle">
    <span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" />
  </div>
  <label htmlFor="email" className="text-sm">Email</label>
  <Input id="email" type="email" autoComplete="username" className="mt-1.5" />
  <div className="mt-4 flex items-baseline justify-between">
    <label htmlFor="pw" className="text-sm">Password</label>
    <a href="/reset" className="text-xs text-text-muted hover:text-text">Forgot password</a>
  </div>
  <Input id="pw" type="password" autoComplete="current-password" className="mt-1.5" />
  <Button type="submit" className="mt-6 w-full">Sign in</Button>
</form>
```

## Tokens

- `--bg`, `--bg-elev`: page and optional panel surface.
- `--input`, `--ring`, `--danger`: field border, focus, error.
- `--accent`, `--accent-fg`: submit button.
- `--border`: provider divider and outline button edge.
- `--t-h2`, `--t-body`, `--t-sm`: heading, labels, helper text.
- `--sp-4`, `--sp-6`: vertical rhythm inside the form.
