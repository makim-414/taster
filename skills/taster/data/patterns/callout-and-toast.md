---
id: callout-and-toast
name: Callout and toast
category: toast-alert
uses: [notify-the-user]
surfaces: [app, dashboard]
replaces: [AC-06, AC-10, COL-06]
components: [blocks/alert]
inspiration: [https://ui.shadcn.com/docs/components/alert]
status: stable
---

## When to use

Callout: a message that belongs to a spot on the page and stays there until the situation changes, such as a billing problem, a read-only mode or a note about a field. Toast: a short confirmation of something the person just did ("Invoice sent"), which can disappear on its own.

If the message blocks the task, use a dialog. If it is a validation error, put it next to the field. If nothing is wrong and nothing changed, do not show anything.

## Anatomy

- Callout: neutral `--bg-elev` surface, 1px `--border`, `--r-md` radius, 16px padding. Left: a 16px line icon whose color follows the tone (neutral for info, `--warning`, `--danger`). Right: a title in medium weight and a muted body line. Optional action as a text button at the end of the body.
- Never a tinted full-width band. The background stays neutral, the color lives on the icon and at most the title.
- Toast: same surface, 360px max width, stacked from the bottom right (top center on phones), `--sh-pop` because it floats. One line of text, one optional follow-up action ("View", "Undo"), a close button for toasts that stay longer.
- Timing: 4 to 6 seconds for success, longer or sticky for errors. Pause on hover and on focus. Honor `prefers-reduced-motion`.
- Registry `Alert` takes `tone` (`info | warning | danger`) and `title`, renders `role="alert"` and the tone icon.

## Do

- Write the message as a fact plus a next step: "Card ending 4242 was declined. Update payment method."
- Offer Undo on destructive confirmations, and keep the undo window equal to the toast life.
- Queue toasts, show at most three, and merge repeats ("3 files uploaded").
- Use `role="status"` with `aria-live="polite"` for success and `role="alert"` for errors.
- Put one callout per concern. If there are three warnings, group them in a list under one title.

## Don't

- Don't paint a full-width pale yellow or pale blue band with an icon and a line of text.
- Don't give a card a 4px colored left border to mark severity. Lighten the whole border one step or use the icon.
- Don't use a toast for errors that need a decision, or for anything the person must read before it vanishes.
- Don't show a rainbow of tints for info, success, warning and error on one screen. Most messages are neutral.
- Don't trigger toasts on page load or for background events nobody asked about.

## Swap recipe

Slop version (fixes AC-06, AC-10, COL-06):

```css
.notice {
  width: 100%; display: flex; gap: 12px; padding: 14px 18px;
  background: #fef9c3; color: #854d0e;           /* pale yellow band */
  border-left: 4px solid #eab308; border-radius: 12px;
}
.notice.info { background: #dbeafe; color: #1e40af; border-left-color: #3b82f6; }
.notice.success { background: #dcfce7; color: #166534; border-left-color: #22c55e; }
```

Fixed version:

```tsx
import { Alert } from './blocks/alert'

<Alert tone="warning" title="Payment method expires soon">
  The card ending 4242 expires on 31 Oct.{' '}
  <a href="/billing" className="text-text underline">Update card</a>
</Alert>

<Alert tone="info" title="Read-only mode">
  Editing is paused while the import runs.
</Alert>
```

The component is `flex gap-3 rounded-md border border-border bg-bg-elev p-4`. Only the 16px icon gets `text-warning` or `text-danger`; the title is `text-text` and the body `text-text-muted`. For a toast, wrap the same markup in a fixed container with `shadow-[var(--sh-pop)]` and an `animate` from `--enter-offset`.

## Tokens

- Surface: `--bg-elev`, border `--border`. Never `--success-soft`, `--warning-soft` or `--danger-soft` as a banner fill.
- Icon: `--text` (info), `--warning`, `--danger`, `--success` only for a real success.
- Ink: `--text` title, `--text-muted` body.
- Type: `--t-body` (14px) title medium, `--t-body` body regular, `--t-sm` meta.
- Space: padding `--sp-4`, gap `--sp-3`, toast stack gap `--sp-2`.
- Radius: `--r-md`. Shadow: `--sh-pop` for toasts only. Motion: `--dur-dropdown`, `--ease-out`.
