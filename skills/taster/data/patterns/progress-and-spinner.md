---
id: progress-and-spinner
name: Progress bar and spinner
category: loader-skeleton
uses: [show-progress]
surfaces: [app]
replaces: [AC-07, COL-01]
components: [blocks/progress]
inspiration: [https://ui.shadcn.com/docs/components/progress]
status: stable
---

## When to use

Progress bar: work with a known length or a countable number of steps (upload, import, onboarding completion, quota use). Spinner: work of unknown length that blocks one control (a button, a refresh). Background job pill: work that continues while the person does other things (export, sync).

If the shape of the incoming content is known, use skeleton placeholders instead of a spinner.

## Anatomy

- Bar: 8px track with a 1px soft border, `--bg-elev` fill; the fill is a single solid `--accent`, rounded, animating `width` only when the value changes. Label above on the left, tabular percent on the right at 11px.
- Spinner: a 16px outlined ring, 1.5px stroke in muted ink with a quarter-arc in full ink, spinning at one turn per second. Sits beside plain text such as "Saving".
- Background job pill: a small bordered pill fixed above the tab bar or in a corner, neutral surface, a spinner, a short text ("Exporting 3 of 12") and a link to details. No glow.
- Registry `Progress` takes `value` (0 to 100, clamped) and `label`, and renders `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` and `aria-label`.

## Do

- Show real numbers when you have them: "3 of 12 files", not a looping animation.
- Keep the label and percent visible, and announce completion with a status message or toast.
- Disable the control that started the work and keep its label ("Saving"), so the layout does not move.
- Use indeterminate mode (a spinner) only when you truly cannot know. Never fake progress that jumps to 90%.
- Hide the spinner when `prefers-reduced-motion` is on and show the text alone.

## Don't

- Don't use a gradient fill, especially indigo to violet, or a striped animated barber pole.
- Don't use an orange or amber pill with a soft glow for "Processing". Neutral text and a neutral spinner say the same thing.
- Don't center a full-page spinner over an otherwise blank screen for anything longer than two seconds. Show structure.
- Don't animate the track and the fill and the number all at once.
- Don't use a different loader for every surface in the product. Pick one ring and one bar.

## Swap recipe

Slop version (fixes AC-07, COL-01):

```css
.processing {
  display: inline-flex; align-items: center; gap: 8px;
  background: rgba(249, 115, 22, 0.15); color: #fb923c;
  border-radius: 999px; padding: 4px 12px;
  box-shadow: 0 0 14px rgba(249, 115, 22, 0.55);
}
.bar > .fill {
  background: linear-gradient(90deg, #6366f1, #a855f7, #ec4899);
  background-size: 200% 100%; animation: slide 2s linear infinite;
}
```

Fixed version:

```tsx
import { Progress } from './blocks/progress'

<Progress value={(done / total) * 100} label={`Uploading ${done} of ${total} files`} />

function Spinner({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-text-muted" role="status">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="animate-spin motion-reduce:hidden">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {label}
    </span>
  )
}

<Spinner label="Saving" />
```

## Tokens

- Track: `--bg-elev` with `--border-soft`. Fill: `--accent` (one flat color, themeable).
- Ring: `--text-muted` base, `--text` arc.
- Ink: `--text-muted` for labels and percent.
- Type: `--t-xs` (11px) label and percent with tabular numerals, `--t-body` for spinner text.
- Space: bar height 8px, label gap 6px, spinner gap `--sp-2`.
- Radius: `--r-pill`. Motion: width transition `--dur-dropdown` with `--ease-out`; spinner 1s linear, off under reduced motion.
