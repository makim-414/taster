---
id: tooltip-and-popover
name: Tooltip and popover
category: modal-drawer
uses: [explain-on-demand, show-details-on-demand]
surfaces: [app, dashboard]
replaces: []
components: [blocks/tooltip, blocks/popover]
inspiration: [https://www.radix-ui.com/primitives/docs/components/tooltip, https://www.radix-ui.com/primitives/docs/components/popover]
status: stable
---

## When to use

Tooltip: a short label for a control that has no visible text (an icon button) or an abbreviation. Popover: a bit of free content anchored to a trigger, such as a metric definition, a color picker or a small form. Use the info-icon pattern beside a metric whose definition is not obvious: the icon opens a popover with one paragraph and a link.

Do not hide required information in a tooltip. Anything people need to complete a task goes on the page.

## Anatomy

- Tooltip: inverted chip (`--text` fill, `--bg` text), 11px medium text, 6px by 10px padding, `--r-md`, 6px offset from the trigger, max width 320px. Opens after about 300ms hover or on keyboard focus, closes on blur and Escape.
- Popover: `--popover` panel, 1px `--border`, `--r-card`, `--sh-pop`, 16px padding, 288px wide by default. Opens on click or Enter, closes on outside click and Escape, returns focus to the trigger.
- Info trigger: a 16px outline icon in subtle ink with a 32px hit area, `aria-label="What is net revenue?"`.
- Registry: `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent` and `Popover`, `PopoverTrigger`, `PopoverContent` (`align`, `sideOffset`), `PopoverClose`, `PopoverAnchor`. Both sit on Radix, so collision handling, portals and ARIA come with them.

## Do

- Wrap the app or the section once in `TooltipProvider` so delay groups work.
- Keep tooltip text under 8 words and never put a link or a button in one. Interactive content goes in a popover.
- Give every icon-only button a tooltip and an `aria-label` with the same words.
- Make the popover content answer one question: what is this number, how is it computed, when was it updated.
- Respect touch: tooltips do not open on tap, so any information that matters needs a popover or visible text.

## Don't

- Don't make the tooltip a frosted glass bubble with an arrow, gradient and 24px shadow.
- Don't open tooltips on page load or on a timer.
- Don't use a popover as a mini page with tabs.
- Don't nest a tooltip inside a popover inside a dialog on the same icon.
- Don't animate from scale 0. Start from 0.95 and fade.

## Swap recipe

Slop version (no rule ids in replaces; related to CMP-05 and MOT-01):

```css
.tip {
  background: rgba(30, 30, 60, 0.6); backdrop-filter: blur(16px);
  border-radius: 16px; padding: 12px 16px;
  box-shadow: 0 20px 60px rgba(99, 102, 241, 0.4);
  animation: pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

Fixed version:

```tsx
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from './blocks/tooltip'
import { Popover, PopoverTrigger, PopoverContent } from './blocks/popover'

<TooltipProvider delayDuration={300}>
  <Tooltip>
    <TooltipTrigger asChild>
      <button aria-label="Duplicate" className="rounded-md p-2 text-text-muted hover:text-text"><CopyIcon /></button>
    </TooltipTrigger>
    <TooltipContent>Duplicate</TooltipContent>
  </Tooltip>
</TooltipProvider>

<Popover>
  <PopoverTrigger aria-label="What is net revenue?" className="rounded-md p-1.5 text-text-subtle hover:text-text">
    <InfoIcon width={16} height={16} />
  </PopoverTrigger>
  <PopoverContent align="start">
    <p className="text-sm text-text">Net revenue is paid orders minus refunds, before tax.</p>
    <a href="/docs/metrics" className="mt-2 inline-block text-xs text-text-muted underline">Read the definition</a>
  </PopoverContent>
</Popover>
```

## Tokens

- Tooltip: `--text` fill, `--bg` text, `--r-md`, no border.
- Popover: `--popover` fill, `--border`, `--r-card`, `--sh-pop`.
- Ink in popovers: `--text` for the answer, `--text-muted` for links and meta, `--text-subtle` for the trigger icon.
- Type: `--t-xs` (11px) medium in tooltips, `--t-body` in popovers.
- Space: `--sp-4` popover padding, 6px offset (`sideOffset`).
- Motion: `--dur-tooltip` (125ms) with `--ease-out` for tooltips, `--dur-dropdown` for popovers, `--enter-scale` start.
