---
id: auth-split-frame
name: Auth split frame
category: layout-shell
uses: [sign-in-or-sign-up]
surfaces: [auth-onboarding]
replaces: [LAY-01]
components: []
inspiration: []
status: draft
---

## When to use

Use it for sign in, sign up, password reset and the first steps of onboarding. The form lives in one column and a calm visual lives in the other. On phones the visual shrinks to a header band or disappears and the form is the whole screen.

It replaces the centered formula: a small card on a gradient, a pill badge above the title, a logo, and two social buttons stacked beneath, repeated on every auth page.

## Anatomy

- Form column: 480px max content width inside a half-width pane, vertically centered, `--bg` surface, left aligned.
- Header: brand mark, a short title ("Sign in"), one line explaining the next step.
- Form: labeled inputs (labels above, not placeholders only), one primary button, a secondary text link ("Create an account").
- Visual column: from 1024px up, the other half shows a calm image, a product capture or a quiet generated field. No form, no marketing paragraph.
- Phone: stacked layout. A 96 to 120px strip with the mark on top, the form below. No visual column.
- Onboarding variant: a back link and a step indicator (2 of 4) at the top of the form column.

## Do

- Keep one primary action per screen. Social sign-in, if used, is a secondary row of equal-size buttons.
- Label every field, set `autocomplete` (`email`, `current-password`, `new-password`), and show errors under the field in text.
- Put the legal links as small text at the bottom of the form column.
- Make the visual column decorative: `aria-hidden`, no essential information, lazy loaded.
- Test with browser autofill and a password manager.

## Don't

- Do not center a card on a gradient with a pill badge above the title (LAY-01).
- Do not put a marketing slogan, testimonials and a feature list next to the form.
- Do not use placeholders as labels.
- Do not auto-play video or heavy particles behind the form on slow devices.
- Do not hide the form behind a modal on a page whose only job is signing in.

## Swap recipe

Slop: centered card, gradient, badge, two buttons.

```jsx
{/* before: LAY-01 */}
<div className="min-h-screen grid place-items-center bg-gradient-to-br from-indigo-600 to-purple-700">
  <div className="rounded-3xl bg-white/10 p-10 backdrop-blur text-center">
    <span className="rounded-full bg-white/20 px-3 py-1">New</span>
    <h1>Welcome back</h1> <button>Continue with Google</button> <button>Continue with GitHub</button>
  </div>
</div>
```

Fixed: a split frame, form left, calm visual right.

```tsx
{/* after */}
<div className="grid min-h-screen lg:grid-cols-2 bg-bg text-text">
  <main className="flex flex-col justify-center px-6 py-12 lg:px-16">
    <div className="mx-auto w-full max-w-[420px]">
      <Logo />
      <h1 className="mt-8 text-h2 font-semi">Sign in</h1>
      <p className="mt-2 text-body text-text-muted">Use the email you registered with.</p>
      <form className="mt-6 flex flex-col gap-4">{/* Input label="Email" ... Button */}</form>
      <a href="/signup" className="mt-6 text-label text-text-muted hover:text-text">Create an account</a>
    </div>
  </main>
  <aside className="relative hidden bg-bg-sunken lg:block" aria-hidden="true">
    <img src="/auth-visual.webp" alt="" className="h-full w-full object-cover" />
  </aside>
</div>
```

## Tokens

`--bg`, `--bg-sunken` (visual pane fallback), `--text`, `--text-muted`, `--sp-2`, `--sp-4`, `--sp-6`, `--sp-12`, `--t-h2`, `--t-body`, `--w-semi`. Breakpoint `lg` (1024px) reveals the visual pane. Form controls come from the input block in the controls family.
