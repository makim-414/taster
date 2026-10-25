---
id: checkbox-and-switch
name: Checkbox and switch
category: form-input
uses: [enter-data]
surfaces: [app]
replaces: []
components: [blocks/toggle]
inspiration: [https://ui.shadcn.com/docs/components/checkbox, https://ui.shadcn.com/docs/components/switch]
status: stable
---

## When to use

Checkbox: a choice that is saved on submit, or one of several independent options, or consent. Switch: a setting that takes effect immediately, such as notifications on or off. If the control starts an action, it is a button. If exactly one of 2 to 4 options applies, use radio buttons or a segmented control.

## Anatomy

- Checkbox: 16px box, 1px `--input` border, `--r-sm` corners, transparent. Checked fills with `--accent` and shows a line check in `--accent-fg`. Indeterminate shows a short bar.
- Switch: 36 by 20px track, 16px knob. Off is a transparent track with a `--border` edge and a `--text` knob. On is an `--accent` track with an `--accent-fg` knob that moves 16px.
- Label is part of the control. The whole row, label and box, is the hit area, at least 44px tall on touch screens.
- Help text below the label in `--text-muted`, linked with `aria-describedby`.
- Focus ring: 2px `--ring` around the box or track, on keyboard focus only.
- Switch rows in settings: label and help at the left, the switch at the right edge, 1px `--border-soft` between rows.
- Consent checkbox: unchecked by default, the label states what is agreed and links to the text.

## Do

- Use a native `<input type="checkbox">` underneath, visually hidden. You keep forms, labels and keyboard behavior for free.
- Give a switch `role="switch"` and make the label describe the on state: "Email me about new reports".
- Save a switch immediately and show a quiet confirmation, or revert it on failure with a message.
- Keep order and wording stable so people can scan a settings list.
- Disable with opacity 0.5 and explain why in the help text.

## Don't

- Don't use a switch inside a form that has a Save button; the user cannot tell what is committed.
- Don't tint the on state green or blue by default; the accent token decides.
- Don't make a 14px box the only click target.
- Don't pre-check marketing consent.
- Don't animate the knob with a bounce. A 160ms ease-out slide is enough.

## Swap recipe

No catalog rule covers this yet. Typical slop is a custom switch with a gradient track and a glow, built from divs without a form control behind it.

```tsx
// before
<div onClick={toggle} className={`h-7 w-14 rounded-full ${on ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-[0_0_16px_#22d3ee]' : 'bg-zinc-700'}`}>
  <div className={`size-6 rounded-full bg-white transition ${on ? 'translate-x-7' : ''}`} />
</div>

// after
import { Checkbox, Switch } from './blocks/toggle'

<Switch
  checked={emailReports}
  onChange={(e) => setEmailReports(e.target.checked)}
  label="Email me when a report finishes"
/>

<Checkbox
  checked={agreed}
  onChange={(e) => setAgreed(e.target.checked)}
  label={<>I agree to the <a href="/terms" className="underline">terms</a></>}
/>
```

Both render a hidden native input with `peer` styles, so `:focus-visible`, `:disabled` and form submission work. On state uses `bg-accent`, so a theme changes it by setting `--brand`.

## Tokens

- `--accent`, `--accent-fg`: on-state fill and the mark inside it.
- `--input`, `--border`: off-state box border and switch track edge.
- `--text`, `--text-muted`: knob and label, help text.
- `--ring`: focus.
- `--r-sm`, `--r-pill`: checkbox and switch shapes.
- `--dur-press`, `--ease-out`: knob and fill transitions.
