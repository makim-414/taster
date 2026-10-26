---
id: flat-solid-button
name: Flat solid button
category: button
uses: [start-an-action]
surfaces: [landing, app, dashboard]
replaces: [AC-16, COL-01, COL-07]
components: [blocks/button]
inspiration: [https://ui.shadcn.com/docs/components/button]
status: stable
---

## When to use

Every place a person starts something: sign up, save, run, request a quote. Use it as the default button for a whole product. One screen gets one primary action, a few secondary ones, and the rest are plain text. If you are about to add a fourth visual style, the page has too many actions, not too few styles.

## Anatomy

- Primary: solid fill in `--accent`, label in `--accent-fg`, no border color of its own, no shadow.
- Secondary: `--bg-elev` surface with a 1px `--border`. Hover moves the border to `--text-subtle`.
- Outline and ghost: transparent, for tertiary and toolbar actions. Never for the main action.
- Destructive: outline with `--danger` text. Fill it red only inside the confirm step.
- Sizes `sm` 32px, `md` 36px, `lg` 44px high. Touch targets on phones use `lg`.
- Grouped actions (save and cancel) sit 8px apart, primary last on the right in LTR forms.
- Press feedback is `scale(var(--press-scale))` over `--dur-press`. That is the only motion.

## Do

- Fill exactly one button per view with the accent. If two compete, demote one to secondary.
- Keep the label to one to three words and start with a verb.
- Show focus with a 2px `--ring` on keyboard focus only (`focus-visible`).
- Disable with opacity 0.5 and `pointer-events: none`, and say why in nearby text when the reason is not obvious.
- Put an icon before the label only when it is the same icon the user already saw for this action.

## Don't

- Don't make the main call to action a transparent button with a border. It reads as disabled and loses to every filled element near it.
- Don't add a colored glow, a conic border or a gradient sweep. A glow is decoration; the fill already says "press me".
- Don't mix three radii on one row. All buttons share `--r-md`; pills are for tags and nothing else.
- Don't animate the fill on idle. Hover and press are enough.
- Don't use the accent for both a button and unrelated decoration on the same screen.

## Swap recipe

Slop: ghost primary, purple gradient fill, big colored shadow. Fixes AC-16 (ghost primary), COL-01 (gradient), COL-07 (colored glow).

```css
/* before */
.cta {
  background: transparent;
  border: 1px solid #8b5cf6;
  color: #c4b5fd;
  box-shadow: 0 0 32px rgba(139, 92, 246, 0.55);
}
.cta--hero { background: linear-gradient(135deg, #6366f1, #a855f7); }
```

```tsx
// after
import { Button } from './blocks/button'

<div className="flex items-center gap-2">
  <Button variant="solid" size="lg">Request a quote</Button>
  <Button variant="secondary" size="lg">See pricing</Button>
</div>
// solid  -> bg-accent text-accent-fg, no shadow, no gradient
// the secondary action never gets a fill
```

If the brand needs color, set `--brand` once in your stylesheet. The button, the checkbox and the progress bar follow it, so nothing else changes.

## Tokens

- `--accent`, `--accent-fg`: the filled button and its label.
- `--bg-elev`, `--border`, `--text-subtle`: secondary surface, border and hover border.
- `--danger`: destructive text.
- `--ring`: keyboard focus.
- `--r-md`: corner radius for all sizes.
- `--dur-press`, `--press-scale`, `--ease-out`: press feedback.
- `--t-body`, `--w-med`: label size and weight.
