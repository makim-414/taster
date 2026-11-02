---
id: state-change-motion
name: Motion for changes of state
category: motion-particle
uses: [notify-the-user, confirm-an-action]
surfaces: [landing, dashboard, app, commerce, editorial, auth-onboarding, ai-chat]
replaces: [MOT-02, MOT-03, MOT-04, MOT-05, MOT-06, MOT-07, MOT-08]
components: []
inspiration: []
status: stable
---

## When to use

Every transition and animation in an interface: a press, a hover, a menu opening, a toast arriving, a panel sliding in. Interface motion exists to show that something changed and where it went. Generated code tends to put `transition-all` on everything, grow popovers out of `scale(0)`, reach for a slow `ease-in`, stretch hovers to half a second and forget the reduced motion setting. This pattern is the small contract that keeps motion quick, physical and optional.

## Anatomy

- What moves: `transform` and `opacity`, named explicitly. Color and background color for hovers. Never `all`, never width, height, top or margin.
- How it enters: from about 0.95 scale, opacity 0 and an 8px offset toward where it came from, never from `scale(0)`.
- Curves: ease-out (`--ease-out`) for anything that enters or leaves, ease-in-out (`--ease-in-out`) for something moving from A to B on screen, a drawer curve (`--ease-drawer`) for sheets. No ease-in for interface motion.
- Durations by frequency: press about 160ms, tooltip about 125ms, dropdown about 200ms, modal and drawer up to 400ms. Nothing a person triggers often lasts longer than 300ms.
- A `prefers-reduced-motion: reduce` block that turns position and scale changes off and keeps opacity and color fades, so state changes are still visible.

## Do

- Put durations, curves and the entrance offsets in tokens and reference them; a hand-written cubic-bezier per component drifts.
- Animate an accordion with `grid-template-rows: 0fr` to `1fr`, or open it without motion.
- Shorten motion the more often it is used: the button pressed a hundred times a day gets the shortest one.
- Check the page with reduced motion turned on in the system settings; every state change should still be visible.

## Don't

- Don't move an element on :hover outside `@media (hover: hover) and (pointer: fine)` (MOT-08). On touch the hover sticks after a tap; on a desktop the card slides away from the pointer about to click it.
- Don't write `transition: all` (MOT-02). It animates layout and theme changes you did not mean to animate.
- Don't start an entrance from `scale(0)` (MOT-03).
- Don't use ease-in on interface motion (MOT-04): the first frame, the one people watch, is the slowest.
- Don't transition width, height, top, left, margin or padding (MOT-05).
- Don't let a control's transition run past 300ms (MOT-06).
- Don't ship motion without a reduced motion version (MOT-07).

## Swap recipe

Slop: a popover that grows from nothing with `transition-all`, a slow ease-in and no reduced motion version. Fixes MOT-02, MOT-03, MOT-04, MOT-06 and MOT-07.

```css
/* before */
.popover { transition: all 600ms ease-in; }
@keyframes pop { from { transform: scale(0); } to { transform: scale(1); } }
.popover[data-open] { animation: pop 500ms ease-in; }

/* after */
.popover {
  transition-property: opacity, transform;
  transition-duration: var(--dur-dropdown);
  transition-timing-function: var(--ease-out);
  opacity: 0;
  transform: translateY(var(--enter-offset)) scale(var(--enter-scale));
}
.popover[data-open] { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) {
  .popover { transform: none; }
}
```

## Tokens

- `--ease-out`, `--ease-in-out`, `--ease-drawer`: the three curves.
- `--dur-press`, `--dur-tooltip`, `--dur-dropdown`, `--dur-modal`: durations by how often the motion is seen.
- `--enter-scale`, `--enter-offset`, `--press-scale`: entrance and press physics. tokens.css sets all of them to rest values under `prefers-reduced-motion`.
