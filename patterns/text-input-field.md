---
id: text-input-field
name: Text input field
category: form-input
uses: [enter-data]
surfaces: [app, auth-onboarding]
replaces: [AC-06, AC-09, AC-14]
components: [blocks/input]
inspiration: [https://ui.shadcn.com/docs/components/input]
status: stable
---

## When to use

Any place a person types: names, emails, search terms, notes, settings. One field chrome for text, number, select, textarea and file drop, so a form looks like one piece. Use the settings layout (label column and value column) for pages with many fields, and the stacked layout for short flows.

## Anatomy

- Label above the field, 14px, `--text`, sentence case, always visible. A placeholder is an example, not a label.
- Field: 36px high (textarea grows), transparent background, 1px `--input` border, `--r-md` corners, 12px horizontal padding, body font.
- Hint below in `--text-muted` at 12px. Error replaces the hint, in `--danger`, with the border switching to `--danger`.
- Focus: 2px `--ring` outline on `focus-visible`. Never remove the outline without replacing it.
- Disabled: opacity 0.5 and no pointer events, with the reason in the hint.
- Select: same chrome plus a line chevron on the right. File drop target: dashed 1px `--input` border, same radius, a sentence and a "Choose file" text button.
- Settings layout: label and hint in a left column (about 240px), field in the right column, a 1px `--border-soft` rule between rows. A save bar slides in at the bottom only after something changes, with Save and Discard.

## Do

- Use the right `type` and `autocomplete` values (`email`, `tel`, `one-time-code`) so phones show the right keyboard.
- Validate on blur and on submit, not on every keystroke. Keep the typed value when showing an error.
- Write errors as instructions: "Enter an email like name@example.com".
- Mark optional fields as "(optional)" in the label and leave required ones unmarked when most are required.
- Make the whole row clickable to focus: label `for` matches input `id`.

## Don't

- Don't set field labels or values in monospace or all caps with tracking. Use the body font; numbers get `tabular-nums`.
- Don't wrap every field in a bordered gray card on a gray page.
- Don't show errors in a tinted yellow or red banner far from the field. Put them under it.
- Don't use placeholder text as the only label; it disappears when typing.
- Don't make a save bar always visible and always disabled.

## Swap recipe

Slop: mono tracked caps label, filled gray field inside a gray card, tinted warning band for validation. Fixes AC-09 (monospace UI labels), AC-14 (flat gray bordered cards) and AC-06 (tinted notice band).

```css
/* before */
.field-card { background: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 10px; padding: 16px; }
.field-card label { font-family: ui-monospace, monospace; text-transform: uppercase; letter-spacing: 0.14em; font-size: 11px; }
.field-card .warn { background: #fef9c3; border: 1px solid #fde047; padding: 12px; }
```

```tsx
// after
import { Input } from './blocks/input'

<div className="space-y-1.5">
  <label htmlFor="email" className="text-sm text-text">Work email</label>
  <Input id="email" type="email" autoComplete="email" aria-invalid={!!error} aria-describedby="email-msg" />
  <p id="email-msg" className={error ? 'text-xs text-danger' : 'text-xs text-text-muted'}>
    {error ?? 'We send the invoice here.'}
  </p>
</div>
```

`Input` already gives the transparent surface, `border-border-input` and the focus ring. Delete the wrapper card; spacing and the label do the grouping.

## Tokens

- `--input`: field border; `--danger` for the error border.
- `--ring`: focus outline.
- `--text`, `--text-muted`, `--text-subtle`: value, hint, placeholder.
- `--r-md`: field corners.
- `--t-body`, `--t-sm`: value and hint sizes; `--font` for everything.
- `--sp-2`, `--sp-4`: label gap and field gap.
- `--border-soft`: row dividers in the settings layout.
